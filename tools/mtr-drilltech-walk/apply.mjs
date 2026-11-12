/**
 * Add walk mode to a built copy of the MTR DRILLTECH explorer.
 *
 * Called by tools/build-mtr-drilltech.mjs after it has produced ./mtr-drilltech/,
 * and runnable on its own against an already-built folder:
 *
 *   node tools/mtr-drilltech-walk/apply.mjs            (defaults to ./mtr-drilltech)
 *
 * It copies walk.js, appends walk.css to style.css, and patches scene.js so the
 * scene publishes the objects walk.js needs (`walkKit`) and yields the camera
 * while a walk session is running.
 *
 * The upstream app ships a basic walk mode of its own (fixed deck height, no
 * collision). The published explorer uses this one instead: upstream's Walk
 * toolbar button and its `walk` scene action are re-pointed here, and its
 * banner and toasts are silenced. Upstream's code is left in place but is never
 * started. Every patch is an exact-match replacement that throws if the
 * upstream code has changed shape.
 */
import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function replaceOnce(source, find, replace, label) {
  if (!source.includes(find)) throw new Error(`Expected pattern missing (walk: ${label}): ${find.slice(0, 80)}`);
  return source.replace(find, () => replace);
}

export async function applyWalkMode(target) {
  const file = (name) => path.join(target, name);

  let scene = await readFile(file('scene.js'), 'utf8');
  if (scene.includes('api.walkKit=')) throw new Error('Walk mode is already applied to ' + target);

  for (const [from, to, label] of [
    ['let disposed=false,animationHandle;', 'let disposed=false,animationHandle,frameHook=null;', 'frame hook slot'],
    ['if(targetCamera){camera.position.lerp', 'if(targetCamera&&!frameHook){camera.position.lerp', 'camera glide'],
    ['if(walk)updateWalk(t);else{', 'if(frameHook)frameHook(t);else if(walk)updateWalk(t);else{', 'frame hook call'],
    // Walking at the upstream 35 fps cap feels sluggish; orbiting keeps the cap.
    ['time-lastRender<1000/35', 'time-lastRender<(frameHook?1000/62:1000/35)', 'frame rate'],
    ['if(pointerDown&&Math.hypot(', 'if(!frameHook&&pointerDown&&Math.hypot(', 'click select'],
    ['pointerLatest=e;if(pointerDown){', 'pointerLatest=e;if(frameHook||pointerDown){', 'hover'],
    ["addEventListener('dblclick',e=>{if(walk)return;", "addEventListener('dblclick',e=>{if(walk||frameHook)return;", 'double click'],
    // The toolbar button, the structured `walk` action and scene.state.walk all
    // mean this walk mode.
    [
      "if(action==='walk'){if(walk)stopWalk();else startWalk();apply();return{selected,walk:!!walk};}",
      "if(action==='walk'){window.mtrWalk?.toggle();return{selected,walk:!!frameHook};}",
      'walk action',
    ],
    ['construction:!!construction,walk:!!walk,hiddenSystems', 'construction:!!construction,walk:!!frameHook,hiddenSystems', 'walk state'],
    ['function dispose(){disposed=true;', "function dispose(){dispatchEvent(new CustomEvent('mtr-scene-dispose'));if(window.__mtrScene===api)window.__mtrScene=null;disposed=true;", 'dispose event'],
    ['return{select,action,focus,setView,', 'const api={select,action,focus,setView,', 'api object'],
    [
      'fps,internals:interiors.length};}};',
      "fps,internals:interiors.length};}};api.walkKit={THREE,scene,camera,controls,renderer,container,renderables,parts,components,mode,onSelect,setFrameHook(fn){frameHook=fn;}};window.__mtrScene=api;dispatchEvent(new CustomEvent('mtr-scene',{detail:api}));return api;",
      'walk kit',
    ],
  ]) {
    scene = replaceOnce(scene, from, to, label);
  }
  await writeFile(file('scene.js'), scene);

  let html = await readFile(file('index.html'), 'utf8');
  html = replaceOnce(
    html,
    '<script type="module" src="webmcp.js"></script>',
    '<script type="module" src="webmcp.js"></script>\r\n  <script type="module" src="walk.js"></script>',
    'script tag',
  );
  html = replaceOnce(html, 'title="Walk the active rig (WASD)"', 'title="Walk the rig as a crew member (P)"', 'toolbar title');
  html = replaceOnce(html, '<span>Walk</span><kbd>WASD</kbd>', '<span>Walk</span><kbd>P</kbd>', 'toolbar key');
  html = replaceOnce(html, 'Drag to orbit <span>·</span>', 'Press P to walk the rig <span>·</span> Drag to orbit <span>·</span>', 'hint');
  await writeFile(file('index.html'), html);

  let app = await readFile(file('app.js'), 'utf8');
  app = replaceOnce(
    app,
    "['Walk mode','WASD + mouse · Shift to run · E to inspect']",
    "['Walk mode','P · W A S D + mouse'],['Run / jump / inspect','Shift / Space / E'],['Chase or first-person view','V']",
    'help rows',
  );
  // Walk mode announces itself; upstream's banner and toasts would double up.
  app = replaceOnce(app, "if(action==='walk'||(action==='escape'&&result.walk===false)){", 'if(false){', 'upstream toast');
  await writeFile(file('app.js'), app);

  const css = (await readFile(file('style.css'), 'utf8')) + '\n' + (await readFile(path.join(HERE, 'walk.css'), 'utf8'));
  await writeFile(file('style.css'), css);

  await cp(path.join(HERE, 'walk.js'), file('walk.js'));
  // Realistic crew member (CC0, Quaternius), packed by convert-worker.mjs.
  await cp(path.join(HERE, 'assets'), file('assets/worker'), { recursive: true });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const target = path.resolve(process.argv[2] ?? path.join(HERE, '..', '..', 'mtr-drilltech'));
  await applyWalkMode(target);
  console.log('Walk mode applied to ' + target);
}

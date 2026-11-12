/**
 * Walk mode for the MTR DRILLTECH explorer.
 *
 * Puts a crew member on the rig: chase camera or first person, collision
 * against the authored rig geometry, a minimap, an "inspect" prompt for the
 * nearest assembly, and level / go-to travel for places the stairs do not reach.
 *
 * Source lives in tools/mtr-drilltech-walk/ and is copied into mtr-drilltech/ by
 * tools/build-mtr-drilltech.mjs, which also patches scene.js to publish the
 * `walkKit` this file consumes. The upstream app is not modified.
 */

const STEP = 0.7;      // tallest ledge walked up without jumping (m)
const RADIUS = 0.35;   // body radius for wall checks (m)
const EYE = 1.66;      // first-person eye height (m)
const GRAVITY = 22;
const JUMP = 6.2;
const WALK = 1.6;   // brisk walk (m/s)
const RUN = 4.2;    // jog
const FOV = 58;

const $ = (s) => document.querySelector(s);
const stage = $('.stage');

/* ------------------------------------------------------------------ */
/* Interface                                                           */
/* ------------------------------------------------------------------ */

const hud = document.createElement('div');
hud.className = 'crew-hud';
hud.hidden = true;
hud.innerHTML = `
  <div class="walk-status"><span class="walk-badge">WALK MODE</span><span id="walk-where">—</span></div>
  <div class="walk-map-wrap"><canvas id="walk-map" width="360" height="360" aria-hidden="true"></canvas><span class="walk-map-n">N</span></div>
  <div class="walk-cross" aria-hidden="true"></div>
  <div class="walk-prompt" id="walk-prompt" hidden></div>
  <div class="walk-msg" id="walk-msg" role="status" aria-live="polite" hidden></div>
  <div class="walk-stick" id="walk-stick" aria-hidden="true"><i></i></div>
  <div class="walk-pad">
    <button type="button" data-walk="jump" class="walk-touch">Jump</button>
    <button type="button" data-walk="run" class="walk-touch">Run</button>
  </div>
  <div class="walk-bar">
    <div class="walk-keys">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>
      <span><kbd>Shift</kbd> run</span>
      <span><kbd>Space</kbd> jump</span>
      <span>Click + mouse look</span>
    </div>
    <div class="walk-btns">
      <button type="button" data-walk="inspect" title="Inspect the nearest assembly (E)">Inspect<kbd>E</kbd></button>
      <button type="button" data-walk="view" title="Switch chase / first-person camera (V)">View<kbd>V</kbd></button>
      <button type="button" data-walk="up" title="Move to the level above (Page Up)">Level &#9650;</button>
      <button type="button" data-walk="down" title="Move to the level below (Page Down)">Level &#9660;</button>
      <button type="button" data-walk="goto" title="Go to the selected assembly (T)">Go to<kbd>T</kbd></button>
      <button type="button" data-walk="exit" class="walk-exit" title="Leave walk mode (Esc)">Exit<kbd>Esc</kbd></button>
    </div>
  </div>`;
stage.appendChild(hud);

// The stage is squeezed by the side panels, so lay out by its own width.
new ResizeObserver(() => hud.classList.toggle('narrow', stage.clientWidth < 640)).observe(stage);

const mapCanvas = hud.querySelector('#walk-map');
const mapCtx = mapCanvas.getContext('2d');
const whereEl = hud.querySelector('#walk-where');
const promptEl = hud.querySelector('#walk-prompt');
const msgEl = hud.querySelector('#walk-msg');
const stickEl = hud.querySelector('#walk-stick');
const toggleBtn = $('.toolbar [data-action="walk"]'); // upstream's button; scene.action('walk') lands in toggle()

let msgTimer = 0;
function say(text, ms = 2600) {
  msgEl.textContent = text;
  msgEl.hidden = false;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { msgEl.hidden = true; }, ms);
}

/* ------------------------------------------------------------------ */
/* Scene binding                                                       */
/* ------------------------------------------------------------------ */

let api = null;   // scene API returned by createScene
let kit = null;   // { THREE, scene, camera, controls, renderer, renderables, parts, components, mode, onSelect, setFrameHook }
let W = null;     // live walk session, null when not walking

function bind(sceneApi) {
  api = sceneApi;
  kit = sceneApi.walkKit;
}
addEventListener('mtr-scene', (e) => { stop(); bind(e.detail); });
addEventListener('mtr-scene-dispose', () => { stop(); api = kit = null; });
if (window.__mtrScene) bind(window.__mtrScene);

/* ------------------------------------------------------------------ */
/* Crew member                                                         */
/* ------------------------------------------------------------------ */

/** Simple box figure: shown while the realistic model loads, or if it cannot. */
function buildWorker(THREE) {
  const mat = (color, roughness = 0.75, metalness = 0.05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const M = {
    coverall: mat('#1f3a5c'), vest: mat('#d6e21f', 0.6), tape: mat('#e9eef0', 0.3, 0.5),
    skin: mat('#c98f6b', 0.8), hat: mat('#f4f4ee', 0.4), boot: mat('#23201d', 0.85), glove: mat('#e0a32a', 0.8),
  };
  const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); mesh.castShadow = true; return mesh;
  };
  const root = new THREE.Group(); root.name = 'Walk mode crew member';
  const body = new THREE.Group(); root.add(body);

  // Torso, hi-vis vest with reflective tape, collar.
  body.add(box(0.40, 0.58, 0.22, M.coverall, 0, 1.19, 0));
  body.add(box(0.43, 0.44, 0.25, M.vest, 0, 1.22, 0));
  body.add(box(0.435, 0.045, 0.255, M.tape, 0, 1.10, 0));
  body.add(box(0.435, 0.045, 0.255, M.tape, 0, 1.25, 0));
  body.add(box(0.06, 0.40, 0.258, M.tape, -0.12, 1.24, 0));
  body.add(box(0.06, 0.40, 0.258, M.tape, 0.12, 1.24, 0));
  body.add(box(0.36, 0.12, 0.21, M.coverall, 0, 0.87, 0));

  // Head, hard hat with brim and peak.
  const head = new THREE.Group(); head.position.y = 1.60; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), M.skin); skull.castShadow = true; head.add(skull);
  head.add(box(0.10, 0.08, 0.10, M.skin, 0, -0.13, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.hat);
  dome.position.y = 0.035; dome.castShadow = true; head.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.018, 18), M.hat); brim.position.y = 0.04; head.add(brim);
  head.add(box(0.16, 0.018, 0.10, M.hat, 0, 0.04, 0.15));
  head.add(box(0.03, 0.05, 0.27, M.hat, 0, 0.15, 0));

  // Limbs pivot at shoulder / hip so they can swing.
  const limb = (x, y, len, w, m, endMat, endH) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    pivot.add(box(w, len, w, m, 0, -len / 2, 0));
    pivot.add(box(w + 0.02, endH, w + (endMat === M.boot ? 0.09 : 0.02), endMat, 0, -len - endH / 2 + 0.01, endMat === M.boot ? 0.035 : 0));
    body.add(pivot); return pivot;
  };
  const armL = limb(-0.27, 1.45, 0.56, 0.11, M.coverall, M.glove, 0.10);
  const armR = limb(0.27, 1.45, 0.56, 0.11, M.coverall, M.glove, 0.10);
  const legL = limb(-0.105, 0.84, 0.72, 0.15, M.coverall, M.boot, 0.13);
  const legR = limb(0.105, 0.84, 0.72, 0.15, M.coverall, M.boot, 0.13);
  let phase = 0;
  return {
    root,
    update(dt, s) {
      phase += dt * (s.running ? 11.5 : 7.5) * (0.25 + s.moveAmt);
      const sw = Math.sin(phase) * (s.running ? 0.95 : 0.6) * s.moveAmt;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.85; armR.rotation.x = sw * 0.85;
      body.position.y = Math.abs(Math.cos(phase)) * 0.035 * s.moveAmt;
      body.rotation.x = s.running ? 0.1 * s.moveAmt : 0;
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); },
  };
}


/* ------------------------------------------------------------------ */
/* Realistic crew member (skinned, animated)                           */
/* ------------------------------------------------------------------ */

// Body and skeleton: Quaternius "Universal Base Characters"; clips: Quaternius
// "Universal Animation Library". Both CC0. tools/mtr-drilltech-walk/convert-worker.mjs
// packs them into assets/worker/. The base body is unclothed, so the shader
// below dresses it: coverall, hi-vis vest with reflective tape, boots, gloves.
const ASSET_BASE = new URL('./assets/worker/', import.meta.url);
let assetPromise = null;
function loadWorkerAsset() {
  if (!assetPromise) {
    const get = (file, kind) => fetch(new URL(file, ASSET_BASE)).then((r) => {
      if (!r.ok) throw new Error(file + ' ' + r.status);
      return r[kind]();
    });
    assetPromise = Promise.all([get('worker.json', 'json'), get('worker.bin', 'arrayBuffer')]).then(([meta, bin]) => ({ meta, bin }));
    assetPromise.catch(() => { assetPromise = null; });
  }
  return assetPromise;
}

/**
 * The site's MTR logo is white for dark backgrounds. On a hi-vis vest and a
 * white hard hat it is printed dark instead: white becomes navy, the green
 * stays green.
 */
function logoTexture(THREE) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 170;
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const img = new Image();
  img.onload = () => {
    const c = canvas.getContext('2d');
    c.drawImage(img, 12, 6, canvas.width - 24, canvas.height - 12);
    const px = c.getImageData(0, 0, canvas.width, canvas.height), d = px.data;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.min(d[i], d[i + 1], d[i + 2]) > 150) { d[i] = 13; d[i + 1] = 38; d[i + 2] = 64; }
    }
    c.putImageData(px, 0, 0);
    texture.needsUpdate = true;
  };
  img.src = new URL('./assets/mtr-logo-white.png', import.meta.url).href;
  return texture;
}

const DRESS_VERTEX = `
attribute vec4 zone;
varying vec4 vZone;
varying vec3 vRest;
varying float vFacing;
void main() {
  vZone = zone; vRest = position; vFacing = normal.z;`;
const DRESS_FRAGMENT = `
#include <map_fragment>
{
  float y = vRest.y, ax = abs(vRest.x);
  float torso = smoothstep(0.45, 0.6, vZone.z);
  vec3 c = vec3(0.03, 0.065, 0.15);                                      // navy coverall
  c = mix(c, vec3(0.62), step(0.40, y) * step(y, 0.45) * (1.0 - torso)); // tape at the shins
  float vest = torso * step(1.04, y) * step(y, 1.50) * step(ax, 0.26);
  float tape = step(1.10, y) * step(y, 1.145) + step(1.25, y) * step(y, 1.295)
    + step(1.295, y) * step(0.085, ax) * step(ax, 0.13);
  c = mix(c, vec3(0.72, 0.84, 0.02), vest);                              // hi-vis vest
  c = mix(c, vec3(0.78), vest * clamp(tape, 0.0, 1.0));                  // reflective tape
  // Company logo: across the back between the tapes, and on the chest between the braces.
  vec2 luv = vec2(-1.0);
  if (vFacing < -0.25) luv = vec2((0.12 - vRest.x) / 0.24, (1.238 - y) / 0.08);
  else if (vFacing > 0.25) luv = vec2((vRest.x + 0.075) / 0.15, (1.41 - y) / 0.05);
  if (luv.x >= 0.0 && luv.x <= 1.0 && luv.y >= 0.0 && luv.y <= 1.0) {
    vec4 logo = texture2D(uLogo, luv);
    c = mix(c, logo.rgb, logo.a * vest);
  }
  c = mix(c, vec3(0.025, 0.022, 0.02), step(y, 0.27));                   // boots
  c = mix(c, vec3(0.66, 0.36, 0.05), step(0.5, vZone.y));                // gloves
  float skin = step(0.5, vZone.x) * step(1.55, y);
  diffuseColor.rgb = mix(c, diffuseColor.rgb, skin);
}`;

function buildRealWorker(THREE, { meta, bin }) {
  const TYPES = { Float32Array, Uint16Array, Uint8Array };
  const arr = (name) => { const l = meta.layout[name]; return new TYPES[l.type](bin, l.offset, l.count); };
  const root = new THREE.Group(); root.name = 'Walk mode crew member';
  const textures = [];
  const tex = (file) => {
    const t = new THREE.TextureLoader().load(new URL(file, ASSET_BASE).href);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; textures.push(t); return t;
  };

  const bones = meta.bones.map((b) => {
    const bone = new THREE.Bone(); bone.name = b.name;
    bone.position.fromArray(b.t); bone.quaternion.fromArray(b.r); bone.scale.fromArray(b.s);
    return bone;
  });
  meta.bones.forEach((b, i) => (b.parent < 0 ? root : bones[b.parent]).add(bones[i]));
  const ib = arr('inverseBind');
  const skeleton = new THREE.Skeleton(bones, bones.map((_, i) => new THREE.Matrix4().fromArray(ib, i * 16)));
  const boneNamed = (name) => bones[meta.bones.findIndex((b) => b.name === name)];

  const materials = {
    body: new THREE.MeshStandardMaterial({ map: tex('skin.jpg'), roughness: 0.82, metalness: 0 }),
    eyes: new THREE.MeshStandardMaterial({ map: tex('eye.png'), roughness: 0.35 }),
    brows: new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.9 }),
  };
  const logo = logoTexture(THREE); textures.push(logo);
  materials.body.onBeforeCompile = (shader) => {
    shader.uniforms.uLogo = { value: logo };
    // Clothing sits a little off the body, the vest a little more.
    shader.vertexShader = shader.vertexShader.replace('void main() {', DRESS_VERTEX).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float bare = step(0.5, zone.x) * step(1.55, position.y);
      float vestV = smoothstep(0.45, 0.6, zone.z) * step(1.04, position.y) * step(position.y, 1.50) * step(abs(position.x), 0.26);
      transformed += objectNormal * (1.0 - bare) * (0.012 + 0.014 * vestV);`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform sampler2D uLogo;\nvarying vec4 vZone;\nvarying vec3 vRest;\nvarying float vFacing;\nvoid main() {')
      .replace('#include <map_fragment>', DRESS_FRAGMENT);
  };
  for (const key of ['body', 'eyes', 'brows']) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr(key + '.position'), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(arr(key + '.normal'), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(arr(key + '.uv'), 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(arr(key + '.skinIndex'), 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(arr(key + '.skinWeight'), 4));
    geo.setAttribute('zone', new THREE.BufferAttribute(arr(key + '.zone'), 4, true));
    geo.setIndex(new THREE.BufferAttribute(arr(key + '.index'), 1));
    const mesh = new THREE.SkinnedMesh(geo, materials[key]);
    mesh.castShadow = key === 'body'; mesh.frustumCulled = false;
    root.add(mesh); mesh.bind(skeleton, new THREE.Matrix4());
  }

  // Hard hat, built in rest-pose space then handed to the head bone.
  root.updateMatrixWorld(true);
  const hatMat = new THREE.MeshStandardMaterial({ color: '#f3f2ea', roughness: 0.38, metalness: 0.05 });
  const hat = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.118, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hatMat);
  dome.scale.set(1, 0.92, 1.14);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.132, 0.014, 24), hatMat); brim.scale.z = 1.14;
  const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 20, 1, false, -0.75, 1.5), hatMat);
  peak.position.set(0, -0.004, 0.07); peak.rotation.x = 0.12;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.2), hatMat); ridge.position.y = 0.098;
  hat.add(dome, brim, peak, ridge);
  hat.traverse((o) => { o.castShadow = true; });
  // Logo on the front of the shell: a strip that follows the dome's curve.
  const strip = new THREE.CylinderGeometry(0.1015, 0.1155, 0.028, 16, 1, true, -0.36, 0.72);
  const suv = strip.attributes.uv; for (let i = 0; i < suv.count; i++) suv.setY(i, 1 - suv.getY(i));
  const decal = new THREE.Mesh(strip, new THREE.MeshStandardMaterial({
    map: logo, transparent: true, depthWrite: false, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  decal.position.y = 0.045; decal.scale.z = 1.14;
  hat.add(decal);
  hat.position.set(0, 1.735, 0.012); hat.rotation.x = -0.06;
  root.add(hat); root.updateMatrixWorld(true);
  boneNamed('Head').attach(hat);

  // Clips.
  const mixer = new THREE.AnimationMixer(root), actions = {}, weight = { idle: 1, walk: 0, run: 0, air: 0 };
  for (const [key, clip] of Object.entries(meta.clips)) {
    const tracks = clip.tracks.map((t) => {
      const name = meta.bones[t.bone].name + '.' + t.path;
      return t.path === 'quaternion'
        ? new THREE.QuaternionKeyframeTrack(name, arr(t.id + '.t'), arr(t.id + '.v'))
        : new THREE.VectorKeyframeTrack(name, arr(t.id + '.t'), arr(t.id + '.v'));
    });
    const action = mixer.clipAction(new THREE.AnimationClip(key, clip.duration, tracks));
    action.play(); action.setEffectiveWeight(weight[key]); actions[key] = action;
  }

  // Ground speed each clip covers at normal playback, measured from the sweep
  // of the left foot, so the legs can be paced to the actual walking speed.
  const natural = {}, foot = boneNamed('foot_l'), v = new THREE.Vector3();
  for (const key of ['walk', 'run']) {
    for (const k in actions) actions[k].setEffectiveWeight(k === key ? 1 : 0);
    let lo = Infinity, hi = -Infinity; const d = meta.clips[key].duration;
    for (let i = 0; i < 24; i++) {
      mixer.setTime(d * i / 24); root.updateMatrixWorld(true);
      const z = foot.getWorldPosition(v).z; lo = Math.min(lo, z); hi = Math.max(hi, z);
    }
    natural[key] = Math.max(0.5, 2 * (hi - lo) / d);
  }
  for (const k in actions) actions[k].setEffectiveWeight(weight[k]);
  mixer.setTime(0);

  return {
    root, natural,
    update(dt, s) {
      const moving = s.grounded ? s.moveAmt : 0;
      const target = { idle: 0, walk: 0, run: 0, air: s.grounded ? 0 : 1 };
      if (s.grounded) { target[s.running ? 'run' : 'walk'] = moving; target.idle = 1 - moving; }
      const k = Math.min(1, dt * 9);
      for (const key in actions) {
        weight[key] += (target[key] - weight[key]) * k;
        actions[key].setEffectiveWeight(weight[key]);
      }
      actions.walk.timeScale = Math.min(1.8, Math.max(0.6, s.speed / natural.walk));
      actions.run.timeScale = Math.min(1.6, Math.max(0.6, s.speed / natural.run));
      mixer.update(dt);
    },
    dispose() {
      mixer.stopAllAction();
      root.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      textures.forEach((t) => t.dispose()); skeleton.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Ray helpers against the rig geometry                                */
/* ------------------------------------------------------------------ */

function shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

const CELL = 4; // collision grid cell (m)
const cellKey = (ix, iz) => (ix + 2048) * 4096 + (iz + 2048);

/**
 * The rig is a few hundred instanced meshes holding thousands of members, and
 * three.js tests every instance for every ray. Walking needs a dozen rays a
 * frame, so index each instance once into an XZ grid and only test the members
 * a ray can actually reach.
 */
function buildCollider() {
  const THREE = kit.THREE, grid = new Map(), usable = new Map();
  const ok = (g) => {
    if (!usable.has(g)) {
      const a = g.attributes.position?.array;
      let good = !!a;
      if (a) for (let i = 0; i < a.length; i++) if (a[i] !== a[i]) { good = false; break; }
      if (good && !g.boundingSphere) g.computeBoundingSphere();
      usable.set(g, good);
    }
    return usable.get(g);
  };
  let count = 0;
  const add = (obj, matrix) => {
    const bs = obj.geometry.boundingSphere;
    const c = bs.center.clone().applyMatrix4(matrix), r = bs.radius * matrix.getMaxScaleOnAxis();
    if (!(r > 0) || !Number.isFinite(c.x + c.y + c.z)) return;
    const e = { obj, matrix, c, r, stamp: 0 }, pad = r + CELL * 0.5;
    for (let ix = Math.floor((c.x - pad) / CELL); ix <= Math.floor((c.x + pad) / CELL); ix++) {
      for (let iz = Math.floor((c.z - pad) / CELL); iz <= Math.floor((c.z + pad) / CELL); iz++) {
        const k = cellKey(ix, iz); let cell = grid.get(k); if (!cell) grid.set(k, cell = []); cell.push(e);
      }
    }
    count++;
  };
  for (const o of kit.renderables) {
    if (!ok(o.geometry)) continue;
    o.updateWorldMatrix(true, false);
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) { const m = new THREE.Matrix4(); o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); add(o, m); }
    } else add(o, o.matrixWorld.clone());
  }
  return { grid, count, stamp: 0, proxy: new THREE.Mesh(), twoSided: new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }) };
}

/** `both` also reports faces seen from behind, flagged `back`, so a caller can tell it is inside a solid. */
function castAll(origin, dir, far, both = false) {
  const rc = W.raycaster, col = W.collider, hits = [], stamp = ++col.stamp;
  rc.set(origin, dir); rc.near = 0; rc.far = far;
  const flat = Math.hypot(dir.x, dir.z) * far, steps = Math.max(1, Math.ceil(flat / (CELL * 0.5)));
  let lastKey = -1;
  for (let s = 0; s <= steps; s++) {
    const t = far * s / steps;
    const k = cellKey(Math.floor((origin.x + dir.x * t) / CELL), Math.floor((origin.z + dir.z * t) / CELL));
    if (k === lastKey) continue; lastKey = k;
    const cell = col.grid.get(k); if (!cell) continue;
    for (const e of cell) {
      if (e.stamp === stamp) continue; e.stamp = stamp;
      const along = (e.c.x - origin.x) * dir.x + (e.c.y - origin.y) * dir.y + (e.c.z - origin.z) * dir.z;
      if (along < -e.r || along > far + e.r) continue;
      if (rc.ray.distanceSqToPoint(e.c) > e.r * e.r || !shown(e.obj)) continue;
      const p = col.proxy, n = hits.length;
      p.geometry = e.obj.geometry; p.material = both ? col.twoSided : e.obj.material; p.matrixWorld = e.matrix;
      p.raycast(rc, hits);
      for (let i = n; i < hits.length; i++) {
        const h = hits[i]; h.object = e.obj;
        if (both && h.face) h.back = W.tmpN.copy(h.face.normal).transformDirection(e.matrix).dot(dir) > 0;
      }
    }
  }
  return hits.sort((a, b) => a.distance - b.distance);
}
function cast(origin, dir, far) { return castAll(origin, dir, far)[0] || null; }

/** Height of the surface under (x,z), looking down from `fromY`. */
function groundAt(x, z, fromY) {
  const o = W.tmpA, base = W.baseFloor;
  let best = base;
  for (const [dx, dz] of W.footprint) {
    o.set(x + dx, fromY, z + dz);
    const hit = cast(o, W.down, 400);
    if (hit && hit.point.y > best) best = hit.point.y;
  }
  return best;
}

/** Standable heights at (x,z): a surface with head room above it. Highest first. */
function levelsAt(x, z) {
  const o = W.tmpA.set(x, 500, z);
  const ys = [];
  for (const hit of castAll(o, W.down, 900, true)) {
    const y = hit.point.y;
    if (hit.back || y < W.minStandY) continue;
    if (ys.some((v) => Math.abs(v - y) < 0.6)) continue;
    ys.push(y);
  }
  if (W.baseFloor > -1e6 && !ys.some((v) => Math.abs(v - W.baseFloor) < 0.6)) ys.push(W.baseFloor);
  const out = [];
  for (const y of ys) {
    // Needs head room, and must not be a ledge buried inside a solid block
    // (the first thing overhead would then be that block's far side).
    W.tmpB.set(x, y + 0.3, z);
    const over = castAll(W.tmpB, W.up, 80, true)[0];
    if (!over || (over.distance > 1.65 && !over.back)) out.push(y);
  }
  return out.sort((a, b) => b - a);
}

function blocked(x, y, z, dx, dz) {
  const len = Math.hypot(dx, dz);
  if (len < 1e-5) return false;
  const dir = W.tmpB.set(dx / len, 0, dz / len);
  for (const h of [0.85, 1.2, 1.6]) {
    W.tmpA.set(x, y + h, z);
    if (cast(W.tmpA, dir, len + RADIUS)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Finding places to stand                                             */
/* ------------------------------------------------------------------ */

/** Main working level: the most common standable height near the middle of the model. */
function findSpawn() {
  const THREE = kit.THREE;
  const box = new THREE.Box3();
  for (const part of kit.parts.values()) box.expandByObject(part);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  if (kit.mode === 'land') {
    // Open ground beside the rig, looking in.
    const r = Math.min(Math.max(size.x, size.z) * 0.5 + 8, 120);
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.25 + i * Math.PI / 8;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      const lv = levelsAt(x, z);
      if (lv.length && Math.abs(lv[lv.length - 1] - W.baseFloor) < 0.5 && lv.length === 1) return { x, y: W.baseFloor, z, cx: c.x, cz: c.z };
    }
    return { x: c.x + r, y: W.baseFloor, z: c.z + r, cx: c.x, cz: c.z };
  }

  const reach = Math.min(Math.max(size.x, size.z) * 0.5, 45);
  const samples = [];
  for (let r = 3; r <= reach; r += 3) {
    const n = Math.max(6, Math.round(r * 1.2));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + r;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      for (const y of levelsAt(x, z)) samples.push({ x, y, z, r });
    }
  }
  if (!samples.length) return null;
  const tally = new Map();
  for (const s of samples) { const k = Math.round(s.y * 2) / 2; tally.set(k, (tally.get(k) || 0) + 1); }
  const [deckY] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  // Prefer a spot on that deck with clear space around it.
  const onDeck = samples.filter((s) => Math.abs(s.y - deckY) < 0.5);
  let best = null, bestScore = -1;
  for (const s of onDeck) {
    let open = 0;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      if (!blocked(s.x, s.y, s.z, Math.cos(a) * 2.5, Math.sin(a) * 2.5)) open++;
    }
    const score = open - s.r * 0.02;
    if (score > bestScore) { bestScore = score; best = s; }
    if (open === 8 && s.r > 6) break;
  }
  return best && { x: best.x, y: best.y, z: best.z, cx: c.x, cz: c.z };
}

/** A standing spot beside an assembly, at or near its base. */
function standNear(id) {
  const part = kit.parts.get(id);
  if (!part) return null;
  const THREE = kit.THREE;
  const box = new THREE.Box3().setFromObject(part);
  if (box.isEmpty()) return null;
  const c = box.getCenter(new THREE.Vector3());
  let best = null;
  // Walk outwards from the assembly's footprint; take the deck closest to its base.
  for (const gap of [1.4, 3.5, 7, 12]) {
    const hx = (box.max.x - box.min.x) / 2 + gap, hz = (box.max.z - box.min.z) / 2 + gap;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      const k = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const x = c.x + Math.cos(a) * k * hx, z = c.z + Math.sin(a) * k * hz;
      for (const y of levelsAt(x, z)) {
        if (y > box.max.y + 0.5 || y < box.min.y - 6) continue;
        const score = Math.abs(y - box.min.y);
        if (!best || score < best.score) best = { x, y, z, score };
      }
    }
    if (best) break;
  }
  if (!best) return null;
  best.yaw = Math.atan2(c.x - best.x, c.z - best.z);
  return best;
}

function place(spot, lookYaw) {
  W.pos.set(spot.x, spot.y, spot.z);
  W.vy = 0; W.grounded = true;
  if (lookYaw !== undefined) { W.yaw = lookYaw; W.camYaw = lookYaw + Math.PI; W.camPitch = -0.12; }
  W.camDist = 5.2;
}

/* ------------------------------------------------------------------ */
/* Start / stop                                                        */
/* ------------------------------------------------------------------ */

function start() {
  if (W || !kit) return;
  const THREE = kit.THREE, { camera, controls } = kit;
  const offshore = kit.mode !== 'land';
  W = {
    raycaster: new THREE.Raycaster(),
    tmpA: new THREE.Vector3(), tmpB: new THREE.Vector3(), tmpC: new THREE.Vector3(), tmpN: new THREE.Vector3(),
    down: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 1, 0),
    footprint: [[0, 0], [0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]],
    baseFloor: offshore ? -Infinity : 0,   // land rig stands on open ground
    minStandY: offshore ? 1.2 : -0.5,      // never stand on the sea
    offshore,
    pos: new THREE.Vector3(), vy: 0, grounded: true,
    yaw: 0, camYaw: 0, camPitch: -0.12, camDist: 5.2, firstPerson: false,
    phase: 0, moveAmt: 0, tick: 0, last: performance.now(), near: null,
    keys: new Set(), stick: { x: 0, y: 0 }, runLatch: false, jumpQueued: false,
    saved: { position: camera.position.clone(), target: controls.target.clone(), fov: camera.fov, near: camera.near, enabled: controls.enabled },
    worker: buildWorker(THREE), boxes: [],
  };
  W.collider = buildCollider();

  const spawn = findSpawn();
  if (!spawn) { W = null; say('No walkable deck found on this model.'); return; }
  W.spawn = spawn;
  place(spawn, Math.atan2(spawn.cx - spawn.x, spawn.cz - spawn.z));

  for (const [id, part] of kit.parts) {
    const b = new THREE.Box3().setFromObject(part);
    if (b.isEmpty()) continue;
    const s = b.getSize(new THREE.Vector3());
    W.boxes.push({ id, box: b, area: s.x * s.z, diag: s.length(), name: kit.components.find((c) => c.id === id)?.name || id });
  }
  W.boxes.sort((a, b) => b.area - a.area);

  kit.scene.add(W.worker.root);
  // Swap in the realistic crew member once its files arrive.
  const session = W;
  loadWorkerAsset().then((asset) => {
    if (W !== session) return;
    const real = buildRealWorker(THREE, asset);
    kit.scene.remove(W.worker.root); W.worker.dispose();
    W.worker = real; W.realistic = true;
    kit.scene.add(real.root);
  }).catch((error) => console.warn('Walk mode: using the simple figure,', error.message));
  controls.enabled = false;
  camera.fov = FOV; camera.near = 0.08; camera.updateProjectionMatrix();
  kit.setFrameHook(update);
  stage.classList.add('walking');
  hud.hidden = false;
  toggleBtn?.classList.add('active');
  kit.renderer.domElement.style.cursor = 'crosshair';
  say(matchMedia('(pointer:coarse)').matches
    ? 'You are on the rig. Use the stick to move and drag the scene to look around.'
    : 'You are on the rig. Click the scene to look around with the mouse.', 4200);
  update();
}

function stop() {
  if (!W) return;
  const { camera, controls, renderer } = kit;
  kit.setFrameHook(null);
  kit.scene.remove(W.worker.root);
  W.worker.dispose();
  camera.fov = W.saved.fov; camera.near = W.saved.near; camera.updateProjectionMatrix();
  camera.position.copy(W.saved.position); controls.target.copy(W.saved.target);
  controls.enabled = W.saved.enabled; controls.update();
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  renderer.domElement.style.cursor = 'grab';
  stage.classList.remove('walking');
  hud.hidden = true; promptEl.hidden = true; msgEl.hidden = true;
  toggleBtn?.classList.remove('active');
  W = null;
}

function toggle() {
  if (W) { stop(); return; }
  if (!kit) { return; }
  start();
}

/* ------------------------------------------------------------------ */
/* Per-frame update (called by the scene's render loop)                */
/* ------------------------------------------------------------------ */

function update(_time, fixedDt) {
  if (!W) return;
  const now = performance.now();
  const dt = fixedDt ?? Math.min(0.06, Math.max(0.001, (now - W.last) / 1000));
  W.last = now;
  const { camera } = kit, k = W.keys, p = W.pos;

  // Input in camera space.
  let ix = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + W.stick.x;
  let iz = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) + W.stick.y;
  const il = Math.hypot(ix, iz);
  if (il > 1) { ix /= il; iz /= il; }
  const running = k.has('shift') || W.runLatch;
  const speed = (running ? RUN : WALK) * Math.min(1, il);
  const sy = Math.sin(W.camYaw), cy = Math.cos(W.camYaw);
  let mx = 0, mz = 0;
  if (il > 0.05) {
    const n = Math.hypot(ix, iz);
    mx = (-sy * iz + cy * ix) / n; mz = (-cy * iz - sy * ix) / n;
    const want = Math.atan2(mx, mz);
    let d = want - W.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    W.yaw += d * Math.min(1, dt * 12);
  }

  // Horizontal move with wall slide.
  const dx = mx * speed * dt, dz = mz * speed * dt;
  let moved = 0;
  if (dx || dz) {
    // Edge protection: on foot you cannot step off a drop taller than a
    // storey. Jumping still can, which is how you end up overboard.
    const open = (mx2, mz2) => !blocked(p.x, p.y, p.z, mx2, mz2)
      && !(W.grounded && groundAt(p.x + mx2, p.z + mz2, p.y + STEP) < p.y - 2.5);
    if (open(dx, dz)) { p.x += dx; p.z += dz; moved = 1; }
    else if (dx && open(dx, 0)) { p.x += dx; moved = 0.7; }
    else if (dz && open(0, dz)) { p.z += dz; moved = 0.7; }
  }
  if (!W.offshore) {
    const r = Math.hypot(p.x, p.z);
    if (r > 140) { p.x *= 140 / r; p.z *= 140 / r; }
  }

  // Vertical: step up, fall, jump.
  const g = groundAt(p.x, p.z, p.y + STEP);
  if (W.grounded) {
    if (W.jumpQueued) { W.vy = JUMP; W.grounded = false; }
    else if (g >= p.y - STEP - 0.05) p.y += (g - p.y) * Math.min(1, dt * 16);
    else { W.grounded = false; W.vy = 0; }
  }
  if (!W.grounded) {
    W.vy -= GRAVITY * dt;
    p.y += W.vy * dt;
    if (W.vy <= 0 && p.y <= g) { p.y = g; W.vy = 0; W.grounded = true; }
  }
  W.jumpQueued = false;
  if ((W.offshore && p.y < 0.4) || p.y < -80) {
    place(W.spawn);
    say(W.offshore ? 'Man overboard! Recovered to the main deck. Stay inside the handrails.' : 'Back to the start point.', 3600);
  }

  // Walk cycle.
  const amt = W.grounded ? moved * Math.min(1, il) : 0.25;
  W.moveAmt += (amt - W.moveAmt) * Math.min(1, dt * 10);
  const w = W.worker;
  w.update(dt, { moveAmt: W.moveAmt, running, grounded: W.grounded, speed });
  w.root.position.copy(p); w.root.rotation.y = W.yaw;
  w.root.visible = !W.firstPerson;

  // Camera.
  const cp = Math.cos(W.camPitch), sp = Math.sin(W.camPitch);
  const look = W.tmpC.set(-sy * cp, sp, -cy * cp);
  if (W.firstPerson) {
    camera.position.set(p.x, p.y + EYE, p.z);
    camera.lookAt(p.x + look.x, p.y + EYE + look.y, p.z + look.z);
  } else {
    const px = p.x + cy * 0.45, py = p.y + 1.55, pz = p.z - sy * 0.45; // over the shoulder
    let want = 5.2;
    W.tmpA.set(px, py, pz); W.tmpB.copy(look).multiplyScalar(-1);
    const hit = cast(W.tmpA, W.tmpB, want + 0.3);
    if (hit) want = Math.max(0.7, hit.distance - 0.3);
    W.camDist = want < W.camDist ? want : W.camDist + (want - W.camDist) * Math.min(1, dt * 5);
    camera.position.set(px - look.x * W.camDist, py - look.y * W.camDist, pz - look.z * W.camDist);
    camera.lookAt(px + look.x * 8, py + look.y * 8, pz + look.z * 8);
  }
  kit.controls.target.set(p.x, p.y + 1.2, p.z);

  if (W.tick++ % 5 === 0) { findNear(); drawMap(); }
}

/* ------------------------------------------------------------------ */
/* Nearest assembly + minimap                                          */
/* ------------------------------------------------------------------ */

function findNear() {
  const probe = W.tmpA.set(W.pos.x, W.pos.y + 1, W.pos.z);
  let best = null;
  for (const b of W.boxes) {
    if (!shown(kit.parts.get(b.id))) continue;
    if (b.area > 1200 || b.box.distanceToPoint(probe) > 2.6) continue; // hull-sized parts are everywhere
    if (!best || b.diag < best.diag) best = b;
  }
  W.near = best;
  promptEl.hidden = !best;
  if (best) promptEl.innerHTML = `<kbd>E</kbd> Inspect <b></b>`, promptEl.querySelector('b').textContent = best.name;
  whereEl.textContent = `${best ? best.name + ' · ' : ''}Elev ${W.pos.y >= 0 ? '+' : ''}${W.pos.y.toFixed(1)} m`;
}

function drawMap() {
  const c = mapCtx, S = mapCanvas.width, R = S / 2, scale = R / 42; // 42 m radius
  const p = W.pos, sel = api.selected;
  c.clearRect(0, 0, S, S);
  c.save();
  c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
  c.fillStyle = W.offshore ? '#0d4a57' : '#8d8468'; c.fillRect(0, 0, S, S);
  for (const b of W.boxes) {
    if (!shown(kit.parts.get(b.id))) continue;
    const x = R + (b.box.min.x - p.x) * scale, y = R + (b.box.min.z - p.z) * scale;
    const w = (b.box.max.x - b.box.min.x) * scale, h = (b.box.max.z - b.box.min.z) * scale;
    if (x > S || y > S || x + w < 0 || y + h < 0) continue;
    const here = b === W.near, picked = b.id === sel;
    c.fillStyle = picked ? '#00d49fcc' : here ? '#f4a03acc' : b.area > 900 ? '#c9d3cc' : '#5d8a8455';
    c.strokeStyle = picked ? '#eafff7' : here ? '#ffe2b5' : '#0b202755';
    c.lineWidth = picked || here ? 3 : 1.5;
    c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
  }
  // View cone and position marker.
  const ang = -W.camYaw - Math.PI / 2;
  c.fillStyle = '#ffffff40';
  c.beginPath(); c.moveTo(R, R); c.arc(R, R, 60, ang - 0.5, ang + 0.5); c.closePath(); c.fill();
  c.translate(R, R); c.rotate(Math.PI - W.yaw);
  c.fillStyle = '#d6e21f'; c.strokeStyle = '#0b2027'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 10); c.lineTo(0, 5); c.lineTo(-10, 10); c.closePath(); c.fill(); c.stroke();
  c.restore();
  c.strokeStyle = '#ffffff66'; c.lineWidth = 3;
  c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.stroke();
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function changeLevel(dir) {
  const p = W.pos;
  let best = null;
  const tryAt = (x, z) => {
    for (const y of levelsAt(x, z)) {
      const d = (y - p.y) * dir;
      if (d < 1.4) continue;
      if (!best || d < best.d) best = { x, y, z, d };
    }
  };
  tryAt(p.x, p.z);
  if (!best) for (const r of [2, 4, 7, 11]) {
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; tryAt(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r); }
    if (best) break;
  }
  if (!best) { say(dir > 0 ? 'No level above this spot.' : 'No level below this spot.'); return; }
  place(best);
  say(`${dir > 0 ? 'Up' : 'Down'} to elevation ${best.y >= 0 ? '+' : ''}${best.y.toFixed(1)} m`);
}

function goToSelected() {
  const id = api.selected;
  if (!id) { say('Select an assembly in the navigator first, then press T.'); return; }
  const spot = standNear(id);
  if (!spot) { place(W.spawn); say('That assembly spans the rig. Moved to the main working level.'); return; }
  place(spot, spot.yaw);
  say('Moved to ' + (W.boxes.find((b) => b.id === id)?.name || 'the selected assembly'));
}

function inspect() {
  if (!W.near) { say('Walk up to an assembly to inspect it.'); return; }
  kit.onSelect(W.near.id, false);
}

function act(name) {
  if (name === 'exit') { stop(); return; }
  if (!W) return;
  if (name === 'view') { W.firstPerson = !W.firstPerson; say(W.firstPerson ? 'First-person view' : 'Chase view', 1400); }
  else if (name === 'up') changeLevel(1);
  else if (name === 'down') changeLevel(-1);
  else if (name === 'goto') goToSelected();
  else if (name === 'inspect') inspect();
  else if (name === 'jump') W.jumpQueued = true;
  else if (name === 'run') { W.runLatch = !W.runLatch; hud.querySelector('[data-walk="run"]').classList.toggle('on', W.runLatch); }
}

hud.addEventListener('click', (e) => {
  const b = e.target.closest('[data-walk]');
  if (b) { act(b.dataset.walk); b.blur(); }
});

/* ------------------------------------------------------------------ */
/* Keyboard — captured ahead of the explorer's own shortcuts            */
/* ------------------------------------------------------------------ */

function typing() {
  const el = document.activeElement;
  return $('#dialog')?.open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable;
}

addEventListener('keydown', (e) => {
  if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (!W) {
    if (key === 'p' && kit && $('#fleet-view')?.hidden !== false) { e.preventDefault(); e.stopImmediatePropagation(); start(); }
    return;
  }
  // While walking, every key belongs to walk mode (W A S D would otherwise
  // trigger Fade, Hide and the other explorer shortcuts).
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat) return;
  if (key === 'escape' || key === 'p') stop();
  else if (key === ' ') W.jumpQueued = true;
  else if (key === 'v') act('view');
  else if (key === 'e') act('inspect');
  else if (key === 't') act('goto');
  else if (key === 'pageup') act('up');
  else if (key === 'pagedown') act('down');
  else W.keys.add(key);
}, true);
addEventListener('keyup', (e) => { W?.keys.delete(e.key.toLowerCase()); }, true);
addEventListener('blur', () => { W?.keys.clear(); });

/* ------------------------------------------------------------------ */
/* Looking: pointer lock on desktop, drag on touch                      */
/* ------------------------------------------------------------------ */

let drag = null;
function turn(dx, dy, sens) {
  W.camYaw -= dx * sens;
  W.camPitch = Math.max(-1.25, Math.min(1.1, W.camPitch - dy * sens));
}
document.addEventListener('pointerdown', (e) => {
  if (!W || e.target !== kit.renderer.domElement) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  if (e.pointerType === 'mouse' && document.pointerLockElement !== e.target) {
    try { const r = e.target.requestPointerLock(); r?.catch?.(() => {}); } catch { /* drag-look still works */ }
  }
}, true);
document.addEventListener('pointermove', (e) => {
  if (!W) return;
  if (document.pointerLockElement === kit.renderer.domElement) { turn(e.movementX, e.movementY, 0.0024); return; }
  if (drag && e.pointerId === drag.id) {
    turn(e.clientX - drag.x, e.clientY - drag.y, e.pointerType === 'mouse' ? 0.004 : 0.006);
    drag.x = e.clientX; drag.y = e.clientY;
  }
}, true);
const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
document.addEventListener('pointerup', endDrag, true);
document.addEventListener('pointercancel', endDrag, true);

/* Touch joystick */
let stickId = null;
function stickMove(e) {
  const r = stickEl.getBoundingClientRect();
  let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  if (W) { W.stick.x = x; W.stick.y = -y; }
  stickEl.firstElementChild.style.transform = `translate(${x * 26}px,${y * 26}px)`;
}
stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); stickMove(e); e.preventDefault(); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = (e) => {
  if (e.pointerId !== stickId) return;
  stickId = null; if (W) { W.stick.x = 0; W.stick.y = 0; }
  stickEl.firstElementChild.style.transform = '';
};
stickEl.addEventListener('pointerup', stickEnd);
stickEl.addEventListener('pointercancel', stickEnd);

// Structured hook for tests and the page's own tooling.
window.mtrWalk = {
  start, stop, toggle, act,
  step(dt = 1 / 60, frames = 1) { for (let i = 0; i < frames && W; i++) update(0, dt); },
  key(name, down = true) { if (W) down ? W.keys.add(name) : W.keys.delete(name); },
  look(yaw, pitch = W?.camPitch) { if (W) { W.camYaw = yaw; W.camPitch = pitch; } },
  get active() { return !!W; },
  get state() { return W && { realistic: !!W.realistic, natural: W.worker.natural, members: W.collider.count, x: W.pos.x, y: W.pos.y, z: W.pos.z, grounded: W.grounded, firstPerson: W.firstPerson, near: W.near?.id || null }; },
};

/* ==========================================================================
   PETROLHEAD TECHNICA — engine explorer viewer
   --------------------------------------------------------------------------
   Rendering, explosion state, selection and cinematic playback. Knows nothing
   car-specific: everything it draws comes from a manifest in engine-catalog.js
   and a builder in engine-geometry.js.

   Explosion is ONE deterministic number, progress ∈ [0,1]. Each component maps
   it through its own authored window and offset:

       local = basePosition + toLocal(offset) × ease(window(progress))

   Nothing is ever accumulated, so any number of explode / reassemble cycles
   returns every component — parents and nested children alike — to exactly its
   captured transform. Offsets are metric, in the engine's own axes, and are
   converted into each parent's local frame, so a nested part (the R32's
   sealing cover inside the cylinder head) moves relative to its parent.
   ========================================================================== */
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadEngine, disposeBuilt } from './engine-geometry.js';

const REDUCED = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const clamp01 = v => Math.min(1, Math.max(0, v));
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const smootherWindow = (p, a, b) => easeInOut(clamp01((p - a) / Math.max(1e-6, b - a)));

const BG = 0xf7f8fa;          // explorer studio
const BG_CINE = 0xfcfcfd;     // cinematic: nearer white

/* With the AO composer the background is rendered into a linear target and then
   tone-mapped, which would grey a near-white studio. Khronos Neutral maps a
   linear input x > 0.76 to 1 − 0.24²/(x − 0.52), so to land on the intended
   white we feed the inverse. Without the composer the clear colour is used as is. */
function studioColour(hex, throughToneMap) {
  const c = new T.Color(hex);                           // linear working space
  if (!throughToneMap) return c;
  const peak = Math.max(c.r, c.g, c.b);                 // Neutral compresses by peak channel
  if (peak <= 0.76) return c;
  const f = (0.52 + 0.0576 / (1 - Math.min(peak, 0.995))) / peak;
  return c.multiplyScalar(f);
}

export function createEngineViewer(host, opts = {}) {
  /* ── renderer ─────────────────────────────────────────────── */
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) { opts.onError?.('webgl'); return null; }
  if (!renderer.getContext()) { opts.onError?.('webgl'); return null; }

  const q = new URLSearchParams(location.search);
  const mobile = window.matchMedia?.('(max-width: 820px), (pointer: coarse)').matches ?? false;
  const quality = {
    pixelRatio: Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2),
    shadows: !mobile && q.get('shadows') !== '0',
    ao: !mobile && q.get('ao') !== '0',
  };
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;          // refreshed only when geometry or light changes
  renderer.setClearColor(BG, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const scene = new T.Scene();
  scene.background = studioColour(BG, false);
  const paintBackground = hex => {
    const c = studioColour(hex, !!composer);
    scene.background = c;
    renderer.setClearColor(hex, 1);
    invalidate();
  };

  const camera = new T.PerspectiveCamera(30, 1, 0.02, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 0.2;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_ROTATE };
  /* OrbitControls sets touch-action:none, which traps the page on a phone.
     pan-y hands vertical drags back to the document, so the page still scrolls
     while horizontal drags orbit and two fingers pinch-zoom. */
  canvas.style.touchAction = 'pan-y';
  controls.addEventListener('start', () => { userMoved = true; glide = null; });
  controls.addEventListener('change', () => invalidate());

  const pmrem = new T.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.62;               // restrained fill: preserves dark recesses

  /* coherent studio rig: key (shadow caster), cool fill, rim, soft ground bounce */
  const hemi = new T.HemisphereLight(0xffffff, 0xb9c0c7, 0.55);
  scene.add(hemi);
  const key = new T.DirectionalLight(0xfff8ee, 2.6);
  key.position.set(0.9, 1.6, 1.1);
  key.castShadow = quality.shadows;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 8;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.004; key.shadow.radius = 3;
  scene.add(key); scene.add(key.target);
  const KEY_DIR = new T.Vector3(0.9, 1.6, 1.1).normalize();
  const fill = new T.DirectionalLight(0xe6eeff, 0.7);
  fill.position.set(-1.4, 0.7, -0.5);
  scene.add(fill);
  const rim = new T.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-0.4, 0.9, -1.5);
  scene.add(rim);

  const ground = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({ opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.visible = quality.shadows;
  scene.add(ground);

  /* optional restrained ambient occlusion (desktop only, failure-tolerant) */
  let composer = null, gtao = null;
  async function initAO() {
    if (!quality.ao) return;
    try {
      const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/GTAOPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
      ]);
      if (disposed) return;
      const size = renderer.getSize(new T.Vector2());
      const rt = new T.WebGLRenderTarget(size.x * quality.pixelRatio, size.y * quality.pixelRatio,
        { type: T.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.setPixelRatio(quality.pixelRatio);
      composer.setSize(size.x, size.y);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, size.x, size.y);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.06, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      composer.addPass(gtao);
      composer.addPass(new OutputPass());
      // the shadow-catcher plane is huge and would be darkened by AO; contact
      // occlusion replaces it while the composer runs
      ground.visible = false;
      paintBackground(cinematic ? BG_CINE : BG);
    } catch (err) {
      console.warn('Ambient occlusion unavailable, continuing without it:', err);
      composer = null; gtao = null;
    }
  }

  /* ── state ────────────────────────────────────────────────── */
  const root = new T.Group();
  scene.add(root);

  let built = null, manifest = null;
  let comps = [];                    // component records, manifest order
  let byId = new Map();
  let progress = 0;                  // the single source of truth, 0..1
  let targetProgress = 0, animating = false, animFrom = 0, animStart = 0, animDur = 0;
  let selected = null;
  let autoRotate = false;
  let cinematic = false, cineT = 0, cinePaused = false, cineSaved = null, cineBase = null;
  let loadToken = 0;                 // guards stale async loads
  let disposed = false, visible = true, userMoved = false;
  let labelsOn = false;
  let dirty = true, shadowDirty = true;
  let poseBox = new T.Box3(), poseSphere = new T.Sphere(), poseDirty = true;
  let glide = null;
  const invalidate = () => { dirty = true; };

  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();

  /* ── build / rebuild ──────────────────────────────────────── */
  function clearModel() {
    if (!built) return;
    root.remove(built.group);
    // per-component highlight clones are owned here, shared ones by the builder
    for (const c of comps) for (const m of c.ownedMaterials) m.dispose();
    disposeBuilt(built);
    built = null; comps = []; byId = new Map(); selected = null; manifest = null;
  }

  /** Load a manifest. Resolves true when attached; false when a newer
      selection superseded it (so a slow load can never attach the wrong engine). */
  async function setCar(car) {
    const token = ++loadToken;
    opts.onLoading?.(true, 0);
    clearModel();
    let result;
    try {
      result = await loadEngine(car.layout, f => { if (token === loadToken) opts.onLoading?.(true, f); });
    } catch (err) {
      console.error(err);
      if (token === loadToken) opts.onError?.('load');
      return false;
    }
    if (token !== loadToken || disposed) { disposeBuilt(result); return false; }

    built = result; manifest = car;
    root.add(built.group);
    built.group.updateMatrixWorld(true);

    // Every component owns clones of the materials it uses, so highlighting
    // one can never tint another that shared a material instance.
    const records = [];
    for (const spec of car.components) {
      const obj = built.parts.get(spec.id);
      if (!obj) { console.warn(`Manifest component "${spec.id}" has no geometry for ${car.id}`); continue; }
      const cloneOf = new Map(), owned = [], meshes = [];
      obj.traverse(o => {
        if (!o.isMesh) return;
        // belongs to this component unless a nested component claims it
        let p = o; while (p && !p.userData.componentId) p = p.parent;
        if (p !== obj) return;
        const swap = m => { if (!cloneOf.has(m)) { const c = m.clone(); cloneOf.set(m, c); owned.push(c); } return cloneOf.get(m); };
        o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
        meshes.push(o);
      });
      records.push({
        id: spec.id, spec, n: records.length + 1, obj, meshes, ownedMaterials: owned,
        parent: null,
        baseMatrix: obj.matrix.clone(),
        basePos: obj.position.clone(), baseQuat: obj.quaternion.clone(), baseScale: obj.scale.clone(),
        win: spec.window || [0, 1],
        offsetW: new T.Vector3(...spec.offset),
        toLocal: new T.Matrix4(),
        home: new T.Vector3(), homeValid: false,
      });
    }
    byId = new Map(records.map(c => [c.id, c]));
    for (const c of records) {
      let p = c.obj.parent;
      while (p && !byId.has(p.userData.componentId ?? '')) p = p.parent;
      c.parent = p ? byId.get(p.userData.componentId) : null;
      // world→local linear map of the parent frame, captured assembled
      const pm = (c.obj.parent || root).matrixWorld.clone().setPosition(0, 0, 0);
      c.toLocal.copy(pm).invert();
    }
    comps = records;

    // assembled "home" centres, for separation guides
    applyProgress(0, true);
    for (const c of comps) {
      const b = new T.Box3().setFromObject(c.obj);
      if (!b.isEmpty()) { b.getCenter(c.home); c.homeValid = true; }
    }
    applyProgress(0, true);
    selected = null;
    // fit the key light and its shadow frustum to the FULLY exploded extents, so
    // shadows never clip while scrubbing; the ground then follows the pose
    applyProgress(1, true);
    const ext = new T.Box3().setFromObject(built.group), extSph = ext.getBoundingSphere(new T.Sphere());
    applyProgress(0, true);
    key.target.position.copy(extSph.center);
    key.position.copy(extSph.center).addScaledVector(KEY_DIR, extSph.radius * 3);
    const sc = key.shadow.camera, r = extSph.radius * 1.15;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = extSph.radius * 1.2; sc.far = extSph.radius * 5.5;
    sc.updateProjectionMatrix(); key.target.updateMatrixWorld();
    controls.maxDistance = Math.max(5, extSph.radius * 9);    // never cap the camera inside the exploded fit
    shadowDirty = true; poseDirty = true;

    canvas.setAttribute('aria-label', opts.canvasLabel?.(car) ?? 'Interactive 3D engine model');
    resetView(false);
    opts.onLoading?.(false, 1);
    opts.onReady?.(car);
    invalidate();
    return true;
  }

  /* ── explosion ────────────────────────────────────────────── */
  const tmp = new T.Vector3();
  function applyProgress(p, silent = false) {
    progress = clamp01(p);
    for (const c of comps) {
      const e = smootherWindow(progress, c.win[0], c.win[1]);
      tmp.copy(c.offsetW).multiplyScalar(e).applyMatrix4(c.toLocal);
      c.obj.position.copy(c.basePos).add(tmp);
    }
    root.updateMatrixWorld(true);
    poseDirty = true; shadowDirty = true; invalidate();
    if (!silent) opts.onProgress?.(progress);
  }

  /** Direct scrubbing: track the input exactly, no easing in time. */
  function scrubTo(p) { animating = false; applyProgress(p); }

  /** Preset / step change: ease over time. */
  function animateTo(p, ms = 700) {
    p = clamp01(p);
    if (REDUCED()) { scrubTo(p); return; }
    animFrom = progress; targetProgress = p;
    animStart = performance.now(); animDur = Math.max(1, ms); animating = true;
    invalidate();
  }

  /** The progress at which a component has finished separating. */
  function completionOf(id) { return byId.get(id)?.win[1] ?? 1; }

  /* ── selection ────────────────────────────────────────────── */
  const HI = new T.Color(0x1d5fd0);
  function setSelected(id, { focus = false } = {}) {
    selected = id && byId.has(id) ? id : null;
    for (const c of comps) {
      const on = c.id === selected;
      for (const m of c.ownedMaterials) {
        if (!m.emissive) continue;
        m.emissive.copy(on ? HI : new T.Color(0));
        m.emissiveIntensity = on ? 0.5 : 0;
      }
    }
    invalidate();
    if (focus && selected) focusComponent(selected);
    opts.onSelect?.(selected);
  }

  function focusComponent(id) {
    const c = byId.get(id);
    if (!c) return;
    const box = new T.Box3().setFromObject(c.obj);
    if (box.isEmpty()) return;
    const sph = box.getBoundingSphere(new T.Sphere());
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = Math.max(sph.radius / Math.sin(T.MathUtils.degToRad(camera.fov) / 2) * 1.25, 0.3);
    userMoved = true;
    glideCamera(sph.center.clone().addScaledVector(dir, dist), sph.center.clone());
  }

  /* ── camera ───────────────────────────────────────────────── */
  function glideCamera(toPos, toTarget, ms = 650) {
    if (REDUCED()) {
      camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); invalidate(); return;
    }
    glide = {
      fromPos: camera.position.clone(), toPos: toPos.clone(),
      fromTgt: controls.target.clone(), toTgt: toTarget.clone(),
      start: performance.now(), dur: ms,
    };
    invalidate();
  }

  function updatePose() {
    if (!poseDirty || !built) return;
    poseBox.setFromObject(built.group);
    poseBox.getBoundingSphere(poseSphere);
    ground.position.y = poseBox.min.y - 0.004;
    poseDirty = false;
  }

  /** Distance at which the CURRENT pose's bounds fit the frame from direction `dir`. */
  function fitDistance(dir, margin = 1.08) {
    updatePose();
    const c = poseBox.getCenter(new T.Vector3());
    const fwd = dir.clone().normalize();                       // from target toward camera
    const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), fwd).normalize();
    const up = new T.Vector3().crossVectors(fwd, right).normalize();
    const tanV = Math.tan(T.MathUtils.degToRad(camera.fov) / 2);
    const tanH = tanV * camera.aspect;
    let need = 0;
    const p = new T.Vector3();
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? poseBox.max.x : poseBox.min.x, i & 2 ? poseBox.max.y : poseBox.min.y, i & 4 ? poseBox.max.z : poseBox.min.z).sub(c);
      const x = Math.abs(p.dot(right)), y = Math.abs(p.dot(up)), z = p.dot(fwd);
      need = Math.max(need, x / tanH + z, y / tanV + z);
    }
    return { dist: need * margin, centre: c };
  }

  function defaultDir() {
    const v = manifest?.camera?.dir ?? [0.62, 0.42, 0.66];
    return new T.Vector3(...v).normalize();
  }

  function resetView(animate = true) {
    userMoved = false;
    if (!built) return;
    const dir = defaultDir();
    const f = fitDistance(dir);
    const pos = f.centre.clone().addScaledVector(dir, f.dist), tgt = f.centre.clone();
    if (animate) glideCamera(pos, tgt);
    else { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); invalidate(); }
  }

  /** While the user has not taken the camera, keep the current pose in frame:
      the assembled engine stays large and the fully exploded one stays inside. */
  function autoFit(dt) {
    if (userMoved || glide || cinematic || !built) return;
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-8) return;
    const f = fitDistance(dir);
    const k = REDUCED() ? 1 : 1 - Math.exp(-dt * 7);
    const curDist = dir.length();
    const nd = curDist + (f.dist - curDist) * k;
    const nt = controls.target.clone().lerp(f.centre, k);
    if (Math.abs(nd - curDist) > 1e-5 || nt.distanceToSquared(controls.target) > 1e-10) {
      controls.target.copy(nt);
      camera.position.copy(nt).addScaledVector(dir.normalize(), nd);
      invalidate();
    }
  }

  /* ── cinematic ────────────────────────────────────────────── */
  const CINE_SECONDS = 12;
  function enterCinematic() {
    if (cinematic || !built) return;
    const off = camera.position.clone().sub(controls.target);
    cineSaved = {
      pos: camera.position.clone(), tgt: controls.target.clone(),
      selected, autoRotate, progress, userMoved,
    };
    setSelected(null);
    // start exactly where the explorer's camera is; the arc oscillates around it
    cineBase = {
      yaw: Math.atan2(off.z, off.x),
      pitch: Math.asin(T.MathUtils.clamp(off.y / off.length(), -0.9, 0.9)),
    };
    cinematic = true; cineT = 0; cinePaused = REDUCED();
    glide = null; animating = false; controls.enabled = false;
    paintBackground(BG_CINE);
    opts.onCinematic?.(true);
  }

  function exitCinematic() {
    if (!cinematic) return;
    cinematic = false; controls.enabled = true;
    paintBackground(BG);
    if (cineSaved) {
      applyProgress(cineSaved.progress);
      autoRotate = cineSaved.autoRotate;
      userMoved = cineSaved.userMoved;
      camera.position.copy(cineSaved.pos); controls.target.copy(cineSaved.tgt); controls.update();
      setSelected(cineSaved.selected);
      cineSaved = null;
    }
    invalidate();
    opts.onCinematic?.(false);
  }

  function cinematicFrame(dt) {
    if (!cinePaused) cineT = (cineT + dt / CINE_SECONDS) % 1;
    const a = cineT * Math.PI * 2;
    // One closed, continuous loop: a gentle yaw sweep, a slow pitch breath and
    // a dolly that follows the pose's own bounds, so the whole assembly stays
    // framed at every explosion amount and the loop seam is invisible.
    const yaw = cineBase.yaw + Math.sin(a) * 0.62;
    const pitch = T.MathUtils.clamp(cineBase.pitch + (1 - Math.cos(a)) * 0.05, 0.05, 0.75);
    const dir = new T.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
    const f = fitDistance(dir, 1.14);
    const dist = f.dist * (1 + (1 - Math.cos(a)) * 0.03);
    camera.position.copy(f.centre).addScaledVector(dir, dist);
    camera.lookAt(f.centre);
    controls.target.copy(f.centre);
    invalidate();
    opts.onCinematicTime?.(cineT);
  }

  /* ── pointer picking ──────────────────────────────────────── */
  const idOf = obj => { let o = obj; while (o) { if (o.userData.componentId) return o.userData.componentId; o = o.parent; } return null; };
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (cinematic || !downAt || !built) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return;                       // that was an orbit, not a click
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(built.group, true)[0];
    if (!hit) { return; }
    const id = idOf(hit.object);
    if (id) setSelected(id === selected ? null : id);
  });

  canvas.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetView(); }
    const step = 0.06;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); userMoved = true;
      const v = camera.position.clone().sub(controls.target);
      const sph = new T.Spherical().setFromVector3(v);
      if (e.key === 'ArrowLeft') sph.theta -= step * 2;
      if (e.key === 'ArrowRight') sph.theta += step * 2;
      if (e.key === 'ArrowUp') sph.phi = Math.max(0.15, sph.phi - step * 2);
      if (e.key === 'ArrowDown') sph.phi = Math.min(Math.PI * 0.92, sph.phi + step * 2);
      camera.position.copy(controls.target).add(v.setFromSpherical(sph)); invalidate();
    }
    if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault(); userMoved = true;
      const v = camera.position.clone().sub(controls.target);
      v.multiplyScalar(e.key === '-' ? 1.08 : 0.92);
      camera.position.copy(controls.target).add(v); invalidate();
    }
  });

  /* ── loop ─────────────────────────────────────────────────── */
  let last = performance.now();
  let perf = { frames: 0, renderMs: 0, rendered: 0 };
  function frame(now) {
    if (disposed) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;                       // nothing animates on a hidden page

    if (animating) {
      const t = Math.min(1, (now - animStart) / animDur);
      applyProgress(animFrom + (targetProgress - animFrom) * easeInOut(t));
      if (t >= 1) animating = false;
    }
    if (glide) {
      const t = Math.min(1, (now - glide.start) / glide.dur);
      const e = easeInOut(t);
      camera.position.lerpVectors(glide.fromPos, glide.toPos, e);
      controls.target.lerpVectors(glide.fromTgt, glide.toTgt, e);
      invalidate();
      if (t >= 1) glide = null;
    }
    if (cinematic) cinematicFrame(dt);
    else {
      if (autoRotate && !glide && !REDUCED()) {
        const v = camera.position.clone().sub(controls.target);
        v.applyAxisAngle(new T.Vector3(0, 1, 0), dt * 0.22);
        camera.position.copy(controls.target).add(v);
        invalidate();
      }
      if (built) autoFit(dt);
      if (controls.update()) invalidate();
    }

    perf.frames++;
    if (!dirty) return;                         // idle: nothing changed, nothing drawn
    dirty = false;
    if (shadowDirty && quality.shadows) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    const t0 = performance.now();
    if (composer) composer.render(); else renderer.render(scene, camera);
    perf.renderMs += performance.now() - t0; perf.rendered++;
  }
  requestAnimationFrame(frame);

  /* ── sizing ───────────────────────────────────────────────── */
  let lastW = 0, lastH = 0;
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // The canvas is 0×0 for the first layout pass, so framing computed at load
    // time is against the wrong aspect. Re-frame until the user orbits.
    if (built && !userMoved && !cinematic) resetView(false);
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const visHandler = () => { visible = !document.hidden; last = performance.now(); invalidate(); };
  document.addEventListener('visibilitychange', visHandler);

  const lostHandler = e => { e.preventDefault(); opts.onError?.('context-lost'); };
  const restoredHandler = () => { shadowDirty = true; invalidate(); opts.onError?.(null); };
  canvas.addEventListener('webglcontextlost', lostHandler);
  canvas.addEventListener('webglcontextrestored', restoredHandler);

  initAO();

  /* ── callout data for the DOM overlay ─────────────────────── */
  const vis = new Map();            // id → last occlusion verdict
  let visCursor = 0;
  function checkOneVisibility() {
    if (!comps.length) return;
    const c = comps[visCursor++ % comps.length];
    const b = new T.Box3().setFromObject(c.obj);
    if (b.isEmpty()) { vis.set(c.id, false); return; }
    const centre = b.getCenter(new T.Vector3());
    const dir = centre.clone().sub(camera.position);
    const dist = dir.length();
    raycaster.set(camera.position, dir.normalize());
    raycaster.far = dist * 1.02;
    const hits = raycaster.intersectObject(built.group, true);
    raycaster.far = Infinity;
    // visible when the first surface along the ray belongs to this component or
    // something nested inside it, or the centre point is not covered at all
    const first = hits[0];
    const hid = first ? idOf(first.object) : c.id;
    let ok = hid === c.id;
    for (let r = byId.get(hid); r && !ok; r = r.parent) ok = r.id === c.id;
    // also accept when the ray lands within the component's own box edge
    vis.set(c.id, ok || !first);
  }

  return {
    setCar,
    scrubTo, animateTo, completionOf,
    get progress() { return progress; },
    setSelected, focusComponent,
    get selected() { return selected; },
    resetView,
    /** Fit the current pose from a direction (also used for camera presets). */
    setViewDirection(dir, { animate = false, margin = 1.12 } = {}) {
      if (!built) return;
      const d = new T.Vector3(...dir).normalize(), f = fitDistance(d, margin);
      const pos = f.centre.clone().addScaledVector(d, f.dist);
      userMoved = true;
      if (animate) glideCamera(pos, f.centre); else { camera.position.copy(pos); controls.target.copy(f.centre); controls.update(); invalidate(); }
    },
    setAutoRotate(v) { autoRotate = !!v; invalidate(); },
    get autoRotate() { return autoRotate; },
    setLabels(v) { labelsOn = !!v; invalidate(); opts.onLabels?.(labelsOn); },
    get labels() { return labelsOn; },
    enterCinematic, exitCinematic,
    get cinematic() { return cinematic; },
    toggleCinePause() { cinePaused = !cinePaused; invalidate(); return cinePaused; },
    get cinePaused() { return cinePaused; },
    setCineTime(t) { cineT = clamp01(t); invalidate(); },
    get cineTime() { return cineT; },
    componentIds() { return comps.map(c => c.id); },
    invalidate,
    get quality() { return quality; },
    get hasAO() { return !!composer; },

    /** Exact local poses, for drift checks. */
    componentPoses() {
      return comps.map(c => ({ id: c.id, p: c.obj.position.toArray().map(n => +n.toFixed(9)) }));
    },
    /** Screen anchors, numbers and guide endpoints for the HTML/SVG overlay. */
    callouts() {
      if (!built) return [];
      checkOneVisibility(); checkOneVisibility();
      const w = host.clientWidth, h = host.clientHeight;
      const camDir = new T.Vector3(); camera.getWorldDirection(camDir);
      const proj = (v) => {
        const p = v.clone(); const behind = p.clone().sub(camera.position).dot(camDir) <= 0;
        p.project(camera);
        return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, behind };
      };
      return comps.map(c => {
        const b = new T.Box3().setFromObject(c.obj);
        const centre = b.isEmpty() ? c.home.clone() : b.getCenter(new T.Vector3());
        const now = proj(centre), home = proj(c.home);
        const inView = !now.behind && now.x > -4 && now.x < w + 4 && now.y > -4 && now.y < h + 4;
        return {
          id: c.id, n: c.n, x: now.x, y: now.y, hx: home.x, hy: home.y,
          moved: centre.distanceTo(c.home),
          inView, visible: inView && (vis.get(c.id) ?? true),
        };
      });
    },
    /** Every hose end must land on a visible port: returns the worst gap in metres. */
    verifyPorts() {
      if (!built?.network) return null;
      built.group.updateMatrixWorld(true);
      const portParent = new Map(), conns = [];
      built.group.traverse(o => {
        const pid = o.userData.coolingPortId ?? o.userData.portId;
        if (pid && o.userData.coolingJoint) portParent.set(pid, o.parent);
        if ((o.userData.coolingConnectionId ?? o.userData.connectionId) && o.userData.sweep) conns.push(o);
      });
      const portById = new Map(built.network.ports.map(p => [p.id, p]));
      const out = [];
      for (const o of conns) {
        const id = o.userData.coolingConnectionId ?? o.userData.connectionId;
        const conn = built.network.connections.find(c => c.id === id);
        const sw = o.userData.sweep;
        for (const [end, pid] of [[sw.start, conn.from], [sw.end, conn.to]]) {
          const port = portById.get(pid), par = portParent.get(pid);
          if (!port || !par) { out.push({ connection: id, port: pid, gapMetres: Infinity }); continue; }
          const a = o.localToWorld(new T.Vector3(...end)), b = par.localToWorld(new T.Vector3(...port.position));
          out.push({ connection: id, port: pid, external: port.external, gapMetres: a.distanceTo(b) });
        }
      }
      return out;
    },
    perf() { return { ...perf, avgRenderMs: perf.rendered ? perf.renderMs / perf.rendered : 0, ao: !!composer, quality }; },
    info() { return { ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs?.length }; },
    framing() {
      updatePose();
      return {
        centre: poseBox.getCenter(new T.Vector3()).toArray(), size: poseBox.getSize(new T.Vector3()).toArray(),
        cam: camera.position.toArray(), target: controls.target.toArray(), userMoved,
        aspect: camera.aspect,
      };
    },
    /** Project the pose's bounding-box corners to NDC: all within ±1 means fully framed. */
    framedMargin() {
      updatePose();
      let m = 0; const v = new T.Vector3();
      camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? poseBox.max.x : poseBox.min.x, i & 2 ? poseBox.max.y : poseBox.min.y, i & 4 ? poseBox.max.z : poseBox.min.z).project(camera);
        m = Math.max(m, Math.abs(v.x), Math.abs(v.y));
      }
      return m;
    },
    /** Render now and read the canvas back in the same task (no preserveDrawingBuffer
        needed). Returns a PNG data URL — used for verification captures. */
    snapshot() {
      if (quality.shadows) renderer.shadowMap.needsUpdate = true;
      if (composer) composer.render(); else renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },
    get debug() { return { scene, key, ground, renderer, camera, controls }; },
    get built() { return built; },
    dispose() {
      disposed = true;
      ro.disconnect();
      document.removeEventListener('visibilitychange', visHandler);
      canvas.removeEventListener('webglcontextlost', lostHandler);
      canvas.removeEventListener('webglcontextrestored', restoredHandler);
      clearModel();
      composer?.dispose?.(); gtao?.dispose?.();
      envTex.dispose();
      ground.geometry.dispose(); ground.material.dispose();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

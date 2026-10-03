/* ==========================================================================
   PETROLHEAD TECHNICA — engine explorer viewer
   --------------------------------------------------------------------------
   Rendering, explosion state and cinematic playback. Knows nothing car-specific:
   everything it draws comes from a manifest in engine-catalog.js and geometry
   from engine-geometry.js.

   Explosion is one deterministic number. progress ∈ [0,1] maps to
   position = basePosition + authoredOffset × eased(progress)
   and nothing is ever accumulated, so any number of explode/reassemble cycles
   returns every component to exactly its captured pose.
   ========================================================================== */
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMaterials, buildByLayout } from './engine-geometry.js';

const REDUCED = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/* The camera has to contain the fully exploded spread without moving while the
   user scrubs, so a wider spread means a smaller assembled engine. 0.72 is the
   tuned compromise: 100% still reads as fully apart, assembled still has
   presence on a phone. */
const SPREAD = 0.72;

export function createEngineViewer(host, opts = {}) {
  /* ── renderer ─────────────────────────────────────────────── */
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    opts.onError?.('webgl');
    return null;
  }
  if (!renderer.getContext()) { opts.onError?.('webgl'); return null; }

  const mobile = window.matchMedia?.('(max-width: 820px)').matches ?? false;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 2 : 2.2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0xf6f7f9, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const scene = new T.Scene();
  scene.background = new T.Color(0xf6f7f9);

  const camera = new T.PerspectiveCamera(32, 1, 0.01, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 0.45;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_ROTATE };
  /* OrbitControls sets touch-action:none, which traps the page on a phone.
     pan-y hands vertical drags back to the document, so the page still scrolls
     normally while horizontal drags orbit and two fingers pinch-zoom. */
  canvas.style.touchAction = 'pan-y';

  controls.addEventListener('start', () => { userMoved = true; });

  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new T.HemisphereLight(0xffffff, 0xc3cad0, 1.25));
  const key = new T.DirectionalLight(0xffffff, 2.0);
  key.position.set(1.5, 2.3, 1.7);
  key.castShadow = !mobile;
  if (key.shadow) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 8;
    key.shadow.camera.left = -1.2; key.shadow.camera.right = 1.2;
    key.shadow.camera.top = 1.2; key.shadow.camera.bottom = -1.2;
    key.shadow.bias = -0.0012;
  }
  scene.add(key);
  const fill = new T.DirectionalLight(0xffffff, 0.75);
  fill.position.set(-1.8, 1.0, -1.4);
  scene.add(fill);
  /* a low bounce so black covers keep their form instead of going flat */
  const bounce = new T.DirectionalLight(0xffffff, 0.4);
  bounce.position.set(0.2, -1.4, 0.6);
  scene.add(bounce);

  const ground = new T.Mesh(
    new T.PlaneGeometry(12, 12),
    new T.ShadowMaterial({ opacity: mobile ? 0 : 0.14 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ── state ────────────────────────────────────────────────── */
  const root = new T.Group();
  scene.add(root);

  let mats = null, built = null, manifest = null;
  let components = [];              // { id, obj, base:Vector3, offset:Vector3, meshes[] }
  let byId = new Map();
  let progress = 0;                 // the single source of truth, 0..1
  let targetProgress = 0, animating = false, animFrom = 0, animStart = 0, animDur = 0;
  let selected = null;
  let autoRotate = false;
  let cinematic = false, cineT = 0, cinePaused = false;
  let cineSaved = null;
  let loadToken = 0;                // guards stale async loads
  let fitRadius = 1, fitCentre = new T.Vector3();
  let disposed = false, visible = true, userMoved = false;
  let labelsOn = false;

  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();

  /* ── build / rebuild ──────────────────────────────────────── */
  function clearModel() {
    if (!built) return;
    root.remove(built.group);
    built.group.traverse(o => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      const m = o.material;
      (Array.isArray(m) ? m : [m]).forEach(x => x?.dispose?.());
    });
    built = null; components = []; byId = new Map(); selected = null;
  }

  /** Load a car manifest. Returns the token so callers can detect staleness. */
  function setCar(car) {
    const token = ++loadToken;
    opts.onLoading?.(true, 0);
    clearModel();
    if (mats) { Object.values(mats).forEach(m => m.dispose?.()); mats = null; }

    // geometry is authored, not fetched, so this resolves on the next frame;
    // the token check still runs so a later selection always wins.
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        if (token !== loadToken || disposed) return resolve(false);
        manifest = car;
        mats = makeMaterials();
        built = buildByLayout(car.layout, mats);
        root.add(built.group);

        // Each component owns its materials so highlighting one cannot tint
        // every other part that happened to share a material instance.
        for (const spec of car.components) {
          const obj = built.parts.get(spec.id);
          if (!obj) continue;
          const meshes = [];
          obj.traverse(o => {
            if (!o.isMesh) return;
            o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
            o.userData.componentId = spec.id;
            meshes.push(o);
          });
          components.push({
            id: spec.id, obj, meshes,
            base: obj.position.clone(),
            offset: new T.Vector3(...spec.offset).multiplyScalar(SPREAD),
          });
        }
        components.forEach(c => byId.set(c.id, c));

        // Frame from the fully exploded bounds so nothing leaves the canvas at
        // any explosion amount, then put the state back exactly as it was.
        // Frame against a mostly-exploded pose rather than the full 100%: it keeps
        // the assembled engine large on screen while still holding the spread
        // layout in view at the amounts people actually sit at.
        const keep = progress;
        applyProgress(1, true);
        const box = new T.Box3().setFromObject(built.group);
        fitRadius = box.getBoundingSphere(new T.Sphere()).radius;
        fitCentre = box.getCenter(new T.Vector3());
        applyProgress(keep, true);

        const b0 = new T.Box3().setFromObject(built.group);
        ground.position.y = b0.min.y - 0.012;

        canvas.setAttribute('aria-label', opts.canvasLabel?.(car) ?? 'Interactive 3D engine model');
        resetView(false);
        opts.onLoading?.(false, 1);
        opts.onReady?.(car);
        resolve(true);
      });
    });
  }

  /* ── explosion ────────────────────────────────────────────── */
  function applyProgress(p, immediate = false) {
    progress = Math.min(1, Math.max(0, p));
    const e = easeInOut(progress);
    for (const c of components) {
      c.obj.position.set(
        c.base.x + c.offset.x * e,
        c.base.y + c.offset.y * e,
        c.base.z + c.offset.z * e,
      );
    }
    if (!immediate) opts.onProgress?.(progress);
  }

  /** Direct scrubbing: track the input exactly, no easing in time. */
  function scrubTo(p) { animating = false; applyProgress(p); }

  /** Preset / step change: ease over time. */
  function animateTo(p, ms = 700) {
    if (REDUCED()) { scrubTo(p); return; }
    animFrom = progress; targetProgress = Math.min(1, Math.max(0, p));
    animStart = performance.now(); animDur = Math.max(1, ms); animating = true;
  }

  /* ── selection ────────────────────────────────────────────── */
  function setSelected(id, { focus = false } = {}) {
    selected = id || null;
    for (const c of components) {
      const on = c.id === selected;
      for (const m of c.meshes) {
        const list = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of list) {
          if (!mat) continue;
          if (mat.emissive) {
            mat.emissive.setHex(on ? 0x16407e : 0x000000);
            mat.emissiveIntensity = on ? 0.42 : 0;
          }
        }
      }
    }
    if (focus && selected) focusComponent(selected);
    opts.onSelect?.(selected);
  }

  function focusComponent(id) {
    const c = byId.get(id);
    if (!c) return;
    const box = new T.Box3().setFromObject(c.obj);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new T.Sphere());
    // Move the orbit target onto the part and pull in just enough to read it,
    // keeping the viewing direction the user already chose.
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = Math.max(sphere.radius * 3.4, 0.42);
    glideCamera(sphere.center.clone().addScaledVector(dir, dist), sphere.center.clone());
  }

  /* ── camera ───────────────────────────────────────────────── */
  let glide = null;
  function glideCamera(toPos, toTarget, ms = 650) {
    if (REDUCED()) {
      camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); return;
    }
    glide = {
      fromPos: camera.position.clone(), toPos: toPos.clone(),
      fromTgt: controls.target.clone(), toTgt: toTarget.clone(),
      start: performance.now(), dur: ms,
    };
  }

  function defaultCamera() {
    const aspect = Math.max(0.5, host.clientWidth / Math.max(1, host.clientHeight));
    const widen = aspect < 1 ? 1.5 : aspect < 1.4 ? 1.22 : 1;
    const dist = (fitRadius / Math.sin((camera.fov * Math.PI) / 180 / 2)) * 0.70 * widen;
    return {
      pos: new T.Vector3(fitCentre.x + dist * 0.62, fitCentre.y + dist * 0.4, fitCentre.z + dist * 0.68),
      tgt: fitCentre.clone(),
    };
  }

  function resetView(animate = true) {
    userMoved = false;
    const d = defaultCamera();
    if (animate) glideCamera(d.pos, d.tgt);
    else { camera.position.copy(d.pos); controls.target.copy(d.tgt); controls.update(); }
  }

  /* ── cinematic ────────────────────────────────────────────── */
  function enterCinematic() {
    if (cinematic || !built) return;
    cineSaved = {
      pos: camera.position.clone(), tgt: controls.target.clone(),
      selected, autoRotate, progress,
    };
    setSelected(null);
    cinematic = true; cineT = 0; cinePaused = REDUCED();
    controls.enabled = false;
    scene.background = new T.Color(0xfbfbfc);
    renderer.setClearColor(0xfbfbfc, 1);
    opts.onCinematic?.(true);
  }

  function exitCinematic() {
    if (!cinematic) return;
    cinematic = false;
    controls.enabled = true;
    scene.background = new T.Color(0xf6f7f9);
    renderer.setClearColor(0xf6f7f9, 1);
    if (cineSaved) {
      applyProgress(cineSaved.progress);
      autoRotate = cineSaved.autoRotate;
      glideCamera(cineSaved.pos, cineSaved.tgt, 600);
      setSelected(cineSaved.selected);
      cineSaved = null;
    }
    opts.onCinematic?.(false);
  }

  const CINE_SECONDS = 11;
  function cinematicFrame(dt) {
    if (!cinePaused) cineT = (cineT + dt / CINE_SECONDS) % 1;
    const a = cineT * Math.PI * 2;
    // A slow arc that never crosses the poles and never cuts: one continuous
    // orbit with a gentle rise and a breathing dolly.
    const aspect = Math.max(0.5, host.clientWidth / Math.max(1, host.clientHeight));
    const widen = aspect < 1 ? 1.62 : aspect < 1.4 ? 1.3 : 1.04;
    const dist = (fitRadius / Math.sin((camera.fov * Math.PI) / 180 / 2)) * 0.9 * widen
      * (1 + Math.sin(a) * 0.045);
    const yaw = 0.7 + Math.sin(a) * 0.55;
    const pitch = 0.33 + Math.sin(a * 2) * 0.1;
    camera.position.set(
      fitCentre.x + Math.cos(yaw) * Math.cos(pitch) * dist,
      fitCentre.y + Math.sin(pitch) * dist,
      fitCentre.z + Math.sin(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(fitCentre);
    opts.onCinematicTime?.(cineT);
  }

  /* ── pointer picking ──────────────────────────────────────── */
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (cinematic || !downAt || !built) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return;                       // that was an orbit, not a click
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(built.group, true)[0];
    if (!hit) return;
    let o = hit.object, id = null;
    while (o && !id) { id = o.userData.componentId; o = o.parent; }
    if (id) setSelected(id === selected ? null : id);
  });

  canvas.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetView(); }
  });

  /* ── loop ─────────────────────────────────────────────────── */
  let last = performance.now();
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
      if (t >= 1) glide = null;
    }
    if (cinematic) cinematicFrame(dt);
    else {
      if (autoRotate && !glide && !REDUCED()) {
        const v = camera.position.clone().sub(controls.target);
        v.applyAxisAngle(new T.Vector3(0, 1, 0), dt * 0.22);
        camera.position.copy(controls.target).add(v);
      }
      controls.update();
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  /* ── sizing ───────────────────────────────────────────────── */
  let lastW = 0, lastH = 0;
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // The canvas is 0×0 for the first layout pass, so the framing computed at
    // load time is against the wrong aspect. Re-frame until the user orbits.
    if (built && !userMoved && !cinematic) resetView(false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const visHandler = () => { visible = !document.hidden; last = performance.now(); };
  document.addEventListener('visibilitychange', visHandler);

  const lostHandler = e => { e.preventDefault(); opts.onError?.('context-lost'); };
  canvas.addEventListener('webglcontextlost', lostHandler);
  canvas.addEventListener('webglcontextrestored', () => opts.onError?.(null));

  /* ── public surface ───────────────────────────────────────── */
  return {
    setCar,
    scrubTo, animateTo,
    get progress() { return progress; },
    setSelected, focusComponent,
    get selected() { return selected; },
    resetView,
    setAutoRotate(v) { autoRotate = !!v; },
    get autoRotate() { return autoRotate; },
    setLabels(v) { labelsOn = !!v; opts.onLabels?.(labelsOn); },
    get labels() { return labelsOn; },
    enterCinematic, exitCinematic,
    get cinematic() { return cinematic; },
    toggleCinePause() { cinePaused = !cinePaused; return cinePaused; },
    get cinePaused() { return cinePaused; },
    setCineTime(t) { cineT = Math.min(1, Math.max(0, t)); },
    get cineTime() { return cineT; },
    componentIds() { return components.map(c => c.id); },
    debugFraming() {
      return {
        fitRadius: +fitRadius.toFixed(4),
        fitCentre: fitCentre.toArray().map(n => +n.toFixed(3)),
        camPos: camera.position.toArray().map(n => +n.toFixed(3)),
        target: controls.target.toArray().map(n => +n.toFixed(3)),
        dist: +camera.position.distanceTo(controls.target).toFixed(3),
        aspect: +camera.aspect.toFixed(3),
        hostW: host.clientWidth, hostH: host.clientHeight,
        userMoved,
      };
    },
    /** Exact local poses, for drift checks. */
    componentPoses() {
      return components.map(c => ({ id: c.id, p: c.obj.position.toArray().map(n => +n.toFixed(9)) }));
    },
    /** Screen-space anchor per component, for the HTML label layer. */
    componentScreenPositions() {
      if (!built) return [];
      const w = host.clientWidth, h = host.clientHeight;
      const v = new T.Vector3();
      const camDir = new T.Vector3();
      camera.getWorldDirection(camDir);
      return components.map(c => {
        const box = new T.Box3().setFromObject(c.obj);
        box.getCenter(v);
        const world = v.clone();
        v.project(camera);
        const behind = world.sub(camera.position).dot(camDir) <= 0;
        return {
          id: c.id,
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h,
          visible: !behind && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05,
        };
      });
    },
    dispose() {
      disposed = true;
      ro.disconnect();
      document.removeEventListener('visibilitychange', visHandler);
      canvas.removeEventListener('webglcontextlost', lostHandler);
      clearModel();
      if (mats) Object.values(mats).forEach(m => m.dispose?.());
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

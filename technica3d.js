/* ==========================================================================
   PETROLHEAD TECHNICA — 3D gearbox scene
   Ported to vanilla ES modules from the transmission-lab study project.
   Educational geometry: shapes, spacing and motion are illustrative.
   ========================================================================== */
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const mint = '#74edc9', amber = '#f6bd68', silver = '#aebdc4';

export function createGearbox(host, onSelect) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor('#10191d', 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label',
    'Interactive 3D DSG transmission. Drag to rotate, scroll or pinch to zoom. Select parts in the component list for keyboard access.');
  host.appendChild(renderer.domElement);

  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  if (room.dispose) room.dispose();

  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 7;
  controls.maxDistance = 32;
  controls.maxPolarAngle = Math.PI * 0.93;
  const home = () => {
    camera.position.set(10.5, 7.6, 11.8);
    controls.target.set(-0.3, -0.7, 0);
    controls.update();
  };
  home();

  scene.add(new T.HemisphereLight('#d4e8ed', '#233f4a', 2.2));
  const key = new T.DirectionalLight('#fff5dc', 4); key.position.set(-3, 9, 6); scene.add(key);
  const rim = new T.DirectionalLight('#62c6df', 3); rim.position.set(4, 3, -6); scene.add(rim);

  const assembly = new T.Group(); scene.add(assembly);
  const parts = [], spinning = [], labels = [], pickables = [], materials = [];

  let state = {
    car: 'r32', gear: 1, mode: 'D', playing: true, rpm: 1800, speed: 0.35, explode: 0,
    housing: false, labels: false, flow: true, selected: 'overview', isolated: false,
    camera: 0, autoRotate: false, ratio: 1, final: 1
  };

  function part(id, base, offset = [0, 0, 0]) {
    const group = new T.Group();
    group.position.fromArray(base);
    group.userData.part = id;
    assembly.add(group);
    parts.push({ group, base: new T.Vector3(...base), offset: new T.Vector3(...offset), id });
    return group;
  }
  function material(id, color = silver, gear) {
    const mat = new T.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.28 });
    materials.push({ mat, id, gear, color: new T.Color(color) });
    return mat;
  }
  function mesh(g, geometry, mat, position = [0, 0, 0]) {
    const obj = new T.Mesh(geometry, mat);
    obj.position.fromArray(position);
    obj.userData.part = g.userData.part;
    g.add(obj);
    pickables.push(obj);
    return obj;
  }
  function cylinder(g, r, len, x = 0, color = silver, inner = 0) {
    let geo;
    if (inner) {
      const s = new T.Shape();
      s.absarc(0, 0, r, 0, Math.PI * 2, false);
      const hole = new T.Path();
      hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
      s.holes.push(hole);
      geo = new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 48 });
      geo.translate(0, 0, -len / 2);
      geo.rotateY(Math.PI / 2);
    } else {
      geo = new T.CylinderGeometry(r, r, len, 48);
      geo.rotateZ(Math.PI / 2);
    }
    return mesh(g, geo, material(g.userData.part, color), [x, 0, 0]);
  }
  function gear(g, x, r, teeth, number, channel = 'input', factor = 1) {
    const s = new T.Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const a = i / (teeth * 4) * Math.PI * 2;
      const rr = (i % 4 === 1 || i % 4 === 2) ? r : r - 0.09;
      const y = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (i === 0) s.moveTo(y, z); else s.lineTo(y, z);
    }
    s.closePath();
    const hole = new T.Path();
    hole.absarc(0, 0, 0.14, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const geo = new T.ExtrudeGeometry(s, {
      depth: 0.22, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.015, bevelSegments: 1, steps: 1
    });
    geo.translate(0, 0, -0.11);
    geo.rotateY(Math.PI / 2);
    const obj = mesh(g, geo, material(g.userData.part, silver, number), [x, 0, 0]);
    spinning.push({ mesh: obj, channel, gear: number, factor });
    cylinder(g, r * 0.40, 0.32, x, '#687c88');
    const ringGeo = new T.TorusGeometry(r * 0.72, 0.013, 6, 48);
    ringGeo.rotateY(Math.PI / 2);
    for (const xx of [-0.13, 0.13]) mesh(g, ringGeo, material(g.userData.part, '#dae5e9'), [x + xx, 0, 0]);
    return obj;
  }
  function label(g, text, pos, color = '#d3e3e6') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(8,18,23,0.88)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, 512, 80, 14); ctx.fill(); }
    else ctx.fillRect(0, 0, 512, 80);
    ctx.font = '500 30px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 51);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const spr = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    spr.position.fromArray(pos);
    spr.scale.set(2.6, 0.406, 1);
    spr.renderOrder = 10;
    g.add(spr);
    labels.push(spr);
  }

  // ---- assembly -------------------------------------------------------
  const fly = part('flywheel', [-4.15, 0, 0], [-1.3, 0, 0]);
  gear(fly, 0, 1.1, 54, undefined, 'engine');
  cylinder(fly, 0.7, 0.28);
  cylinder(fly, 0.23, 0.7, -0.4);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const bolt = cylinder(fly, 0.065, 0.08, -0.2, '#26333c');
    bolt.position.y = Math.cos(a) * 0.48;
    bolt.position.z = Math.sin(a) * 0.48;
  }
  label(fly, 'Dual-mass flywheel', [0, 1.4, 0]);

  const k1 = part('k1', [-3.25, 0, 0], [-0.6, 0.4, 0]);
  for (let i = 0; i < 9; i++) {
    const plate = cylinder(k1, 1.0, 0.052, i * 0.075 - 0.28, i % 2 === 0 ? '#8e7150' : '#c3d2d7', 0.7);
    spinning.push({ mesh: plate, channel: i % 2 === 0 ? 'k1' : 'engine', factor: 1 });
  }
  cylinder(k1, 1.025, 0.06, -0.36, '#566873', 0.69);
  label(k1, 'K1 · odd gears + R', [0, 1.65, 0], mint);

  const k2 = part('k2', [-3.22, 0, 0], [-0.4, -0.6, 1.55]);
  for (let i = 0; i < 7; i++) {
    const p = cylinder(k2, 0.64, 0.058, i * 0.075 - 0.23, i % 2 === 0 ? '#8b714d' : '#d8dfe1', 0.3);
    spinning.push({ mesh: p, channel: i % 2 === 0 ? 'k2' : 'engine', factor: 1 });
  }
  label(k2, 'K2 · even gears', [0, -1.15, 0], amber);

  const input1 = part('input1', [0, 0, 0], [0, 0.8, 0]);
  const shaft1 = cylinder(input1, 0.16, 6.2, -0.05, '#adc5ce');
  spinning.push({ mesh: shaft1, channel: 'k1', factor: 1 });
  gear(input1, 0.5, 0.48, 24, 1, 'k1');
  gear(input1, 1.55, 0.68, 34, 3, 'k1');
  gear(input1, 2.55, 0.84, 42, 5, 'k1');
  label(input1, 'Input 1 · inner shaft', [1.9, 1.2, 0], mint);

  const input2 = part('input2', [0, 0, 0], [0, 1.65, 0]);
  cylinder(input2, 0.24, 2.75, -1.6, '#667f8a', 0.178);
  gear(input2, -1.8, 0.81, 40, 4, 'k2');
  gear(input2, -0.7, 0.58, 28, 2, 'k2');
  label(input2, 'Input 2 · hollow shaft', [-1.2, 0.85, 0], amber);

  const out1 = part('output1', [0, -0.48, 1.35], [0, -0.35, 1.65]);
  cylinder(out1, 0.15, 6.4);
  gear(out1, -1.8, 0.62, 30, 4, 'out', -1);
  gear(out1, -0.7, 0.85, 42, 2, 'out', -1);
  gear(out1, 0.5, 0.95, 48, 1, 'out', -1);
  gear(out1, 1.55, 0.75, 38, 3, 'out', -1);
  gear(out1, -2.75, 0.43, 22, undefined, 'out', -1);
  for (const x of [-1.25, 1.04]) cylinder(out1, 0.38, 0.20, x, '#c5a36b');
  label(out1, 'Output 1 · gears 1–4', [0.8, -1.15, 0.4]);

  const out2 = part('output2', [0, -0.6, -1.3], [0, -0.25, -1.85]);
  cylinder(out2, 0.15, 6.4);
  gear(out2, -1.8, 0.62, 30, 6, 'out', -1);
  gear(out2, 2.55, 0.59, 30, 5, 'out', -1);
  gear(out2, 0.5, 0.63, 32, -1, 'reverseGear', 1);
  gear(out2, -2.75, 0.43, 22, undefined, 'out', -1);
  cylinder(out2, 0.35, 0.2, 1.5, '#c5a36b');
  label(out2, 'Output 2 · gears 5, 6, R', [1, -0.8, -0.5]);

  const rev = part('reverse', [0.5, 0.2, -0.97], [0, 1, -1.5]);
  cylinder(rev, 0.11, 0.65);
  gear(rev, 0, 0.39, 20, -1, 'reverse', -1);
  label(rev, 'Reverse idler', [0, 0.85, 0]);

  const diff = part('differential', [-2.75, -2.03, 0], [0, -1.1, 0]);
  gear(diff, 0, 1.0, 50, undefined, 'final', 1);
  cylinder(diff, 0.6, 0.9, 0.45, '#8598a1');
  const axle = cylinder(diff, 0.095, 3.2, 0.8);
  spinning.push({ mesh: axle, channel: 'final', factor: 1 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const obj = mesh(diff, new T.BoxGeometry(0.75, 0.17, 0.18), material('differential', '#4c6570'),
      [0.5, Math.cos(a) * 0.5, Math.sin(a) * 0.5]);
    obj.rotation.x = a;
  }
  label(diff, 'Front differential', [0, -1.25, 0]);

  const mech = part('mechatronics', [0, -2.45, 0], [0, -2.0, 0]);
  mesh(mech, new T.BoxGeometry(4.7, 0.28, 1.45), material('mechatronics', '#354b56'));
  mesh(mech, new T.BoxGeometry(2.2, 0.11, 1.15), material('mechatronics', '#3c6a61'), [-0.8, 0.21, 0]);
  for (let i = 0; i < 8; i++) {
    const sol = cylinder(mech, 0.12, 0.4, 0, '#ccb076');
    sol.position.set(0.7 + i % 4 * 0.37, 0.3, (Math.floor(i / 4) - 0.5) * 0.62);
  }
  for (let i = 0; i < 5; i++) {
    mesh(mech, new T.BoxGeometry(4.2, 0.035, 0.025), material('mechatronics', '#8a9fa5'), [0, -0.16, -0.5 + i * 0.24]);
  }
  label(mech, 'Mechatronics · control unit', [0, -0.6, 0]);

  const awd = part('awd', [-2.6, -2.03, -1.6], [0, -0.7, -1.6]);
  mesh(awd, new T.BoxGeometry(0.9, 0.75, 0.85), material('awd', '#71828b'));
  const prop = cylinder(awd, 0.09, 2.2, 0, '#89969d');
  prop.geometry.rotateY(Math.PI / 2);
  prop.position.z = -1.2;
  spinning.push({ mesh: prop, channel: 'final', factor: 1 });
  label(awd, 'Bevel box → rear axle', [0, 0.8, -1.3]);

  const casing = part('housing', [-0.7, -0.45, 0], [0, 2.8, -1.8]);
  const casingGeo = new T.BoxGeometry(7.4, 3.35, 3.6);
  const caseMat = new T.MeshPhysicalMaterial({
    color: '#88a8b8', metalness: 0.4, roughness: 0.24, transparent: true,
    opacity: 0.10, depthWrite: false, side: T.DoubleSide
  });
  mesh(casing, casingGeo, caseMat);
  const edges = new T.LineSegments(new T.EdgesGeometry(casingGeo),
    new T.LineBasicMaterial({ color: '#80a7b7', transparent: true, opacity: 0.4 }));
  casing.add(edges);
  for (let i = 0; i < 9; i++) {
    mesh(casing, new T.BoxGeometry(0.05, 3.42, 3.68),
      new T.MeshStandardMaterial({ color: '#8199a5', transparent: true, opacity: 0.08, depthWrite: false }),
      [-3.3 + i * 0.82, 0, 0]);
  }
  label(casing, 'Housing envelope · simplified', [0, 2.05, 0]);

  const grid = new T.GridHelper(30, 40, '#2b4147', '#203036');
  grid.position.y = -4.9;
  grid.material.transparent = true;
  grid.material.opacity = 0.32;
  scene.add(grid);

  // ---- torque path overlay -------------------------------------------
  const pathGroup = new T.Group(); scene.add(pathGroup);
  const beads = Array.from({ length: 12 }, () => {
    const b = new T.Mesh(new T.SphereGeometry(0.04, 8, 8), new T.MeshBasicMaterial({ color: mint }));
    pathGroup.add(b);
    return b;
  });
  let curve = null, path = null;

  function updatePath() {
    if (path) { pathGroup.remove(path); path.geometry.dispose(); path.material.dispose(); }
    const g = state.mode === 'R' ? -1 : state.gear;
    const x = g === 1 || g === -1 ? 0.5 : g === 2 ? -0.7 : g === 3 ? 1.55 : g === 5 ? 2.55 : -1.8;
    const o = (g === 5 || g === 6 || g === -1) ? out2 : out1;
    const p = [new T.Vector3(-4.7, 0, 0), k1.position.clone(), new T.Vector3(x, 0, 0)];
    if (g === -1) p.push(rev.position.clone());
    p.push(new T.Vector3(x, o.position.y, o.position.z),
      new T.Vector3(-2.75, o.position.y, o.position.z),
      diff.position.clone(),
      diff.position.clone().add(new T.Vector3(1.6, 0, 0)));
    curve = new T.CatmullRomCurve3(p, false, 'catmullrom', 0.1);
    path = new T.Line(
      new T.BufferGeometry().setFromPoints(curve.getPoints(100)),
      new T.LineBasicMaterial({ color: g % 2 === 0 ? amber : mint, transparent: true, opacity: 0.55, depthTest: false })
    );
    path.renderOrder = 4;
    pathGroup.add(path);
    beads.forEach(b => b.material.color.set(g % 2 === 0 ? amber : mint));
  }

  // ---- state ----------------------------------------------------------
  let lastCamera = 0;
  function update(next) {
    state = next;
    controls.autoRotate = state.autoRotate;
    controls.autoRotateSpeed = 0.8;
    if (lastCamera !== state.camera) { home(); lastCamera = state.camera; }
    parts.forEach(p => {
      p.group.position.copy(p.base).addScaledVector(p.offset, state.explode);
      p.group.visible =
        (!state.isolated || state.selected === 'overview' || state.selected === p.id) &&
        (p.id !== 'awd' || state.car === 'r32') &&
        (p.id !== 'housing' || state.housing);
    });
    labels.forEach(l => (l.visible = state.labels));
    const active = state.mode === 'R' ? -1 : state.gear;
    const engaged = state.mode === 'D' || state.mode === 'R';
    materials.forEach(({ mat, id, gear: gn, color }) => {
      const chosen = state.selected === id;
      const powered = engaged && state.flow && (
        id === 'flywheel' || id === 'differential' || id === 'awd' ||
        id === (active % 2 !== 0 ? 'k1' : 'k2') ||
        id === (active % 2 !== 0 ? 'input1' : 'input2') ||
        (gn !== undefined && (gn === active ||
          (id === 'input2' && gn === 4 && active === 6) ||
          (id === 'input1' && gn === 1 && active === -1)))
      );
      mat.color.copy(color);
      mat.emissive.set(chosen ? '#277bc7' : powered ? (active % 2 === 0 ? amber : mint) : '#000000');
      mat.emissiveIntensity = chosen ? 0.5 : powered ? 0.15 : 0;
    });
    pathGroup.visible = state.flow && engaged && state.explode < 0.02 && !state.isolated;
    updatePath();
  }

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(h, 1);
    camera.fov = w < h ? 50 : 36;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  // ---- picking --------------------------------------------------------
  const raycaster = new T.Raycaster(), pointer = new T.Vector2();
  let down = [0, 0];
  const onDown = e => { down = [e.clientX, e.clientY]; };
  const onUp = e => {
    if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables).find(h => {
      let o = h.object;
      while (o) { if (!o.visible) return false; o = o.parent; }
      return h.object.userData.part !== 'housing';
    });
    if (hit) onSelect(hit.object.userData.part);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // ---- animation ------------------------------------------------------
  let frame = 0, previous = 0, elapsed = 0;
  function animate(time) {
    const dt = Math.min((time - previous) / 1000, 0.04);
    previous = time;
    if (state.playing) {
      elapsed += dt * state.speed;
      // real relative speeds: the input side turns at engine rpm, the output
      // side at rpm / gear ratio, the differential at rpm / (ratio × final).
      const engaged = state.mode === 'D' || state.mode === 'R';
      const active = state.mode === 'R' ? -1 : state.gear;
      const base = (state.rpm / 60) * Math.PI * 2 * dt * state.speed * 0.11;
      const outRate = base / (state.ratio || 1);
      const finalRate = outRate / (state.final || 1);
      spinning.forEach(s => {
        let r = 0;
        if (s.channel === 'engine') r = base;
        else if (s.channel === 'k1' || s.channel === 'k2') {
          r = engaged ? ((active % 2 !== 0) === (s.channel === 'k1') ? base : base * 0.62) : 0;
        } else if (s.channel === 'reverse' || s.channel === 'reverseGear') {
          r = engaged && active === -1 ? outRate : 0;
        } else if (s.channel === 'out') r = engaged ? outRate * (active === -1 ? -1 : 1) : 0;
        else if (s.channel === 'final') r = engaged ? finalRate * (active === -1 ? -1 : 1) : 0;
        if (s.mesh === prop) s.mesh.rotateZ(r * s.factor);
        else s.mesh.rotation.x += r * s.factor;
      });
    }
    if (curve) beads.forEach((b, i) => b.position.copy(curve.getPointAt((elapsed * 0.19 + i / beads.length) % 1)));
    controls.update();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  update(state);
  frame = requestAnimationFrame(animate);

  return {
    update,
    zoom: factor => { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

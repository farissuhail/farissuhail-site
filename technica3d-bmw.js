/* ==========================================================================
   PETROLHEAD TECHNICA — ZF 8HP scene (BMW X4 F26)
   Ported to vanilla ES modules from the transmission-lab study project.
   Anatomy demonstration: component principles, not factory dimensions.
   ========================================================================== */
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { appliedBmwElements, bmwRatios } from './technica-bmw-data.js';

const mint = '#83bfff', amber = '#f6bd68', silver = '#aebdc4';

export function createBmwGearbox(host, onSelect) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor('#10191d', 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label',
    'Interactive 3D BMW ZF 8HP automatic transmission. Drag to rotate, scroll or pinch to zoom. Select parts in the component list for keyboard access.');
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
    camera.position.set(10, 7.8, 14.5);
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
    car: 'bmw', gear: 1, mode: 'D', playing: true, rpm: 1800, speed: 0.35, explode: 0,
    housing: false, labels: false, flow: true, selected: 'overview', isolated: false,
    camera: 0, autoRotate: false
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
  const flex = part('flexplate', [-5.0, 0, 0], [-2.0, 0, 0]);
  gear(flex, 0, 1.0, 52, undefined, 'engine');
  cylinder(flex, 0.2, 0.35, 0, '#738d9c');
  label(flex, 'Engine flexplate', [0, 1.5, 0]);

  const converter = part('converter', [-4.13, 0, 0], [-1.25, 0.4, 0]);
  const converterRim = new T.TorusGeometry(0.98, 0.28, 18, 64, Math.PI * 1.55);
  converterRim.rotateY(Math.PI / 2);
  mesh(converter, converterRim, material('converter', '#9bb6c6'));
  function bladedRotor(parent, x, radius, color, channel) {
    const rotor = new T.Group();
    rotor.userData.part = parent.userData.part;
    rotor.position.x = x;
    parent.add(rotor);
    cylinder(rotor, radius, 0.08, 0, color, radius * 0.62);
    cylinder(rotor, 0.25, 0.16, 0, color);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const fin = mesh(rotor, new T.BoxGeometry(0.16, radius * 0.60, 0.035),
        material(parent.userData.part, color), [0, Math.cos(a) * radius * 0.58, Math.sin(a) * radius * 0.58]);
      fin.rotation.x = a + 0.35;
      fin.rotation.y = 0.3;
    }
    spinning.push({ mesh: rotor, channel, factor: 1 });
    return rotor;
  }
  bladedRotor(converter, -0.22, 1.02, '#98bdcf', 'engine');
  bladedRotor(converter, 0.22, 0.91, '#c5d9df', 'turbine');
  bladedRotor(converter, 0, 0.46, '#b99663', 'stator');
  label(converter, 'Pump · stator · turbine', [0, 1.6, 0], mint);

  const lockup = part('lockup', [-3.42, 0, 0], [-0.85, -0.45, 1.2]);
  for (let i = 0; i < 5; i++) {
    const p = cylinder(lockup, 0.92, 0.045, (i - 2) * 0.065, i % 2 === 0 ? '#c79d63' : '#afbfc5', 0.58);
    spinning.push({ mesh: p, channel: i % 2 === 0 ? 'engine' : 'turbine', factor: 1 });
  }
  label(lockup, 'Converter lock-up', [0, -1.2, 0], amber);

  const pump = part('pump', [-2.9, 0, 0], [-0.6, 0.2, 0]);
  gear(pump, 0, 0.60, 32, undefined, 'engine');
  cylinder(pump, 0.84, 0.10, 0.15, '#768f9d', 0.65);
  label(pump, 'Oil pump', [0, 1.1, 0]);

  const input = part('input', [0.15, 0, 0], [0, 0.65, 0]);
  const inputShaft = cylinder(input, 0.13, 6.7, 0, '#7da7c0');
  spinning.push({ mesh: inputShaft, channel: 'turbine', factor: 1 });
  label(input, 'Turbine input', [-1.3, 0.6, 0], mint);

  const planetary = [];
  function ringGeometry() {
    const shape = new T.Shape();
    shape.absarc(0, 0, 1.22, 0, Math.PI * 2, false);
    const hole = new T.Path();
    for (let i = 0; i <= 72 * 4; i++) {
      const a = -i / (72 * 4) * Math.PI * 2;
      const r = (i % 4 === 1 || i % 4 === 2) ? 1.04 : 1.12;
      if (i === 0) hole.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else hole.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    hole.closePath();
    shape.holes.push(hole);
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.30, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.009, bevelSegments: 1 });
    geo.translate(0, 0, -0.15);
    geo.rotateY(Math.PI / 2);
    return geo;
  }
  for (let n = 0; n < 4; n++) {
    const g = part('planet' + (n + 1), [-1.85 + n * 1.52, 0, 0], [(n - 1.5) * 0.82, n % 2 === 0 ? 0.45 : 0.85, 0]);
    const ring = mesh(g, ringGeometry(), material(g.userData.part, '#879aa8'));
    const sun = gear(g, 0, 0.40, 24, undefined, 'planetSun');
    const carrier = new T.Group();
    carrier.userData.part = g.userData.part;
    g.add(carrier);
    cylinder(carrier, 0.21, 0.11, 0.27, '#d5b67d');
    const planets = [];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      const pivot = new T.Group();
      pivot.position.set(0, Math.cos(a) * 0.72, Math.sin(a) * 0.72);
      pivot.userData.part = g.userData.part;
      carrier.add(pivot);
      const planet = gear(pivot, 0, 0.40, 24, undefined, 'planet');
      planet.rotation.x = a;
      planets.push(planet);
      cylinder(pivot, 0.10, 0.18, 0.29, '#dbc18f');
      const spoke = mesh(carrier, new T.BoxGeometry(0.09, 0.70, 0.10),
        material(g.userData.part, '#b7a078'), [0.27, Math.cos(a) * 0.38, Math.sin(a) * 0.38]);
      spoke.rotation.x = a;
    }
    planetary.push({ sun, ring, carrier, planets });
    label(g, 'P' + (n + 1) + ' · planetary set', [0, 1.56, n % 2 === 0 ? 0 : 0.15]);
  }

  const shiftDefs = [
    ['A', -2.35, 1.04, [-0.55, 1.65, -0.8]],
    ['B', -0.93, 1.06, [-0.2, 1.85, -0.8]],
    ['C', 0.58, 0.99, [0.1, -1.25, 1.55]],
    ['D', 2.10, 0.99, [0.5, -1.25, 1.55]],
    ['E', 3.50, 0.90, [0.9, -0.75, 1.25]]
  ];
  for (const [name, x, r, offset] of shiftDefs) {
    const brake = name === 'A' || name === 'B';
    const id = (brake ? 'brake' : 'clutch') + name;
    const g = part(id, [x, 0, 0], offset);
    for (let i = 0; i < 5; i++) {
      const disc = cylinder(g, r, 0.045, (i - 2) * 0.063, i % 2 === 0 ? '#a98250' : '#bccbd1', r * 0.72);
      if (!brake) spinning.push({ mesh: disc, channel: 'shift', factor: 0.45 });
    }
    if (brake) {
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        const lug = mesh(g, new T.BoxGeometry(0.36, 0.14, 0.15), material(id, '#59717e'),
          [0, Math.cos(a) * r, Math.sin(a) * r]);
        lug.rotation.x = a;
      }
    }
    label(g, (brake ? 'Brake ' : 'Clutch ') + name, [0, brake ? 1.25 : -1.25, 0], brake ? amber : mint);
  }

  const mechatronics = part('mechatronics', [0.4, -1.7, 0], [0, -1.5, 0]);
  mesh(mechatronics, new T.BoxGeometry(5.55, 0.27, 1.70), material('mechatronics', '#30414c'));
  mesh(mechatronics, new T.BoxGeometry(4.85, 0.13, 1.35), material('mechatronics', '#899caa'), [0, 0.20, 0]);
  for (let i = 0; i < 9; i++) {
    const sol = cylinder(mechatronics, 0.13, 0.40, 0, '#c8a674');
    sol.position.set(-1.8 + i * 0.43, 0.36, 0.1);
  }
  for (let i = 0; i < 6; i++) {
    mesh(mechatronics, new T.BoxGeometry(4.7, 0.028, 0.04), material('mechatronics', '#526d7b'), [0, -0.15, -0.63 + i * 0.25]);
  }
  label(mechatronics, 'Mechatronics + oil pan', [0, -0.6, 0]);

  const output = part('output', [3.8, 0, 0], [1.25, 0, 0]);
  const outShaft = cylinder(output, 0.16, 1.6, 0.05, '#c7d9e0');
  spinning.push({ mesh: outShaft, channel: 'output', factor: 1 });
  gear(output, 0.55, 0.46, 32, undefined, 'output');
  label(output, 'Transmission output', [0.3, 0.8, 0], mint);

  const transfer = part('transfer', [4.75, -0.12, 0], [2.1, 0, -0.4]);
  mesh(transfer, new T.BoxGeometry(0.85, 1.1, 1.5), material('transfer', '#738c9d'), [0, 0, 0.38]);
  cylinder(transfer, 0.46, 0.54, 0.50, '#9fb9c8', 0.21);
  const rear = cylinder(transfer, 0.11, 1.6, 0.85, '#b4cbd8');
  spinning.push({ mesh: rear, channel: 'output', factor: 1 });
  const front = cylinder(transfer, 0.11, 2.1, -0.85, '#a1bdd0');
  front.position.set(-0.85, -0.25, 1.36);
  spinning.push({ mesh: front, channel: 'output', factor: 1 });
  cylinder(transfer, 0.26, 0.22, -0.25, '#a8bbc5').position.z = 1.36;
  label(transfer, 'xDrive transfer case', [0, 1.25, 0], mint);
  label(transfer, 'To rear axle', [1.05, 0.48, -0.45]);
  label(transfer, 'To front axle', [-1.0, -0.75, 1.45]);

  const housing = part('housing', [-0.35, 0, 0], [0, 2.5, -1.5]);
  const shellMat = new T.MeshPhysicalMaterial({
    color: '#82a8bf', metalness: 0.32, roughness: 0.28, transparent: true,
    opacity: 0.12, depthWrite: false, side: T.DoubleSide
  });
  const housingGeo = new T.CylinderGeometry(1.31, 1.31, 7.75, 48, 1, true);
  housingGeo.rotateZ(Math.PI / 2);
  mesh(housing, housingGeo, shellMat);
  const bellGeo = new T.CylinderGeometry(1.4, 1.05, 1.5, 48, 1, true);
  bellGeo.rotateZ(Math.PI / 2);
  mesh(housing, bellGeo, shellMat, [-3.75, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const hoop = new T.TorusGeometry(1.32, 0.025, 5, 48);
    hoop.rotateY(Math.PI / 2);
    mesh(housing, hoop, new T.MeshStandardMaterial({ color: '#7699ac', transparent: true, opacity: 0.35, depthWrite: false }), [-3.7 + i * 0.82, 0, 0]);
  }
  label(housing, 'Longitudinal housing · simplified', [0, 1.8, 0]);

  const grid = new T.GridHelper(30, 40, '#293d4d', '#1b2a34');
  grid.position.y = -3.9;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  scene.add(grid);

  // ---- torque path ----------------------------------------------------
  const pathGroup = new T.Group(); scene.add(pathGroup);
  const paths = [
    new T.CatmullRomCurve3([
      new T.Vector3(-5.4, 0, 0), new T.Vector3(-3.1, 0, 0), new T.Vector3(0, 0, 0),
      new T.Vector3(3.8, 0, 0), new T.Vector3(6.15, -0.12, 0)
    ]),
    new T.CatmullRomCurve3([
      new T.Vector3(4.3, -0.12, 0), new T.Vector3(4.7, -0.12, 0.55),
      new T.Vector3(4.45, -0.37, 1.36), new T.Vector3(3.0, -0.37, 1.36)
    ])
  ];
  const beads = [];
  paths.forEach(curve => {
    const line = new T.Line(
      new T.BufferGeometry().setFromPoints(curve.getPoints(80)),
      new T.LineBasicMaterial({ color: mint, transparent: true, opacity: 0.55, depthTest: false })
    );
    line.renderOrder = 4;
    pathGroup.add(line);
    beads.push(Array.from({ length: 8 }, () => {
      const b = new T.Mesh(new T.SphereGeometry(0.038, 8, 8), new T.MeshBasicMaterial({ color: mint, depthTest: false }));
      b.renderOrder = 5;
      pathGroup.add(b);
      return b;
    }));
  });

  // ---- state ----------------------------------------------------------
  let lastCamera = 0;
  function update(next) {
    state = next;
    controls.autoRotate = state.autoRotate;
    controls.autoRotateSpeed = 0.8;
    if (lastCamera !== state.camera) { home(); lastCamera = state.camera; }
    const applied = appliedBmwElements(state.mode, state.gear);
    const engaged = state.mode === 'D' || state.mode === 'R';
    parts.forEach(p => {
      p.group.position.copy(p.base).addScaledVector(p.offset, state.explode);
      p.group.visible = (!state.isolated || state.selected === 'overview' || state.selected === p.id) &&
        (p.id !== 'housing' || state.housing);
    });
    labels.forEach(l => (l.visible = state.labels));
    materials.forEach(({ mat, id, color }) => {
      const chosen = state.selected === id;
      const element = id.startsWith('brake') || id.startsWith('clutch') ? id.slice(-1) : null;
      const active = element !== null && applied.some(e => e === element);
      const power = engaged && state.flow &&
        (active || ['flexplate', 'converter', 'input', 'output', 'transfer'].includes(id));
      mat.color.copy(color);
      mat.emissive.set(chosen ? '#56a9ff' : power ? (id.startsWith('brake') ? amber : mint) : '#000000');
      mat.emissiveIntensity = chosen ? 0.50 : power ? 0.22 : 0;
    });
    pathGroup.visible = state.flow && engaged && state.explode < 0.02 && !state.isolated;
  }

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(h, 1);
    camera.fov = w < h ? 52 : 39;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

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

  let frame = 0, previous = 0, elapsed = 0;
  function animate(time) {
    const dt = Math.min((time - previous) / 1000, 0.04);
    previous = time;
    if (state.playing) {
      elapsed += dt * state.speed;
      const rate = state.rpm / 1800 * dt * state.speed * 2;
      const engaged = state.mode === 'D' || state.mode === 'R';
      const turbineRate = engaged ? 0.86 : 0;
      const ratio = bmwRatios[state.mode === 'R' ? 'R' : String(state.gear)] || 1;
      const outputRate = turbineRate / ratio * (state.mode === 'R' ? -1 : 1);
      spinning.forEach(s => {
        let velocity = 0;
        if (s.channel === 'engine') velocity = 1;
        else if (s.channel === 'turbine') velocity = turbineRate;
        else if (s.channel === 'output') velocity = outputRate;
        else if (s.channel === 'shift') velocity = turbineRate;
        s.mesh.rotation.x += rate * velocity * s.factor;
      });
      // Anatomy demonstration only: all four show a locally consistent simple
      // planetary relationship. Ns=24, Nr=72. Carrier = (Ns*sun + Nr*ring)/(Ns+Nr).
      // Compound 8HP member connections are intentionally not represented.
      planetary.forEach((p, i) => {
        const sun = turbineRate * (0.85 + i * 0.06), ring = turbineRate * 0.12;
        const carrier = (sun + 3 * ring) / 4;
        const planetRelative = -(sun - carrier);
        p.sun.rotation.x += rate * sun;
        p.ring.rotation.x += rate * ring;
        p.carrier.rotation.x += rate * carrier;
        p.planets.forEach(planet => (planet.rotation.x += rate * planetRelative));
      });
    }
    paths.forEach((curve, j) => beads[j].forEach((b, i) =>
      b.position.copy(curve.getPointAt((elapsed * 0.15 + i / beads[j].length) % 1))));
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

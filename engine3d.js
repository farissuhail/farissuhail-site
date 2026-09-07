/* ==========================================================================
   PETROLHEAD TECHNICA — procedural four-stroke engine scene
   Ported to vanilla ES modules from the transmission-lab study project.
   Geometry is procedural and illustrative, not a scan or factory CAD model.
   ========================================================================== */
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  cylinderPhase,
  engines,
  pistonPosition,
  strokeAt,
  strokes,
  valveLift,
  mod,
} from './engine-mechanics.js';

export function createEngine(host, initial, onFrame, onCylinder) {
  const config = engines[initial.car];
  let state = initial,
    angle = initial.angle,
    lastSeek = initial.seek;

  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0xf0f1f1, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    `${config.name} four-stroke engine cutaway. Drag or use arrow keys to rotate, scroll to zoom. Cylinder buttons provide keyboard selection.`,
  );
  host.appendChild(renderer.domElement);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 6;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI * 0.88;

  const home = () => {
    camera.position.set(config.cylinders === 6 ? 10 : 8.5, 8.3, 11.5);
    controls.target.set(0, 1.55, 0);
    controls.update();
  };
  home();

  const keyHandler = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    event.preventDefault();
    const orbit = new T.Spherical().setFromVector3(
      camera.position.clone().sub(controls.target),
    );
    const step = 0.12;
    if (event.key === 'ArrowLeft') orbit.theta -= step;
    if (event.key === 'ArrowRight') orbit.theta += step;
    if (event.key === 'ArrowUp') orbit.phi -= step;
    if (event.key === 'ArrowDown') orbit.phi += step;
    orbit.phi = T.MathUtils.clamp(orbit.phi, 0.12, Math.PI * 0.88);
    camera.position
      .copy(controls.target)
      .add(new T.Vector3().setFromSpherical(orbit));
    controls.update();
  };
  renderer.domElement.addEventListener('keydown', keyHandler);

  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  if (room.dispose) room.dispose();

  scene.add(new T.HemisphereLight('#ffffff', '#899ba9', 2.8));
  const key = new T.DirectionalLight('#fff9f1', 4.3);
  key.position.set(-5, 11, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new T.DirectionalLight('#c3d9e8', 2.6);
  rim.position.set(7, 7, -5);
  scene.add(rim);

  const metal = new T.MeshStandardMaterial({ color: '#8e9ca6', metalness: 0.92, roughness: 0.25 });
  const bright = new T.MeshStandardMaterial({ color: '#d5dce1', metalness: 0.92, roughness: 0.17 });
  const dark = new T.MeshStandardMaterial({ color: '#232930', metalness: 0.75, roughness: 0.3 });
  const black = new T.MeshStandardMaterial({ color: '#0d131a', metalness: 0.5, roughness: 0.35 });
  const gold = new T.MeshStandardMaterial({ color: '#a88d60', metalness: 0.85, roughness: 0.29 });
  const red = new T.MeshStandardMaterial({ color: '#ac1230', metalness: 0.45, roughness: 0.26 });

  const objects = [];
  const labels = [];

  function mesh(parent, geo, mat, pos = [0, 0, 0]) {
    const m = new T.Mesh(geo, mat);
    m.position.fromArray(pos);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    objects.push(m);
    return m;
  }
  function box(parent, size, pos, mat = dark) {
    return mesh(parent, new T.BoxGeometry(...size), mat, pos);
  }
  function cylinder(parent, r, h, pos, mat = metal, axis = 'y') {
    const geo = new T.CylinderGeometry(r, r, h, 40);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    return mesh(parent, geo, mat, pos);
  }
  function ring(parent, r, tube, pos, mat = bright, axis = 'y') {
    const geo = new T.TorusGeometry(r, tube, 8, 48);
    if (axis === 'y') geo.rotateX(Math.PI / 2);
    else geo.rotateY(Math.PI / 2);
    return mesh(parent, geo, mat, pos);
  }
  function label(parent, text, pos) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,.94)';
    if (ctx.roundRect) ctx.roundRect(0, 0, 512, 80, 4);
    else ctx.rect(0, 0, 512, 80);
    ctx.fill();
    ctx.fillStyle = '#222d35';
    ctx.font = '500 29px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 51);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(
      new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    );
    sprite.position.fromArray(pos);
    sprite.scale.set(2.25, 0.352, 1);
    sprite.renderOrder = 10;
    parent.add(sprite);
    labels.push(sprite);
    return sprite;
  }

  const engine = new T.Group();
  scene.add(engine);
  const block = new T.Group(),
    head = new T.Group(),
    cams = new T.Group(),
    crank = new T.Group(),
    accessories = new T.Group(),
    timing = new T.Group();
  engine.add(block, head, cams, crank, accessories, timing);

  const spacing = config.cylinders === 6 ? 1.05 : 1.28,
    length = (config.cylinders - 1) * spacing + 1.45;

  box(block, [length, 0.22, 1.65], [0, -0.57, 0]);
  box(block, [length, 0.25, 0.18], [0, 0.52, 0.78]);
  box(block, [length, 0.25, 0.18], [0, 0.52, -0.78]);
  box(block, [length - 0.3, 0.25, 1.42], [0, -0.82, 0], black);
  for (const x of [-length / 2, length / 2]) {
    box(block, [0.18, 1.3, 1.6], [x, 0.1, 0]);
    cylinder(block, 0.29, 0.24, [x, 0, 0], gold, 'x');
  }
  for (let i = 0; i < config.cylinders + 1; i++) {
    const x = -length / 2 + 0.26 + (i * (length - 0.5)) / config.cylinders;
    for (const z of [-0.79, 0.79]) box(block, [0.11, 1.35, 0.12], [x, 0.42, z]);
  }

  const deckShape = new T.Shape();
  deckShape.moveTo(-length / 2, -0.91);
  deckShape.lineTo(length / 2, -0.91);
  deckShape.lineTo(length / 2, 0.91);
  deckShape.lineTo(-length / 2, 0.91);
  deckShape.closePath();
  for (let i = 0; i < config.cylinders; i++) {
    const x = (i - (config.cylinders - 1) / 2) * spacing,
      b = config.bankAngle
        ? ((((i % 2 === 0 ? 1 : -1) * config.bankAngle) / 2) * Math.PI) / 180
        : 0;
    const hole = new T.Path();
    hole.absarc(x, 2.78 * Math.sin(b), config.bore / 160 + 0.035, 0, Math.PI * 2, true);
    deckShape.holes.push(hole);
  }
  const deckGeometry = new T.ExtrudeGeometry(deckShape, {
    depth: 0.16,
    bevelEnabled: false,
    curveSegments: 36,
  });
  deckGeometry.rotateX(Math.PI / 2);
  mesh(head, deckGeometry, metal, [0, 2.94, 0]);
  // Shared head rails preserve a clear view into all combustion chambers.
  for (const z of [-0.91, 0.91]) box(head, [length, 0.26, 0.13], [0, 3.02, z], black);

  const mainShaft = cylinder(crank, 0.14, length + 1, [0, 0, 0], dark, 'x');
  const cylinderParts = [];
  const camObjects = [];

  const springPoints = Array.from({ length: 81 }, (_, j) => {
    const a = (j / 80) * Math.PI * 12;
    return new T.Vector3(Math.cos(a) * 0.1, (j / 80) * 0.4, Math.sin(a) * 0.1);
  });
  const springGeo = new T.TubeGeometry(
    new T.CatmullRomCurve3(springPoints), 80, 0.016, 5, false,
  );

  for (let i = 0; i < config.cylinders; i++) {
    const x = (i - (config.cylinders - 1) / 2) * spacing,
      bank = config.bankAngle
        ? ((((i % 2 === 0 ? 1 : -1) * config.bankAngle) / 2) * Math.PI) / 180
        : 0;
    const root = new T.Group();
    root.position.x = x;
    root.rotation.x = bank;
    root.userData.cylinder = i + 1;
    engine.add(root);

    const radius = config.bore / 160;
    const sleeveGeo = new T.CylinderGeometry(
      radius + 0.065, radius + 0.065, 1.43, 48, 1, true, Math.PI * 0.12, Math.PI * 1.27,
    );
    const liner = new T.Group();
    root.add(liner);
    mesh(liner, sleeveGeo, dark, [0, 1.84, 0]);
    ring(liner, radius + 0.065, 0.046, [0, 2.555, 0], metal);
    ring(liner, radius + 0.065, 0.046, [0, 1.13, 0], black);

    const piston = new T.Group();
    root.add(piston);
    cylinder(piston, radius, 0.3, [0, 0, 0], bright);
    cylinder(piston, radius * 0.9, 0.24, [0, -0.18, 0], metal);
    for (const y of [0.095, 0.025, -0.035]) ring(piston, radius + 0.004, 0.015, [0, y, 0], black);
    cylinder(piston, 0.078, radius * 1.8, [0, 0, 0], gold, 'x');
    const halo = ring(piston, radius + 0.045, 0.024, [0, 0.18, 0], new T.MeshBasicMaterial({ color: '#da173b' }));

    const rod = mesh(root, new T.CylinderGeometry(0.061, 0.085, 1, 12), dark);
    const big = ring(root, 0.18, 0.055, [0, 0, 0], metal, 'x'),
      small = ring(root, 0.104, 0.03, [0, 0, 0], metal, 'x');

    const pin = new T.Group();
    pin.position.x = x;
    crank.add(pin);
    for (const xx of [-0.29, 0.29]) {
      box(pin, [0.12, 0.65, 0.24], [xx, 0.24, 0], dark);
      cylinder(pin, 0.32, 0.11, [xx, -0.22, 0], black, 'x');
    }
    cylinder(pin, 0.14, 0.69, [0, 0.58, 0], gold, 'x');

    const gasMat = new T.MeshStandardMaterial({
      color: strokes[0].color,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      roughness: 0.85,
      emissive: strokes[0].color,
      emissiveIntensity: 0.1,
    });
    const gas = mesh(root, new T.CylinderGeometry(radius * 0.93, radius * 0.93, 1, 32), gasMat);
    gas.castShadow = false;

    const valveRoot = new T.Group();
    root.add(valveRoot);
    const valves = [];
    for (let j = 0; j < 4; j++) {
      const intake = j < 2;
      const group = new T.Group();
      group.position.set(j % 2 === 0 ? -0.19 : 0.19, 2.8, intake ? -0.24 : 0.24);
      valveRoot.add(group);
      cylinder(group, intake ? 0.145 : 0.127, 0.046, [0, 0, 0], bright);
      cylinder(group, 0.027, 0.76, [0, 0.37, 0], metal);
      const spring = mesh(group, springGeo, bright, [0, 0.25, 0]);
      cylinder(group, 0.125, 0.055, [0, 0.66, 0], metal);
      valves.push({ group, intake, spring });
    }
    cylinder(valveRoot, 0.055, 0.37, [0, 2.98, 0], bright);
    cylinder(valveRoot, 0.082, 0.16, [0, 3.19, 0], black);

    const spark = mesh(root, new T.SphereGeometry(0.075, 12, 10), new T.MeshBasicMaterial({ color: '#ffe09d' }), [0, 2.65, 0]);
    spark.castShadow = false;
    label(root, `Cylinder ${i + 1}`, [0, 3.78, 0]);

    cylinderParts.push({ root, piston, rod, big, small, pin, liner, gas, gasMat, valves, valveRoot, spark, halo, bank });
  }

  // Two longitudinal DOHC shafts. Valve motion is idealized; lobes are illustrative.
  for (const z of [-0.62, 0.62]) {
    const shaft = new T.Group();
    shaft.position.set(0, 3.66, z);
    cams.add(shaft);
    cylinder(shaft, 0.085, length + 0.1, [0, 0, 0], metal, 'x');
    for (let i = 0; i < config.cylinders; i++) {
      const x = (i - (config.cylinders - 1) / 2) * spacing;
      for (const dx of [-0.17, 0.17]) {
        const lobe = new T.Group();
        lobe.position.x = x + dx;
        lobe.rotation.x =
          (((z < 0 ? 315 : 45) -
            (config.firingOrder.indexOf(i + 1) * 360) / config.cylinders) *
            Math.PI) / 180;
        shaft.add(lobe);
        cylinder(lobe, 0.145, 0.1, [0, 0.075, 0], dark, 'x');
      }
    }
    camObjects.push(shaft);
  }
  if (initial.car === 'bmw') {
    cylinder(cams, 0.045, length - 0.2, [0, 3.93, -0.74], gold, 'x');
    label(cams, 'Valvetronic · lift control', [0, 4.36, -0.7]);
  }

  const driveX = config.cylinders === 6 ? length / 2 + 0.32 : -length / 2 - 0.32;
  const flywheel = new T.Group();
  flywheel.position.x = length / 2 + 0.58;
  accessories.add(flywheel);
  cylinder(flywheel, 0.91, 0.2, [0, 0, 0], dark, 'x');
  ring(flywheel, 0.86, 0.035, [0.12, 0, 0], red, 'x');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cylinder(flywheel, 0.045, 0.025, [0.13, Math.cos(a) * 0.68, Math.sin(a) * 0.68], gold, 'x');
  }
  const pulley = new T.Group();
  pulley.position.x = driveX;
  accessories.add(pulley);
  cylinder(pulley, 0.44, 0.19, [0, 0, 0], black, 'x');
  ring(pulley, 0.4, 0.038, [0.11, 0, 0], red, 'x');
  for (const z of [-0.62, 0.62]) {
    cylinder(timing, 0.31, 0.105, [driveX, 3.66, z], dark, 'x');
    ring(timing, 0.29, 0.025, [driveX + 0.055, 3.66, z], gold, 'x');
  }
  const chainPoints = [
    new T.Vector3(driveX, 0.12, -0.4),
    new T.Vector3(driveX, 3.7, -0.93),
    new T.Vector3(driveX, 3.99, -0.6),
    new T.Vector3(driveX, 3.99, 0.6),
    new T.Vector3(driveX, 3.7, 0.93),
    new T.Vector3(driveX, 0.12, 0.4),
    new T.Vector3(driveX, -0.45, 0),
  ];
  const chainCurve = new T.CatmullRomCurve3(chainPoints, true, 'catmullrom', 0.1);
  mesh(timing, new T.TubeGeometry(chainCurve, 140, 0.042, 6, true), dark);
  const links = Array.from({ length: 52 }, (_, i) => {
    const m = mesh(timing, new T.SphereGeometry(0.046, 6, 5), metal);
    m.position.copy(chainCurve.getPointAt(i / 52));
    return m;
  });
  label(timing, 'Timing drive · schematic', [driveX, 2.7, -1.17]);
  label(crank, 'Crankshaft', [0.4, -0.73, 0.35]);

  const floor = mesh(
    scene,
    new T.PlaneGeometry(100, 100),
    new T.ShadowMaterial({ color: '#445461', opacity: 0.15 }),
    [0, -1.04, 0],
  );
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;

  let cameraRevision = state.camera,
    lastView = 'cutaway';

  function update(next) {
    state = next;
    if (next.seek !== lastSeek) {
      angle = next.angle;
      lastSeek = next.seek;
    }
    controls.autoRotate = next.autoRotate;
    controls.autoRotateSpeed = 0.8;
    const refocus = cameraRevision !== next.camera || lastView !== next.view;
    if (refocus) {
      home();
      cameraRevision = next.camera;
      lastView = next.view;
    }
    const single = next.view === 'cylinder',
      crankOnly = next.view === 'crankshaft';
    const e = next.view === 'exploded' ? next.explode : 0;
    block.visible = next.block && !single && !crankOnly;
    head.visible = next.block && !single && !crankOnly;
    cams.visible = next.valves && !single && !crankOnly;
    accessories.visible = !single;
    timing.visible = !single && !crankOnly;
    block.position.y = -e * 0.45;
    head.position.y = e * 2.1;
    cams.position.y = e * 2.1;
    floor.position.y = -1.04 - e * 0.45;
    mainShaft.visible = !single;
    cylinderParts.forEach((p, i) => {
      p.root.visible = (!single && !crankOnly) || i === next.selected - 1;
      p.pin.visible = !single || i === next.selected - 1;
      p.valveRoot.visible = next.valves && !crankOnly;
      p.valveRoot.position.y = e * 2.1;
      p.liner.visible = next.block && !crankOnly;
      p.gas.visible = next.combustion && !crankOnly;
      p.halo.visible = i === next.selected - 1;
    });
    labels.forEach((l) => (l.visible = next.labels));
    if (single) {
      controls.target.set((next.selected - 1 - (config.cylinders - 1) / 2) * spacing, 1.55, 0);
      if (refocus) camera.position.copy(controls.target).add(new T.Vector3(5, 3.8, 6));
    } else controls.target.set(0, 1.55 + e * 0.4, 0);
  }

  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(h, 1);
    camera.fov = w < h ? 48 : 36;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const raycaster = new T.Raycaster(),
    pointer = new T.Vector2();
  let down = [0, 0];
  const downHandler = (e) => {
    down = [e.clientX, e.clientY];
  };
  const upHandler = (e) => {
    if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects(objects)) {
      let o = hit.object;
      let n = 0,
        visible = true;
      while (o) {
        visible &&= o.visible;
        if (o.userData.cylinder) n = o.userData.cylinder;
        o = o.parent;
      }
      if (n && visible) {
        onCylinder(n);
        break;
      }
    }
  };
  renderer.domElement.addEventListener('pointerdown', downHandler);
  renderer.domElement.addEventListener('pointerup', upHandler);

  let frame = 0,
    last = 0,
    report = 0;
  const up = new T.Vector3(0, 1, 0);

  function animate(time) {
    const dt = Math.min((time - last) / 1000, 0.04);
    last = time;
    if (state.playing) angle = mod(angle + state.rpm * 6 * state.speed * dt, 720);
    const e = state.view === 'exploded' ? state.explode : 0;
    cylinderParts.forEach((p, i) => {
      const phase = cylinderPhase(state.car, i + 1, angle),
        a = (phase * Math.PI) / 180,
        y = pistonPosition(phase),
        pin = new T.Vector3(0, 0.58 * Math.cos(a), 0.58 * Math.sin(a)),
        wrist = new T.Vector3(0, y, 0);
      p.piston.position.y = y + e * 0.65;
      p.pin.rotation.x = a + p.bank;
      const start = pin.clone();
      start.y += e * 0.65;
      const end = wrist.clone();
      end.y += e * 0.65;
      const delta = end.clone().sub(start);
      p.rod.position.copy(start).add(end).multiplyScalar(0.5);
      p.rod.quaternion.setFromUnitVectors(up, delta.clone().normalize());
      p.rod.scale.y = delta.length();
      p.big.position.copy(start);
      p.small.position.copy(end);
      const top = 2.7 + e * 2.1,
        bottom = y + 0.15 + e * 0.65,
        gasHeight = Math.max(0.02, top - bottom);
      p.gas.scale.y = gasHeight;
      p.gas.position.y = (top + bottom) / 2;
      const stroke = strokeAt(phase);
      p.gasMat.color.set(strokes[stroke].color);
      p.gasMat.emissive.set(strokes[stroke].color);
      p.gasMat.opacity = stroke === 2 ? 0.38 : 0.17;
      p.gasMat.emissiveIntensity = stroke === 2 ? 0.24 : 0.05;
      p.valves.forEach((v) => {
        const lift = valveLift(phase, v.intake) * 0.15;
        v.group.position.y = 2.8 - lift;
        v.spring.scale.y = 1 - lift * 0.8;
      });
      p.spark.position.y = top - 0.06;
      p.spark.visible =
        state.combustion && state.view !== 'crankshaft' && phase >= 355 && phase <= 379;
    });
    camObjects.forEach((c) => (c.rotation.x = (angle * Math.PI) / 360));
    flywheel.rotation.x = (angle * Math.PI) / 180;
    pulley.rotation.x = (angle * Math.PI) / 180;
    links.forEach((l, i) =>
      l.position.copy(chainCurve.getPointAt(mod(i / links.length + (angle / 360) * 0.13, 1))),
    );
    if (time - report > 50) {
      onFrame(angle);
      report = time;
    }
    controls.update();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }

  update(initial);
  frame = requestAnimationFrame(animate);

  return {
    update,
    zoom: (factor) => {
      camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('keydown', keyHandler);
      renderer.domElement.removeEventListener('pointerdown', downHandler);
      renderer.domElement.removeEventListener('pointerup', upHandler);
      const geos = new Set(), mats = new Set(), textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => {
            mats.add(mat);
            if (mat.map) textures.add(mat.map);
          });
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

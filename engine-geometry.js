/* ==========================================================================
   PETROLHEAD TECHNICA — parametric engine geometry kit
   --------------------------------------------------------------------------
   Authored geometry, not factory CAD and not a scan. Every shape here is built
   from lathes, extruded profiles, swept tubes and rounded castings so that each
   engine reads as its own architecture: the VR6's single head over two
   staggered banks, the two inline-fours' different ancillaries, the flat-six's
   opposed banks. Proportions follow each engine's published bore, stroke and
   bank angle; detail shapes are illustrative.

   Everything is returned as named semantic assemblies so the explorer can
   select, highlight and explode them independently. Units are metres.
   ========================================================================== */
import * as T from 'three';

/* ───────────────────────── materials ───────────────────────── */
/* Physically plausible roles rather than one grey plastic: cast and machined
   alloy differ in roughness, black covers stay matte, hoses read as rubber,
   fasteners are lightly plated, radiator fins are bright and thin. */
export function makeMaterials() {
  const m = (opts) => new T.MeshStandardMaterial(opts);
  return {
    castAlloy:    m({ color: 0x8f979e, roughness: 0.74, metalness: 0.55 }),
    castAlloyDark:m({ color: 0x767d84, roughness: 0.82, metalness: 0.58 }),
    machined:     m({ color: 0xc2c8cc, roughness: 0.34, metalness: 0.86 }),
    castIron:     m({ color: 0x4e5357, roughness: 0.88, metalness: 0.4 }),
    blackPlastic: m({ color: 0x1e2024, roughness: 0.58, metalness: 0.05 }),
    blackSatin:   m({ color: 0x303338, roughness: 0.48, metalness: 0.12 }),
    rubber:       m({ color: 0x1b1d20, roughness: 0.93, metalness: 0.02 }),
    plated:       m({ color: 0xb9bfc4, roughness: 0.3,  metalness: 0.9 }),
    fin:          m({ color: 0xc6ced4, roughness: 0.44, metalness: 0.72 }),
    copper:       m({ color: 0xb07a4f, roughness: 0.46, metalness: 0.8 }),
    accent:       m({ color: 0xd4762f, roughness: 0.52, metalness: 0.08 }),
    accentBlue:   m({ color: 0x2f5fa8, roughness: 0.5,  metalness: 0.1 }),
    glassAmber:   m({ color: 0xd8b98a, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.55 }),
    belt:         m({ color: 0x17181b, roughness: 0.95, metalness: 0.0 }),
  };
}

/* ───────────────────────── geometry helpers ───────────────────────── */

/** Rounded casting box. Cheap subdivision-free bevel via a scaled shell. */
export function roundedBox(w, h, d, r = 0.012, seg = 3) {
  const shape = new T.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new T.ExtrudeGeometry(shape, {
    depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r,
    bevelSegments: seg, curveSegments: 8,
  });
  g.translate(0, 0, -(d - r * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/** Lathe a 2-D profile (array of [radius, y]) around Y. */
export function lathe(profile, segments = 40) {
  const pts = profile.map(([r, y]) => new T.Vector2(Math.max(r, 0.0001), y));
  const g = new T.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/** Swept tube through points — hoses, pipes, wiring looms. */
export function sweep(points, radius, radial = 10, tubular = null) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  const segs = tubular ?? Math.max(20, Math.round(curve.getLength() * 90));
  const g = new T.TubeGeometry(curve, segs, radius, radial, false);
  return g;
}

/** Extrude an outline described by [x,y] pairs. */
export function extrude(pointPairs, depth, bevel = 0.006) {
  const shape = new T.Shape();
  pointPairs.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const g = new T.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/* ───────────────────────── small part factories ───────────────────────── */

export function mesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], name) {
  const m = new T.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  parent.add(m);
  return m;
}

/** A ring of hex-ish bolt heads around a flange. */
export function boltRing(parent, mats, count, radius, y, size = 0.009, axis = 'y') {
  const g = new T.CylinderGeometry(size, size * 1.05, size * 1.25, 6);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = axis === 'y'
      ? [Math.cos(a) * radius, y, Math.sin(a) * radius]
      : [y, Math.cos(a) * radius, Math.sin(a) * radius];
    const m = mesh(parent, g, mats.plated, p);
    if (axis !== 'y') m.rotation.z = Math.PI / 2;
  }
}

/** A row of bolt heads between two points — head and cover flanges. */
export function boltRow(parent, mats, count, from, to, size = 0.009, rot = [0, 0, 0]) {
  const g = new T.CylinderGeometry(size, size * 1.05, size * 1.3, 6);
  const a = new T.Vector3(...from), b = new T.Vector3(...to);
  for (let i = 0; i < count; i++) {
    const p = a.clone().lerp(b, count === 1 ? 0.5 : i / (count - 1));
    mesh(parent, g, mats.plated, [p.x, p.y, p.z], rot);
  }
}

/** A hose with moulded clamps at each end. */
export function hose(parent, mats, points, radius, name) {
  const grp = new T.Group();
  if (name) grp.name = name;
  mesh(grp, sweep(points, radius), mats.rubber);
  const clamp = new T.CylinderGeometry(radius * 1.22, radius * 1.22, radius * 0.55, 14);
  [points[0], points[points.length - 1]].forEach((p, idx) => {
    const nb = idx === 0 ? points[1] : points[points.length - 2];
    const dir = new T.Vector3(...p).sub(new T.Vector3(...nb)).normalize();
    const m = mesh(grp, clamp, mats.plated, p);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    m.position.addScaledVector(dir, -radius * 0.9);
  });
  parent.add(grp);
  return grp;
}

/** Finned heat-exchanger core with end tanks — radiators and intercoolers. */
export function finnedCore(parent, mats, { w, h, d, fins = 26, tank = 'side' }, name) {
  const grp = new T.Group();
  if (name) grp.name = name;
  // core body, slightly inset so the fins read as separate plates
  // open core: vertical tubes with corrugated fin strips between them, so the
  // exchanger reads as an exchanger rather than a solid plate
  const tubeGeo = roundedBox(w * 0.012, h * 0.95, d * 0.9, 0.001);
  const finGeo = roundedBox(w * 0.9 / fins * 0.55, h * 0.9, d * 0.86, 0.0008);
  for (let i = 0; i < fins; i++) {
    const x = -w * 0.45 + (w * 0.9 * (i + 0.5)) / fins;
    mesh(grp, tubeGeo, mats.machined, [x, 0, 0]);
    if (i < fins - 1) mesh(grp, finGeo, mats.fin, [x + (w * 0.9) / fins / 2, 0, 0]);
  }
  // perimeter frame
  mesh(grp, roundedBox(w, h * 0.06, d, 0.004), mats.castAlloyDark, [0, h / 2, 0]);
  mesh(grp, roundedBox(w, h * 0.06, d, 0.004), mats.castAlloyDark, [0, -h / 2, 0]);
  const tankGeo = tank === 'side'
    ? roundedBox(w * 0.1, h * 1.04, d * 1.05, 0.01)
    : roundedBox(w * 1.04, h * 0.1, d * 1.05, 0.01);
  if (tank === 'side') {
    mesh(grp, tankGeo, mats.blackPlastic, [-w / 2 - w * 0.04, 0, 0]);
    mesh(grp, tankGeo, mats.blackPlastic, [w / 2 + w * 0.04, 0, 0]);
  } else {
    mesh(grp, tankGeo, mats.blackPlastic, [0, -h / 2 - h * 0.04, 0]);
    mesh(grp, tankGeo, mats.blackPlastic, [0, h / 2 + h * 0.04, 0]);
  }
  parent.add(grp);
  return grp;
}

/** Flat mounting bracket following a polyline. */
export function bracket(parent, mats, pts, thickness = 0.008, width = 0.03) {
  const grp = new T.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new T.Vector3(...pts[i]), b = new T.Vector3(...pts[i + 1]);
    const len = a.distanceTo(b);
    const m = mesh(grp, roundedBox(width, len, thickness, 0.003), mats.castAlloyDark,
      a.clone().lerp(b, 0.5).toArray());
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  parent.add(grp);
  return grp;
}

/** Wiring loom: a dark sheathed bundle with a couple of moulded connectors. */
export function loom(parent, mats, points, radius = 0.011, connectorAt = [0, 1]) {
  const grp = new T.Group();
  mesh(grp, sweep(points, radius, 8), mats.blackSatin);
  const conn = roundedBox(0.034, 0.022, 0.018, 0.004);
  connectorAt.forEach(t => {
    const idx = Math.min(points.length - 1, Math.round(t * (points.length - 1)));
    mesh(grp, conn, mats.accent, points[idx]);
  });
  parent.add(grp);
  return grp;
}

/** Belt-driven accessory: pulley stack plus a lathed body. */
export function accessory(parent, mats, { r = 0.055, len = 0.12, pulley = 0.04 }, pos, rot, name) {
  const grp = new T.Group();
  if (name) grp.name = name;
  mesh(grp, lathe([
    [0, 0], [r * 0.9, 0], [r, 0.012], [r, len - 0.012], [r * 0.88, len], [0, len],
  ], 28), mats.castAlloy, [0, 0, 0]);
  // cooling ribs
  for (let i = 0; i < 7; i++) {
    mesh(grp, new T.TorusGeometry(r * 1.01, 0.0035, 6, 26), mats.castAlloyDark,
      [0, len * 0.18 + i * (len * 0.1), 0], [Math.PI / 2, 0, 0]);
  }
  mesh(grp, lathe([[0, 0], [pulley, 0], [pulley, 0.008], [pulley * 0.8, 0.009],
    [pulley * 0.8, 0.019], [pulley, 0.02], [pulley, 0.028], [0, 0.028]], 26),
    mats.machined, [0, -0.028, 0]);
  grp.position.set(...pos);
  grp.rotation.set(...rot);
  parent.add(grp);
  return grp;
}

/* ───────────────────────── shared sub-assemblies ───────────────────────── */

/** Cast cylinder block with water-jacket ribbing, bosses and a bellhousing face. */
function cylinderBlock(mats, { w, h, d, ribs = 4, deckAngle = 0 }) {
  const g = new T.Group();
  mesh(g, roundedBox(w, h, d, 0.016), mats.castAlloy);
  // side ribbing
  for (let i = 0; i < ribs; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / ribs;
    mesh(g, roundedBox(w / ribs * 0.52, h * 0.78, 0.014, 0.004), mats.castAlloyDark, [x, -h * 0.04, d / 2]);
    mesh(g, roundedBox(w / ribs * 0.52, h * 0.78, 0.014, 0.004), mats.castAlloyDark, [x, -h * 0.04, -d / 2]);
  }
  // deck flange + head bolt bosses
  mesh(g, roundedBox(w * 1.03, 0.018, d * 1.02, 0.005), mats.castAlloy, [0, h / 2, 0]);
  boltRow(g, mats, ribs + 1, [-w / 2 + 0.02, h / 2 + 0.012, d / 2 - 0.022], [w / 2 - 0.02, h / 2 + 0.012, d / 2 - 0.022], 0.0085);
  boltRow(g, mats, ribs + 1, [-w / 2 + 0.02, h / 2 + 0.012, -d / 2 + 0.022], [w / 2 - 0.02, h / 2 + 0.012, -d / 2 + 0.022], 0.0085);
  // bellhousing face
  mesh(g, roundedBox(0.02, h * 1.05, d * 1.06, 0.006), mats.castAlloyDark, [w / 2 + 0.008, 0, 0]);
  if (deckAngle) g.rotation.z = deckAngle;
  return g;
}

/** Crank, rods and pistons — only built when the catalogue exposes internals. */
function crankAssembly(mats, { count, spacing, throwR = 0.045, bankAngle = 0, opposed = false }) {
  const g = new T.Group();
  const span = spacing * (count - 1);
  mesh(g, new T.CylinderGeometry(0.028, 0.028, span + spacing * 1.4, 20), mats.machined, [0, 0, 0], [0, 0, Math.PI / 2]);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    const a = (i / count) * Math.PI * 2;
    // counterweight
    const cw = mesh(g, lathe([[0, 0], [0.062, 0], [0.062, 0.016], [0, 0.016]], 22), mats.castIron, [x, 0, 0], [0, 0, Math.PI / 2]);
    cw.scale.set(1, 1, 0.55);
    // journal + rod + piston
    const jy = Math.cos(a) * throwR, jz = Math.sin(a) * throwR;
    mesh(g, new T.CylinderGeometry(0.019, 0.019, spacing * 0.42, 14), mats.machined, [x, jy, jz], [0, 0, Math.PI / 2]);
    const bank = opposed ? (i % 2 ? -1 : 1) : 1;
    const lean = opposed ? Math.PI / 2 * bank : (i % 2 ? bankAngle : -bankAngle);
    const rodLen = 0.14;
    const dir = new T.Vector3(0, Math.cos(lean), Math.sin(lean));
    const top = new T.Vector3(x, jy, jz).addScaledVector(dir, rodLen);
    const rod = mesh(g, new T.CylinderGeometry(0.011, 0.016, rodLen, 10), mats.machined,
      new T.Vector3(x, jy, jz).lerp(top, 0.5).toArray());
    rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    const pis = mesh(g, lathe([[0, 0], [0.039, 0], [0.039, 0.044], [0.034, 0.05], [0, 0.05]], 24),
      mats.machined, top.toArray());
    pis.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    for (let r = 0; r < 3; r++) {
      const ring = mesh(g, new T.TorusGeometry(0.0395, 0.0022, 6, 24), mats.plated,
        top.clone().addScaledVector(dir, 0.03 + r * 0.005).toArray());
      ring.quaternion.copy(pis.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0)));
    }
  }
  return g;
}

/** DOHC valvetrain: two camshafts with lobes, plus cam caps. */
function valvetrain(mats, { count, spacing, width = 0.1, lobes = 2 }) {
  const g = new T.Group();
  const span = spacing * (count - 1) + spacing;
  [-width / 2, width / 2].forEach(z => {
    mesh(g, new T.CylinderGeometry(0.016, 0.016, span, 18), mats.machined, [0, 0, z], [0, 0, Math.PI / 2]);
    for (let i = 0; i < count * lobes; i++) {
      const x = -span / 2 + 0.03 + (i * (span - 0.06)) / Math.max(1, count * lobes - 1);
      const lobe = mesh(g, lathe([[0, 0], [0.026, 0], [0.026, 0.016], [0, 0.016]], 18), mats.machined, [x, 0, z], [0, 0, Math.PI / 2]);
      lobe.scale.set(1, 1, 0.72);
    }
    // cam caps
    for (let i = 0; i <= count; i++) {
      const x = -span / 2 + (i * span) / count;
      mesh(g, roundedBox(0.026, 0.03, 0.044, 0.005), mats.castAlloy, [x, 0.008, z]);
    }
  });
  return g;
}

/** Turbocharger: compressor and turbine volutes plus centre housing and oil lines. */
function turbocharger(mats, scale = 1) {
  const g = new T.Group();
  const s = scale;
  // centre housing
  mesh(g, lathe([[0, -0.03 * s], [0.03 * s, -0.03 * s], [0.034 * s, -0.01 * s], [0.034 * s, 0.01 * s], [0.03 * s, 0.03 * s], [0, 0.03 * s]], 24), mats.castIron, [0, 0, 0], [Math.PI / 2, 0, 0]);
  // volutes: a torus wrapped by a lathed inlet gives a readable snail
  [[-0.052 * s, mats.castAlloy], [0.052 * s, mats.castIron]].forEach(([z, mat]) => {
    const snail = new T.Group();
    const t = mesh(snail, new T.TorusGeometry(0.055 * s, 0.028 * s, 14, 30, Math.PI * 1.75), mat);
    t.scale.set(1, 1, 0.78);
    mesh(snail, lathe([[0, 0], [0.03 * s, 0], [0.032 * s, 0.03 * s], [0.03 * s, 0.05 * s], [0, 0.05 * s]], 22), mat, [0.08 * s, 0.04 * s, 0], [0, 0, -Math.PI / 2.4]);
    mesh(snail, lathe([[0, 0], [0.036 * s, 0], [0.036 * s, 0.016 * s], [0, 0.016 * s]], 22), mat, [0, 0, 0.012 * s], [Math.PI / 2, 0, 0]);
    snail.position.z = z;
    g.add(snail);
  });
  // oil feed / drain
  mesh(g, sweep([[0.02 * s, 0.03 * s, 0], [0.05 * s, 0.09 * s, 0.02 * s], [0.04 * s, 0.15 * s, 0.05 * s]], 0.006 * s, 8), mats.plated);
  mesh(g, sweep([[0, -0.03 * s, 0], [0.01 * s, -0.09 * s, 0.03 * s]], 0.009 * s, 8), mats.plated);
  // wastegate actuator
  mesh(g, lathe([[0, 0], [0.022 * s, 0], [0.022 * s, 0.03 * s], [0, 0.03 * s]], 20), mats.plated, [0.02 * s, 0.075 * s, -0.07 * s], [0, 0, 0.3]);
  return g;
}

/** Plenum + runners feeding a head face at the given z. */
function intakeManifold(mats, { count, spacing, plenumLen, faceZ, plenumZ, y = 0, runnerR = 0.023 }) {
  const g = new T.Group();
  mesh(g, lathe([[0, 0], [0.05, 0], [0.054, 0.04], [0.054, plenumLen - 0.04], [0.05, plenumLen], [0, plenumLen]], 28),
    mats.blackPlastic, [0, y, plenumZ], [0, 0, Math.PI / 2]);
  const span = spacing * (count - 1);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    mesh(g, sweep([
      [x, y, plenumZ - 0.04],
      [x, y + 0.04, plenumZ - 0.09],
      [x, y + 0.02, faceZ - 0.03],
      [x, y - 0.005, faceZ],
    ], runnerR, 12), mats.blackPlastic);
  }
  // throttle body
  mesh(g, lathe([[0, 0], [0.036, 0], [0.038, 0.012], [0.038, 0.04], [0, 0.04]], 24), mats.blackSatin,
    [-span / 2 - 0.085, y, plenumZ], [0, 0, Math.PI / 2]);
  return g;
}

/** Log exhaust manifold collecting into one outlet. */
function exhaustManifold(mats, { count, spacing, faceZ, outZ, y = 0, r = 0.019 }) {
  const g = new T.Group();
  const span = spacing * (count - 1);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    mesh(g, sweep([
      [x, y, faceZ],
      [x, y + 0.02, faceZ + 0.04],
      [x * 0.45, y + 0.03, outZ - 0.03],
      [0, y + 0.02, outZ],
    ], r, 10), mats.castIron);
  }
  mesh(g, roundedBox(span + 0.06, 0.05, 0.016, 0.005), mats.castIron, [0, y - 0.01, faceZ - 0.004]);
  boltRow(g, mats, count + 1, [-span / 2 - 0.02, y - 0.03, faceZ], [span / 2 + 0.02, y - 0.03, faceZ], 0.008, [Math.PI / 2, 0, 0]);
  return g;
}

/* ───────────────────────── layout builders ───────────────────────── */
/* Each returns { group, parts } where parts maps a catalogue component id to a
   THREE.Object3D. Ids must stay in step with engine-catalog.js. */

function assemble(entries) {
  const group = new T.Group();
  const parts = new Map();
  for (const [id, obj] of entries) {
    obj.name = id;
    group.add(obj);
    parts.set(id, obj);
  }
  return { group, parts };
}

/** Transverse inline-four. `flavour` tunes the ancillaries so the EA888 and the
    N20 do not look like the same casting with a different badge. */
export function buildInline4(mats, flavour = 'ea888') {
  const count = 4, spacing = 0.094;
  const span = spacing * (count - 1);
  const W = span + 0.12, D = 0.21;
  const isN20 = flavour === 'n20';

  const block = cylinderBlock(mats, { w: W, h: 0.2, d: D, ribs: 4 });
  block.position.y = 0.1;

  const headG = new T.Group();
  mesh(headG, roundedBox(W, 0.11, D * 0.98, 0.012), mats.castAlloy);
  // intake / exhaust port faces
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    mesh(headG, lathe([[0, 0], [0.026, 0], [0.026, 0.014], [0, 0.014]], 18), mats.castAlloyDark, [x, 0.01, D * 0.49], [Math.PI / 2, 0, 0]);
    mesh(headG, lathe([[0, 0], [0.022, 0], [0.022, 0.014], [0, 0.014]], 18), mats.castAlloyDark, [x, 0.01, -D * 0.49], [-Math.PI / 2, 0, 0]);
  }
  headG.position.y = 0.255;

  const gasket = new T.Group();
  mesh(gasket, roundedBox(W * 1.005, 0.005, D * 0.99, 0.002), mats.plated);
  gasket.position.y = 0.2;

  const cams = valvetrain(mats, { count, spacing, width: 0.105 });
  cams.position.y = 0.318;

  const cover = new T.Group();
  mesh(cover, roundedBox(W * 0.99, 0.072, D * 0.95, 0.014), mats.blackPlastic);
  for (let i = 0; i < 5; i++) {
    mesh(cover, roundedBox(W * 0.9, 0.008, 0.012, 0.003), mats.blackSatin, [0, 0.038, -D * 0.33 + i * (D * 0.165)]);
  }
  mesh(cover, lathe([[0, 0], [0.026, 0], [0.028, 0.006], [0.028, 0.022], [0, 0.022]], 24), mats.blackSatin,
    [W * 0.3, 0.036, D * 0.2]);
  boltRow(cover, mats, 6, [-W * 0.45, 0.034, D * 0.44], [W * 0.45, 0.034, D * 0.44], 0.007);
  boltRow(cover, mats, 6, [-W * 0.45, 0.034, -D * 0.44], [W * 0.45, 0.034, -D * 0.44], 0.007);
  cover.position.y = 0.374;

  const acoustic = new T.Group();
  mesh(acoustic, roundedBox(W * 1.06, 0.044, D * 1.12, 0.018), mats.blackSatin);
  for (let i = 0; i < 4; i++) {
    mesh(acoustic, roundedBox(W * 0.86, 0.006, 0.02, 0.003), mats.blackPlastic, [0, 0.023, -D * 0.38 + i * (D * 0.25)]);
  }
  mesh(acoustic, roundedBox(0.09, 0.008, 0.03, 0.003), isN20 ? mats.accentBlue : mats.accent, [-W * 0.26, 0.024, D * 0.3]);
  acoustic.position.y = 0.432;

  const sump = new T.Group();
  mesh(sump, roundedBox(W * 0.98, 0.016, D * 0.98, 0.004), mats.castAlloy, [0, 0.008, 0]);
  const pan = mesh(sump, extrude([
    [-W * 0.47, 0], [W * 0.47, 0], [W * 0.42, -0.085], [-W * 0.3, -0.085],
  ], D * 0.86, 0.008), mats.castAlloyDark);
  pan.rotation.y = 0;
  mesh(sump, lathe([[0, 0], [0.016, 0], [0.016, 0.012], [0, 0.012]], 14), mats.plated, [W * 0.3, -0.086, 0]);
  boltRow(sump, mats, 7, [-W * 0.45, 0.004, D * 0.44], [W * 0.45, 0.004, D * 0.44], 0.007);
  sump.position.y = 0.0;

  const crank = crankAssembly(mats, { count, spacing, bankAngle: 0 });
  crank.position.y = 0.072;

  const timing = new T.Group();
  mesh(timing, extrude([
    [0, -0.02], [0.05, 0.03], [0.06, 0.2], [0.03, 0.33], [-0.05, 0.33], [-0.07, 0.12], [-0.05, -0.02],
  ], 0.034, 0.006), mats.castAlloy, [0, 0, 0], [0, Math.PI / 2, 0]);
  boltRing(timing, mats, 8, 0.07, 0.15, 0.007);
  timing.position.set(-W / 2 - 0.016, 0.06, 0);

  const intake = intakeManifold(mats, {
    count, spacing, plenumLen: span + 0.1,
    faceZ: D * 0.5, plenumZ: isN20 ? 0.2 : 0.22, y: 0.3, runnerR: isN20 ? 0.024 : 0.021,
  });

  const exhaust = exhaustManifold(mats, { count, spacing, faceZ: -D * 0.5, outZ: isN20 ? -0.17 : -0.2, y: 0.3 });

  const turbo = turbocharger(mats, isN20 ? 1.05 : 0.95);
  turbo.position.set(isN20 ? 0.02 : 0.03, 0.235, isN20 ? -0.23 : -0.26);
  turbo.rotation.y = isN20 ? 0.15 : -0.1;

  // cooling pack sits ahead of the engine, as installed
  const cooling = new T.Group();
  const rad = finnedCore(cooling, mats, { w: 0.3, h: 0.24, d: 0.042, fins: 26, tank: 'side' });
  rad.position.set(0.3, 0.26, 0.3);
  rad.rotation.y = -0.62;
  const ic = finnedCore(cooling, mats, { w: 0.22, h: 0.13, d: 0.045, fins: 16, tank: 'side' });
  ic.position.set(0.3, 0.08, 0.26);
  ic.rotation.y = -0.62;
  bracket(cooling, mats, [[0.2, 0.06, 0.34], [0.2, 0.4, 0.34]], 0.006, 0.022);
  bracket(cooling, mats, [[0.42, 0.06, 0.2], [0.42, 0.4, 0.2]], 0.006, 0.022);

  const hoses = new T.Group();
  hose(hoses, mats, [[0.26, 0.34, 0.26], [0.2, 0.33, 0.2], [0.12, 0.3, 0.14], [W / 2 - 0.03, 0.27, D * 0.3]], 0.015);
  hose(hoses, mats, [[0.3, 0.12, 0.23], [0.2, 0.16, 0.18], [0.08, 0.22, 0.1], [-W / 2 + 0.04, 0.2, 0.04]], 0.013);
  hose(hoses, mats, [[0.32, 0.1, 0.22], [0.2, 0.16, -0.06], [0.1, 0.22, -0.18], [0.05, 0.235, -0.21]], 0.016);
  hose(hoses, mats, [[-0.1, 0.3, 0.16], [-0.17, 0.34, 0.08], [-0.15, 0.3, -0.02]], 0.01);

  const ancillaries = new T.Group();
  accessory(ancillaries, mats, { r: 0.054, len: 0.115, pulley: 0.042 },
    [-W / 2 + 0.03, 0.17, D * 0.42], [Math.PI / 2, 0, 0.25], 'alternator');
  accessory(ancillaries, mats, { r: 0.042, len: 0.085, pulley: 0.034 },
    [W / 2 - 0.05, 0.14, D * 0.44], [Math.PI / 2, 0, -0.2], 'ac-compressor');
  // belt + crank pulley
  mesh(ancillaries, lathe([[0, 0], [0.058, 0], [0.058, 0.022], [0, 0.022]], 28), mats.machined,
    [-W / 2 - 0.028, 0.072, 0], [0, 0, Math.PI / 2]);
  const beltPath = [];
  for (let i = 0; i <= 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    beltPath.push([-W / 2 - 0.03, 0.14 + Math.cos(a) * 0.085, Math.sin(a) * 0.095]);
  }
  mesh(ancillaries, sweep([...beltPath, beltPath[0]], 0.006, 6), mats.belt);

  const wiring = new T.Group();
  loom(wiring, mats, [
    [-W * 0.4, 0.44, -D * 0.2], [-W * 0.1, 0.47, -D * 0.3], [W * 0.2, 0.45, -D * 0.34], [W * 0.42, 0.38, -D * 0.2],
  ], 0.012, [0, 1]);
  loom(wiring, mats, [[W * 0.3, 0.38, -D * 0.3], [W * 0.36, 0.3, -0.24], [0.1, 0.26, -0.24]], 0.009, [1]);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    mesh(wiring, roundedBox(0.03, 0.03, 0.022, 0.004), mats.blackSatin, [x, 0.448, -D * 0.22]);
  }

  return assemble([
    ['acoustic-cover', acoustic],
    ['cam-cover', cover],
    ['valvetrain', cams],
    ['cylinder-head', headG],
    ['head-gasket', gasket],
    ['cylinder-block', block],
    ['crank-assembly', crank],
    ['oil-sump', sump],
    ['timing-case', timing],
    ['intake-manifold', intake],
    ['exhaust-manifold', exhaust],
    ['turbocharger', turbo],
    ['cooling-pack', cooling],
    ['coolant-hoses', hoses],
    ['belt-drive', ancillaries],
    ['wiring-loom', wiring],
  ]);
}

/** VR6: six cylinders in two rows staggered across a 15° included angle under
    ONE cylinder head — the layout that makes a VR6 a VR6. */
export function buildVR6(mats) {
  const count = 6, spacing = 0.073, bank = T.MathUtils.degToRad(15) / 2;
  const span = spacing * (count - 1);
  const W = span + 0.13, D = 0.26;

  const block = new T.Group();
  mesh(block, roundedBox(W, 0.23, D, 0.016), mats.castAlloy);
  for (let i = 0; i < 6; i++) {
    const x = -span / 2 + i * spacing;
    mesh(block, roundedBox(spacing * 0.5, 0.17, 0.014, 0.004), mats.castAlloyDark, [x, -0.01, D / 2]);
    mesh(block, roundedBox(spacing * 0.5, 0.17, 0.014, 0.004), mats.castAlloyDark, [x, -0.01, -D / 2]);
  }
  // staggered bores visible on the deck
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    const z = (i % 2 ? 1 : -1) * 0.031;
    mesh(block, lathe([[0.042, 0], [0.042, 0.01], [0.05, 0.01], [0.05, 0]], 24), mats.castIron, [x, 0.115, z]);
  }
  mesh(block, roundedBox(0.02, 0.24, D * 1.05, 0.006), mats.castAlloyDark, [W / 2 + 0.008, 0, 0]);
  block.position.y = 0.115;
  block.rotation.z = 0;

  const gasket = new T.Group();
  mesh(gasket, roundedBox(W * 1.005, 0.005, D * 0.99, 0.002), mats.plated);
  gasket.position.y = 0.232;

  // single wide head spanning both staggered rows
  const headG = new T.Group();
  mesh(headG, roundedBox(W, 0.13, D * 0.99, 0.012), mats.castAlloy);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    const z = (i % 2 ? 1 : -1) * 0.031;
    mesh(headG, lathe([[0, 0], [0.024, 0], [0.024, 0.012], [0, 0.012]], 16), mats.castAlloyDark, [x, 0.01, z + (i % 2 ? 0.05 : -0.05)], [Math.PI / 2 * (i % 2 ? 1 : -1), 0, 0]);
  }
  headG.position.y = 0.3;

  const cams = valvetrain(mats, { count: 6, spacing, width: 0.13, lobes: 2 });
  cams.position.y = 0.368;

  const cover = new T.Group();
  mesh(cover, roundedBox(W * 0.99, 0.08, D * 0.96, 0.016), mats.blackPlastic);
  for (let i = 0; i < 6; i++) {
    mesh(cover, roundedBox(W * 0.88, 0.007, 0.012, 0.003), mats.blackSatin, [0, 0.042, -D * 0.36 + i * (D * 0.145)]);
  }
  mesh(cover, lathe([[0, 0], [0.027, 0], [0.029, 0.006], [0.029, 0.024], [0, 0.024]], 24), mats.blackSatin, [W * 0.32, 0.04, D * 0.22]);
  boltRow(cover, mats, 7, [-W * 0.45, 0.038, D * 0.44], [W * 0.45, 0.038, D * 0.44], 0.007);
  boltRow(cover, mats, 7, [-W * 0.45, 0.038, -D * 0.44], [W * 0.45, 0.038, -D * 0.44], 0.007);
  cover.position.y = 0.425;

  const sump = new T.Group();
  mesh(sump, roundedBox(W * 0.98, 0.016, D * 0.98, 0.004), mats.castAlloy, [0, 0.008, 0]);
  mesh(sump, extrude([[-W * 0.47, 0], [W * 0.47, 0], [W * 0.4, -0.1], [-W * 0.28, -0.1]], D * 0.86, 0.008), mats.castAlloyDark);
  mesh(sump, lathe([[0, 0], [0.016, 0], [0.016, 0.012], [0, 0.012]], 14), mats.plated, [W * 0.28, -0.101, 0]);
  boltRow(sump, mats, 8, [-W * 0.45, 0.004, D * 0.44], [W * 0.45, 0.004, D * 0.44], 0.007);

  const crank = crankAssembly(mats, { count, spacing, bankAngle: bank, throwR: 0.048 });
  crank.position.y = 0.082;

  const timing = new T.Group();
  mesh(timing, extrude([[0, -0.02], [0.055, 0.04], [0.065, 0.24], [0.03, 0.38], [-0.055, 0.38], [-0.075, 0.14], [-0.055, -0.02]], 0.036, 0.006),
    mats.castAlloy, [0, 0, 0], [0, Math.PI / 2, 0]);
  boltRing(timing, mats, 9, 0.08, 0.17, 0.007);
  timing.position.set(W / 2 + 0.02, 0.07, 0);

  // long VR6 upper intake sitting across the head
  const intake = new T.Group();
  mesh(intake, lathe([[0, 0], [0.058, 0], [0.062, 0.05], [0.062, span + 0.06], [0.058, span + 0.11], [0, span + 0.11]], 30),
    mats.blackPlastic, [-(span + 0.11) / 2, 0.47, 0.06], [0, 0, -Math.PI / 2]);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    const side = i % 2 ? 1 : -1;
    mesh(intake, sweep([
      [x, 0.47, 0.02],
      [x, 0.45, -0.07],
      [x, 0.40, -0.1 * side * 0.2 - 0.08],
      [x, 0.345, (side > 0 ? 0.08 : -0.08)],
    ], 0.021, 12), mats.blackPlastic);
  }
  mesh(intake, lathe([[0, 0], [0.034, 0], [0.036, 0.012], [0.036, 0.042], [0, 0.042]], 24), mats.blackSatin,
    [-span / 2 - 0.085, 0.47, 0.06], [0, 0, Math.PI / 2]);

  const exhaust = new T.Group();
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    mesh(exhaust, sweep([
      [x, 0.33, -D * 0.46],
      [x, 0.3, -D * 0.62],
      [x * 0.4, 0.22, -D * 0.72],
      [0, 0.17, -D * 0.78],
    ], 0.018, 10), mats.castIron);
  }
  mesh(exhaust, roundedBox(span + 0.06, 0.05, 0.016, 0.005), mats.castIron, [0, 0.32, -D * 0.47]);
  mesh(exhaust, lathe([[0, 0], [0.046, 0], [0.046, 0.08], [0, 0.08]], 22), mats.castIron, [0, 0.1, -D * 0.78]);

  const cooling = new T.Group();
  const rad = finnedCore(cooling, mats, { w: 0.32, h: 0.26, d: 0.046, fins: 28, tank: 'side' });
  rad.position.set(0.34, 0.28, 0.32);
  rad.rotation.y = -0.6;
  const oil = finnedCore(cooling, mats, { w: 0.15, h: 0.11, d: 0.036, fins: 12, tank: 'side' });
  oil.position.set(0.34, 0.1, 0.28);
  oil.rotation.y = -0.6;
  bracket(cooling, mats, [[0.24, 0.08, 0.36], [0.24, 0.44, 0.36]], 0.006, 0.022);
  bracket(cooling, mats, [[0.46, 0.08, 0.22], [0.46, 0.44, 0.22]], 0.006, 0.022);

  const hoses = new T.Group();
  hose(hoses, mats, [[0.3, 0.36, 0.28], [0.22, 0.35, 0.22], [0.14, 0.32, 0.16], [W / 2 - 0.03, 0.3, D * 0.3]], 0.016);
  hose(hoses, mats, [[0.34, 0.14, 0.25], [0.2, 0.2, 0.2], [0.04, 0.26, 0.12], [-W / 2 + 0.04, 0.24, 0.02]], 0.014);
  hose(hoses, mats, [[-0.08, 0.48, 0.08], [-0.15, 0.52, -0.02], [-0.11, 0.48, -0.12]], 0.011);

  const ancillaries = new T.Group();
  accessory(ancillaries, mats, { r: 0.056, len: 0.12, pulley: 0.044 }, [W / 2 - 0.04, 0.2, D * 0.44], [Math.PI / 2, 0, -0.25], 'alternator');
  accessory(ancillaries, mats, { r: 0.044, len: 0.09, pulley: 0.035 }, [-W / 2 + 0.05, 0.15, D * 0.46], [Math.PI / 2, 0, 0.2], 'ac-compressor');
  mesh(ancillaries, lathe([[0, 0], [0.06, 0], [0.06, 0.024], [0, 0.024]], 28), mats.machined, [W / 2 + 0.03, 0.082, 0], [0, 0, Math.PI / 2]);
  const bp = [];
  for (let i = 0; i <= 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    bp.push([W / 2 + 0.032, 0.16 + Math.cos(a) * 0.095, Math.sin(a) * 0.1]);
  }
  mesh(ancillaries, sweep([...bp, bp[0]], 0.006, 6), mats.belt);

  const wiring = new T.Group();
  loom(wiring, mats, [[-W * 0.4, 0.5, -D * 0.22], [-W * 0.1, 0.53, -D * 0.3], [W * 0.2, 0.5, -D * 0.33], [W * 0.42, 0.43, -D * 0.2]], 0.012, [0, 1]);
  for (let i = 0; i < count; i++) {
    const x = -span / 2 + i * spacing;
    mesh(wiring, roundedBox(0.026, 0.03, 0.02, 0.004), mats.blackSatin, [x, 0.5, -D * 0.24]);
  }

  return assemble([
    ['cam-cover', cover],
    ['valvetrain', cams],
    ['cylinder-head', headG],
    ['head-gasket', gasket],
    ['cylinder-block', block],
    ['crank-assembly', crank],
    ['oil-sump', sump],
    ['timing-case', timing],
    ['intake-manifold', intake],
    ['exhaust-manifold', exhaust],
    ['cooling-pack', cooling],
    ['coolant-hoses', hoses],
    ['belt-drive', ancillaries],
    ['wiring-loom', wiring],
  ]);
}

/** Naturally aspirated flat-six: two opposed banks of three, rear-mounted. */
export function buildFlat6(mats) {
  const perBank = 3, spacing = 0.108;
  const span = spacing * (perBank - 1);
  const W = span + 0.14;

  const crankcase = new T.Group();
  mesh(crankcase, roundedBox(W, 0.2, 0.2, 0.018), mats.castAlloy);
  for (let i = 0; i < 3; i++) {
    const x = -span / 2 + i * spacing;
    mesh(crankcase, roundedBox(spacing * 0.42, 0.16, 0.012, 0.004), mats.castAlloyDark, [x, 0, 0.1]);
    mesh(crankcase, roundedBox(spacing * 0.42, 0.16, 0.012, 0.004), mats.castAlloyDark, [x, 0, -0.1]);
  }
  crankcase.position.y = 0.26;

  // opposed cylinder banks
  const banks = new T.Group();
  [1, -1].forEach(side => {
    for (let i = 0; i < perBank; i++) {
      const x = -span / 2 + i * spacing;
      const b = new T.Group();
      mesh(b, lathe([[0, 0], [0.052, 0], [0.052, 0.085], [0.048, 0.088], [0, 0.088]], 26), mats.castAlloy);
      for (let f = 0; f < 5; f++) {
        mesh(b, new T.TorusGeometry(0.054, 0.004, 6, 24), mats.castAlloyDark, [0, 0.014 + f * 0.016, 0], [Math.PI / 2, 0, 0]);
      }
      b.position.set(x, 0.26, side * 0.1);
      b.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      banks.add(b);
    }
  });

  const heads = new T.Group();
  [1, -1].forEach(side => {
    const h = new T.Group();
    mesh(h, roundedBox(W * 0.96, 0.095, 0.17, 0.012), mats.castAlloy);
    for (let i = 0; i < perBank; i++) {
      const x = -span / 2 + i * spacing;
      mesh(h, lathe([[0, 0], [0.026, 0], [0.026, 0.012], [0, 0.012]], 16), mats.castAlloyDark, [x, 0.05, 0.06]);
      mesh(h, lathe([[0, 0], [0.022, 0], [0.022, 0.012], [0, 0.012]], 16), mats.castAlloyDark, [x, 0.05, -0.06]);
    }
    h.position.set(0, 0.26, side * 0.235);
    h.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    heads.add(h);
  });

  const cams = new T.Group();
  [1, -1].forEach(side => {
    const v = valvetrain(mats, { count: perBank, spacing, width: 0.085 });
    v.position.set(0, 0.26, side * 0.305);
    v.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    cams.add(v);
  });

  const covers = new T.Group();
  [1, -1].forEach(side => {
    const c = new T.Group();
    mesh(c, roundedBox(W * 0.95, 0.055, 0.15, 0.014), mats.blackSatin);
    for (let i = 0; i < 4; i++) {
      mesh(c, roundedBox(W * 0.82, 0.006, 0.012, 0.003), mats.blackPlastic, [0, 0.03, -0.05 + i * 0.033]);
    }
    boltRow(c, mats, 6, [-W * 0.43, 0.026, 0.068], [W * 0.43, 0.026, 0.068], 0.0065);
    boltRow(c, mats, 6, [-W * 0.43, 0.026, -0.068], [W * 0.43, 0.026, -0.068], 0.0065);
    c.position.set(0, 0.26, side * 0.345);
    c.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    covers.add(c);
  });

  const crank = crankAssembly(mats, { count: 6, spacing: spacing * 0.62, opposed: true, throwR: 0.04 });
  crank.position.set(0, 0.26, 0);

  // dry-sump style lower housing
  const sump = new T.Group();
  mesh(sump, extrude([[-W * 0.46, 0], [W * 0.46, 0], [W * 0.4, -0.07], [-W * 0.4, -0.07]], 0.19, 0.008), mats.castAlloyDark);
  mesh(sump, lathe([[0, 0], [0.016, 0], [0.016, 0.012], [0, 0.012]], 14), mats.plated, [W * 0.26, -0.071, 0]);
  boltRow(sump, mats, 7, [-W * 0.44, 0.004, 0.09], [W * 0.44, 0.004, 0.09], 0.0065);
  sump.position.y = 0.155;

  // induction: airbox over the engine feeding both banks
  const intake = new T.Group();
  mesh(intake, roundedBox(W * 1.08, 0.075, 0.3, 0.018), mats.blackPlastic, [0, 0.47, 0]);
  for (let i = 0; i < 4; i++) {
    mesh(intake, roundedBox(W * 0.9, 0.006, 0.016, 0.003), mats.blackSatin, [0, 0.509, -0.1 + i * 0.066]);
  }
  [1, -1].forEach(side => {
    for (let i = 0; i < perBank; i++) {
      const x = -span / 2 + i * spacing;
      mesh(intake, sweep([
        [x, 0.44, side * 0.08],
        [x, 0.40, side * 0.17],
        [x, 0.33, side * 0.24],
        [x, 0.30, side * 0.27],
      ], 0.02, 12), mats.blackPlastic);
    }
  });
  mesh(intake, lathe([[0, 0], [0.038, 0], [0.04, 0.014], [0.04, 0.046], [0, 0.046]], 24), mats.blackSatin, [0, 0.47, 0.17], [Math.PI / 2, 0, 0]);

  const exhaust = new T.Group();
  [1, -1].forEach(side => {
    for (let i = 0; i < perBank; i++) {
      const x = -span / 2 + i * spacing;
      mesh(exhaust, sweep([
        [x, 0.2, side * 0.26],
        [x, 0.14, side * 0.34],
        [x * 0.5, 0.1, side * 0.4],
        [0, 0.07, side * 0.42],
      ], 0.018, 10), mats.castIron);
    }
    mesh(exhaust, lathe([[0, 0], [0.05, 0], [0.05, 0.1], [0, 0.1]], 22), mats.castIron, [0, 0.02, side * 0.42], [0, 0, 0]);
  });

  const cooling = new T.Group();
  [1, -1].forEach(side => {
    const r = finnedCore(cooling, mats, { w: 0.26, h: 0.2, d: 0.05, fins: 22, tank: 'top' });
    r.position.set(side * 0.44, 0.3, 0.12);
    r.rotation.y = side * 0.5;
  });
  const oilc = finnedCore(cooling, mats, { w: 0.16, h: 0.12, d: 0.04, fins: 14, tank: 'side' });
  oilc.position.set(0, 0.14, 0.3);

  const hoses = new T.Group();
  hose(hoses, mats, [[0.38, 0.32, 0.14], [0.26, 0.34, 0.1], [0.14, 0.33, 0.04], [W / 2 - 0.02, 0.3, 0]], 0.016);
  hose(hoses, mats, [[-0.38, 0.32, 0.14], [-0.26, 0.34, 0.1], [-0.14, 0.33, 0.04], [-W / 2 + 0.02, 0.3, 0]], 0.016);
  hose(hoses, mats, [[0.05, 0.16, 0.28], [0.08, 0.22, 0.18], [0.04, 0.26, 0.1]], 0.013);

  const ancillaries = new T.Group();
  accessory(ancillaries, mats, { r: 0.05, len: 0.1, pulley: 0.04 }, [-W / 2 + 0.02, 0.4, 0.14], [0.3, 0, Math.PI / 2], 'alternator');
  mesh(ancillaries, lathe([[0, 0], [0.058, 0], [0.058, 0.022], [0, 0.022]], 28), mats.machined, [W / 2 + 0.03, 0.26, 0], [0, 0, Math.PI / 2]);
  const bp = [];
  for (let i = 0; i <= 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    bp.push([W / 2 + 0.034, 0.3 + Math.cos(a) * 0.09, Math.sin(a) * 0.085]);
  }
  mesh(ancillaries, sweep([...bp, bp[0]], 0.006, 6), mats.belt);

  const wiring = new T.Group();
  loom(wiring, mats, [[-W * 0.42, 0.52, 0.1], [-W * 0.1, 0.55, 0.14], [W * 0.2, 0.53, 0.12], [W * 0.42, 0.48, 0.06]], 0.012, [0, 1]);
  [1, -1].forEach(side => {
    for (let i = 0; i < perBank; i++) {
      const x = -span / 2 + i * spacing;
      mesh(wiring, roundedBox(0.026, 0.028, 0.02, 0.004), mats.blackSatin, [x, 0.3, side * 0.37]);
    }
  });

  return assemble([
    ['intake-airbox', intake],
    ['cam-covers', covers],
    ['valvetrain', cams],
    ['cylinder-heads', heads],
    ['cylinder-banks', banks],
    ['crankcase', crankcase],
    ['crank-assembly', crank],
    ['oil-housing', sump],
    ['exhaust-manifold', exhaust],
    ['cooling-pack', cooling],
    ['coolant-hoses', hoses],
    ['belt-drive', ancillaries],
    ['wiring-loom', wiring],
  ]);
}

/** Dispatch by layout id used in engine-catalog.js. */
export function buildByLayout(layout, mats) {
  if (layout === 'vr6') return buildVR6(mats);
  if (layout === 'flat6') return buildFlat6(mats);
  if (layout === 'inline4-n20') return buildInline4(mats, 'n20');
  return buildInline4(mats, 'ea888');
}

/** Free every geometry and material owned by a built engine. */
export function disposeBuilt(built, mats) {
  built.group.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
  if (mats) Object.values(mats).forEach(m => m.dispose?.());
}

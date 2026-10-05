/* ==========================================================================
   PETROLHEAD TECHNICA — 4.0 flat-six (Porsche 911 GT3 RS, 992) engine geometry
   --------------------------------------------------------------------------
   Authored procedurally for this site. It is an ANATOMY STUDY: not
   manufacturer CAD, not a scan, not a dimensioned reproduction.

   What the arrangement rests on (Porsche technical data, MY P 08/2022):
     · six-cylinder naturally aspirated boxer, four valves per cylinder,
       bore 102.0 mm, stroke 81.5 mm, 3,996 cm3, 13.3:1;
     · DLC-coated rocker arms with solid cam followers, VarioCam control;
     · plastic variable intake manifold with six individual throttle valves;
     · dry-sump lubrication with a separate (vehicle-side) oil tank;
     · water cooling with a mechanical thermostat.
   Everything else (crankcase split, four mains, cam drive, header routing,
   coolant routing, bracket shapes, throw phasing) is illustrative.

   Authoring axes: y up, crankshaft along z, belt/accessory end at +z, PDK
   (gearbox) end at -z, banks horizontally opposed along +/-x. Cylinders
   alternate sides along the crank (1,3,5 right; 2,4,6 left).
   ========================================================================== */
import * as THREE from 'three';
import { createKit, finishEngine, makePortFactory } from './engine-kit.js';

export function buildFlat6(mat) {
  const kit = createKit(mat);
  const { add, rounded, cyl, ring, bolt, ellipsoid, profile, sweep, hose, clamp } = kit;
  const PI = Math.PI;
  const root = new THREE.Group();
  root.name = 'Flat-six engine';
  const parts = new Map();
  const part = (id, parent = root) => {
    const g = new THREE.Group(); g.name = id;
    parent.add(g); parts.set(id, g);
    return g;
  };

  const SIDES = [{ s: 1, tag: 'right' }, { s: -1, tag: 'left' }];
  const ZC = k => (k - 2.5) * 0.30;                 // cylinder k = 0..5 along the crank
  const bankZ = s => [0, 1, 2].map(i => ZC(s > 0 ? i * 2 : i * 2 + 1));
  const bankCentre = s => bankZ(s)[1];
  const HEAD_LEN = 1.8;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ───────── local helpers ───────── */
  /** Lathe geometry cached by key (the kit's own lathe is not cached). */
  const latheC = (parent, key, pts, material, xyz = [0, 0, 0], rot = [0, 0, 0], seg = 40) => {
    const g = kit.cache['L' + key] ||= (() => {
      const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);
      geo.computeVertexNormals();
      return geo;
    })();
    return add(parent, g, material, xyz, rot);
  };
  /** Half annulus / half disc outline in x-y for side s (x >= 0 mirrored by s). */
  const halfArc = (s, rOut, rIn, n = 22) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = PI / 2 - PI * i / n; pts.push([s * rOut * Math.cos(a), rOut * Math.sin(a)]); }
    for (let i = 0; i <= n; i++) { const a = -PI / 2 + PI * i / n; pts.push([s * rIn * Math.cos(a), rIn * Math.sin(a)]); }
    return pts;
  };
  const boltX = (parent, x, y, z, s, scale = 1) => {
    const b = bolt(parent, [x, y, z], 'x', scale);
    if (s < 0) b.rotation.z = PI / 2;
    return b;
  };
  const alignY = (mesh, dir) => { mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize()); return mesh; };

  /* ───────── semantic parts ─────────
     Heads own nested cover + valvetrain; the intake plenum owns its throttle
     bodies, so each layer can separate in turn. */
  const P = { crank: part('crank-assembly') };
  for (const { tag } of SIDES) {
    P['case-' + tag] = part('crankcase-' + tag);
    P['head-' + tag] = part('head-' + tag);
    P['cover-' + tag] = part('cam-cover-' + tag, P['head-' + tag]);
    P['valve-' + tag] = part('valvetrain-' + tag, P['head-' + tag]);
    P['exh-' + tag] = part('exhaust-' + tag);
  }
  const plenum = part('intake-plenum');
  const throttle = part('throttle-bodies', plenum);
  const runners = part('intake-runners');
  const oil = part('oil-housing');
  const belt = part('belt-drive');
  const acc = part('accessories');
  const ignition = part('ignition');
  const wiring = part('wiring');
  const cooling = part('coolant-network');

  /* ───────────────────────── crankcase halves + cylinder banks ─────────────────────────
     Vertical split at x = 0. Each half carries its three finned barrels. The
     crank tunnel is an open notch so the crank can be seen once a half moves away. */
  const MAINS = [-1.0, -0.3, 0.3, 1.0];
  for (const { s, tag } of SIDES) {
    const half = P['case-' + tag];
    const pts = [[0, .5], [s * .4, .5], [s * .52, .4], [s * .52, -.4], [s * .4, -.52], [0, -.52]];
    for (let i = 0; i <= 22; i++) { const a = -PI / 2 + PI * i / 22; pts.push([s * .34 * Math.cos(a), .34 * Math.sin(a)]); }
    const shell = profile(half, pts, 2.2, mat.castDark, [0, 0, 0], [], .02, 1);
    shell.name = 'Crankcase half (' + tag + ')';
    // 4 main-bearing bulkheads (illustrative count)
    for (const z of MAINS) profile(half, halfArc(s, .345, .105), .08, mat.castDark, [0, 0, z], [], .008, 1);
    // longitudinal ribs and seam bolts
    for (const y of [-.37, .37]) rounded(half, [.05, .05, 2.0], mat.castDark, [s * .535, y, 0], undefined, .012);
    rounded(half, [.1, .035, 2.0], mat.edge, [s * .05, .505, 0], undefined, .01);
    for (const z of [-.95, -.5, -.15, .15, .5, .95]) bolt(half, [s * .2, .515, z], 'y', .8);
    for (const z of [-.95, -.5, .5, .95]) bolt(half, [s * .2, -.53, z], 'y', .8).rotation.x = PI;

    // front (+z) cover plate with the crank-nose opening, and the PDK-side flange face
    const front = profile(half, [[0, .5], [s * .4, .5], [s * .52, .4], [s * .52, -.4], [s * .4, -.52], [0, -.52],
      ...Array.from({ length: 13 }, (_, i) => { const a = -PI / 2 + PI * i / 12; return [s * .14 * Math.cos(a), .14 * Math.sin(a)]; })], .08, mat.castDark, [0, 0, 1.14], [], .014, 1);
    front.name = 'Front cover plate (' + tag + ')';
    for (const [x, y] of [[.42, .38], [.42, -.38], [.15, .42], [.15, -.42]]) bolt(half, [s * x, y, 1.19], 'z', .8);
    const bell = profile(half, halfArc(s, .95, .47), .14, mat.castDark, [0, 0, -1.17], [], .018, 1);
    bell.name = 'PDK mounting flange face (' + tag + ')';
    ring(half, .95, .006, mat.edge, [0, 0, -1.235]);
    for (let i = 0; i < 6; i++) {
      const a = -75 + i * 30, r = .76, rad = a * PI / 180;
      bolt(half, [s * r * Math.cos(rad), r * Math.sin(rad), -1.246], 'z', 1.15).rotation.x = -PI / 2;
    }
    for (const a of [-52, 52]) {
      const rad = a * PI / 180;
      cyl(half, .035, .03, mat.steel, [s * .62 * Math.cos(rad), .62 * Math.sin(rad), -1.256], 'z', 16);   // dowels
    }

    // cylinder bank: three finned barrels, casting web, deck gasket
    const zs = bankZ(s);
    const bp = [[0, 0], [.29, 0], [.29, .04], [.225, .045]];
    for (let i = 0; i < 5; i++) { const y = .08 + i * .052; bp.push([.225, y], [.27, y], [.27, y + .026], [.225, y + .026]); }
    bp.push([.225, .33], [.27, .33], [.27, .37], [0, .37]);
    for (const z of zs) {
      const b = latheC(half, 'barrel', bp, mat.castDark, [s * .5, 0, z], [0, 0, -s * PI / 2], 40);
      b.name = 'Cylinder barrel';
      ring(half, .272, .011, mat.edge, [s * .866, 0, z], 'x');
      for (const [dy, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) boltX(half, s * .548, dy * .17, z + dz * .17, s, .9);
    }
    rounded(half, [.14, .3, HEAD_LEN - .1], mat.castDark, [s * .78, 0, bankCentre(s)], undefined, .03);
    rounded(half, [.03, .64, HEAD_LEN - .02], mat.gasket, [s * .885, 0, bankCentre(s)], undefined, .008);
    rounded(half, [.02, .5, HEAD_LEN - .08], mat.gasket, [s * .515, 0, bankCentre(s)], undefined, .006);
  }

  /* ───────────────────────── cylinder heads, covers, valvetrain ───────────────────────── */
  const coolingKit = makePortFactory(kit, root);
  const headPorts = {};
  for (const { s, tag } of SIDES) {
    const head = P['head-' + tag], cover = P['cover-' + tag], valves = P['valve-' + tag];
    const zs = bankZ(s), zc = bankCentre(s);
    const casting = profile(head, [[s * .9, -.44], [s * 1.2, -.44], [s * 1.2, .44], [s * .9, .44]], HEAD_LEN, mat.cast, [0, 0, zc], [], .03);
    casting.name = 'Cylinder head casting (' + tag + ')';
    for (const z of zs) {
      rounded(head, [.3, .26, .34], mat.cast, [s * 1.05, .6, z], undefined, .035);               // intake port boss, inner/upper
      rounded(head, [.34, .12, .36], mat.cast, [s * 1.1, -.5, z], undefined, .03);               // exhaust port boss, lower
      const tube = cyl(head, .075, .31, mat.cast, [s * 1.355, 0, z], 'x', 28);                    // spark-plug tube
      tube.name = 'Spark-plug tube';
      ring(head, .078, .012, mat.edge, [s * 1.505, 0, z], 'x');
      cyl(head, .052, .02, mat.recess, [s * 1.505, 0, z], 'x', 20);
      for (const dz of [-.13, .13]) for (const y of [-.34, .34]) boltX(head, s * 1.2, y, z + dz, s, .7);  // head stud nuts on the pocket floor
    }
    // cam pocket rails and end walls
    for (const y of [-.395, .395]) rounded(head, [.31, .09, HEAD_LEN], mat.cast, [s * 1.355, y, zc], undefined, .02);
    for (const dz of [-1, 1]) rounded(head, [.31, .88, .09], mat.cast, [s * 1.355, 0, zc + dz * (HEAD_LEN / 2 - .045)], undefined, .02);
    rounded(head, [.3, .06, HEAD_LEN + .06], mat.edge, [s * 1.04, -.455, zc], undefined, .015);
    // coolant outlet boss on the +z end face
    const faceZ = zc + HEAD_LEN / 2;
    cyl(head, .1, .1, mat.cast, [s * 1.05, -.12, faceZ + .05], 'z', 28);
    headPorts[tag] = coolingKit.port('head-outlet-' + tag, 'Cylinder-head coolant outlet (' + tag + ')',
      [s * 1.05, -.12, faceZ + .1], [0, 0, 1], .065, head, casting);

    // cam cover: satin silver, ribbed, with plug apertures
    rounded(cover, [.1, .94, HEAD_LEN + .06], mat.castLight, [s * 1.585, 0, zc], undefined, .05);
    rounded(cover, [.05, .98, HEAD_LEN + .1], mat.edge, [s * 1.53, 0, zc], undefined, .012);
    rounded(cover, [.01, .93, HEAD_LEN + .02], mat.gasket, [s * 1.508, 0, zc], undefined, .004);
    for (const y of [-.33, .33]) rounded(cover, [.035, .06, HEAD_LEN - .1], mat.castLight, [s * 1.66, y, zc], undefined, .012);
    for (let i = 0; i < 4; i++) rounded(cover, [.035, .74, .04], mat.castLight, [s * 1.66, 0, zs[0] - .3 + i * .3], undefined, .012);
    for (const z of zs) {
      ring(cover, .095, .014, mat.edge, [s * 1.64, 0, z], 'x');
      cyl(cover, .088, .012, mat.recess, [s * 1.636, 0, z], 'x', 28);
    }
    for (const y of [-.43, .43]) for (let i = 0; i <= 6; i++) boltX(cover, s * 1.63, y, zc - 0.9 + i * .3, s, .7);

    // valvetrain: two cam lines, DLC rocker arms (source), 4 valves per cylinder
    for (const [name, y] of [['intake', .2], ['exhaust', -.2]]) {
      const cam = cyl(valves, .045, HEAD_LEN + .02, mat.steel, [s * 1.43, y, zc], 'z', 24);
      cam.name = `Camshaft (${name}, ${tag})`;
      for (const zz of zs) for (const dz of [-.09, .09]) {
        ellipsoid(valves, [.065, .05, .04], mat.edge, [s * 1.41, y, zz + dz], [0, 0, 0]);
        rounded(valves, [.075, .21, .05], mat.black, [s * 1.325, y * .86, zz + dz], undefined, .018).name = 'DLC rocker arm';
        cyl(valves, .05, .15, mat.steel, [s * 1.26, y * .7, zz + dz], 'x', 18);                   // valve spring
        ring(valves, .052, .008, mat.zinc, [s * 1.31, y * .7, zz + dz], 'x');
        cyl(valves, .06, .02, mat.zinc, [s * 1.335, y * .7, zz + dz], 'x', 18);                  // retainer
      }
      cyl(valves, .022, HEAD_LEN, mat.steel, [s * 1.34, y * 1.52, zc], 'z', 12);                  // rocker pivot shaft
      for (const dz of [-1, 1]) {
        const z = zc + dz * (HEAD_LEN / 2 - .08);
        rounded(valves, [.1, .1, .07], mat.cast, [s * 1.43, y * 1.9, z], undefined, .015);        // cam cap
      }
      // cam gear on the +z end (drive route illustrative)
      const gz = faceZ + .07;
      cyl(valves, .13, .055, mat.steel, [s * 1.43, y, gz], 'z', 36);
      ring(valves, .13, .01, mat.edge, [s * 1.43, y, gz + .028]);
      cyl(valves, .06, .03, mat.castDark, [s * 1.43, y, gz + .04], 'z', 20);
      bolt(valves, [s * 1.43, y, gz + .06], 'z', .9);
    }
  }

  /* ───────────────────────── intake: plenum, throttle bodies, runners ───────────────────────── */
  const plenumBox = rounded(plenum, [1.3, .42, 1.9], mat.plastic, [0, 1.36, 0], undefined, .1);
  plenumBox.name = 'Plastic variable intake plenum';
  rounded(plenum, [1.16, .05, 1.74], mat.plastic, [0, 1.6, 0], undefined, .03);
  for (let i = -3; i <= 3; i++) rounded(plenum, [1.16, .04, .05], mat.black, [0, 1.63, i * .24], undefined, .012);
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) rounded(plenum, [.04, .3, .06], mat.black, [sx * .66, 1.36, -.82 + i * .33], undefined, .012);
  // inlet snout at the -z end (vehicle air duct is external)
  cyl(plenum, .27, .32, mat.plastic, [0, 1.36, -1.1], 'z', 40);
  ring(plenum, .27, .028, mat.black, [0, 1.36, -1.26]);
  const snout = add(plenum, new THREE.CylinderGeometry(.28, .28, .07, 40, 1, true), mat.black, [0, 1.36, -1.3]);
  snout.rotation.x = PI / 2; snout.name = 'External vehicle air-duct connector'; snout.userData.externalConnector = true;
  clamp(plenum, [0, 1.36, -1.22], [0, 0, 1], .27, .5);
  // the two switchable resonance valves of the variable manifold
  for (const z of [-.45, .45]) {
    cyl(plenum, .1, .1, mat.castDark, [0, 1.62, z + .0], 'y', 28);
    ring(plenum, .1, .012, mat.edge, [0, 1.67, z], 'y');
    cyl(plenum, .05, .04, mat.black, [0, 1.7, z], 'y', 18);
  }
  rounded(plenum, [1.2, .03, 1.8], mat.gasket, [0, 1.14, 0], undefined, .008);

  for (const { s } of SIDES) {
    const zs = bankZ(s);
    // one throttle shaft per bank across its three throttle bodies
    cyl(throttle, .028, 1.5, mat.steel, [s * .38, .97, zs[1]], 'z', 14);
    rounded(throttle, [.16, .17, .2], mat.black, [s * .38, .97, zs[2] + .2], undefined, .03).name = 'Throttle actuator';
    for (const z of zs) {
      cyl(throttle, .17, .37, mat.cast, [s * .38, .965, z], 'y', 36).name = 'Throttle body';
      cyl(throttle, .125, .39, mat.recess, [s * .38, .965, z], 'y', 28).scale.set(.98, .3, .98);
      ring(throttle, .215, .016, mat.edge, [s * .38, 1.13, z], 'y');
      ring(throttle, .215, .016, mat.edge, [s * .38, .795, z], 'y');
      const plate = cyl(throttle, .122, .018, mat.steel, [s * .38, .97, z], 'y', 28);
      plate.rotation.z = .85;
      cyl(throttle, .04, .1, mat.cast, [s * .38 + s * .0, .97, z - .13], 'z', 16);
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bolt(throttle, [s * .38 + dx * .17, 1.145, z + dz * .17], 'y', .8);
    }
  }
  for (const { s } of SIDES) for (const z of bankZ(s)) {
    const path = [[s * .38, .79, z], [s * .4, .72, z], [s * .5, .66, z], [s * .7, .62, z], [s * .845, .6, z]];
    const run = sweep(runners, path, .13, .13, mat.plastic, { steps: 48, sides: 20, open: true });
    run.name = 'Intake runner';
    ring(runners, .155, .02, mat.black, [s * .38, .795, z], 'y');
    rounded(runners, [.05, .38, .38], mat.black, [s * .865, .6, z], undefined, .02);               // flange on the head's inner/upper face
    for (const [dy, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) boltX(runners, s * .835, .6 + dy * .14, z + dz * .14, s, .75);
    ring(runners, .132, .012, mat.black, [s * .84, .6, z], 'x');
  }
  // runner stiffener rail per bank
  for (const { s } of SIDES) rounded(runners, [.05, .05, HEAD_LEN - .3], mat.black, [s * .5, .8, bankCentre(s)], undefined, .01);

  /* ───────────────────────── exhaust: three-into-one per bank (naturally aspirated) ───────────────────────── */
  for (const { s, tag } of SIDES) {
    const ex = P['exh-' + tag], zs = bankZ(s);
    const paths = [
      [[1.1, -.58, zs[0]], [1.1, -.66, zs[0]], [1.05, -.8, zs[0] - .12], [1.03, -.78, zs[0] - .33], [1.03, -.78, -1.18]],
      [[1.1, -.58, zs[1]], [1.1, -.66, zs[1]], [1.22, -.82, zs[1] - .1], [1.28, -.8, zs[1] - .3], [1.28, -.8, -1.18]],
      [[1.1, -.58, zs[2]], [1.1, -.75, zs[2]], [1.1, -.97, zs[2] - .2], [1.12, -1.02, zs[2] - .55], [1.12, -1.02, -1.18]],
    ];
    paths.forEach((pth, i) => {
      const pipe = hose(ex, pth.map(([x, y, z]) => [s * x, y, z]), .07, 0, mat.titanium);
      pipe.name = `Header primary pipe ${i + 1} (${tag})`;
      const z = zs[i];
      rounded(ex, [.36, .045, .4], mat.edge, [s * 1.1, -.585, z], undefined, .012);
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bolt(ex, [s * (1.1 + dx * .14), -.612, z + dz * .15], 'y', .75).rotation.x = PI;
    });
    const col = latheC(ex, 'collector', [[0, 0], [.27, 0], [.27, .04], [.2, .18], [.135, .32], [.135, .62], [.19, .62], [.19, .67], [0, .67]],
      mat.titanium, [s * 1.14, -.9, -1.08], [-PI / 2, 0, 0], 40);
    col.name = `Collector (${tag})`;
    ring(ex, .27, .014, mat.zinc, [s * 1.14, -.9, -1.1]);
    ring(ex, .19, .01, mat.zinc, [s * 1.14, -.9, -1.745]);
    // lambda sensor boss on the collector
    cyl(ex, .035, .12, mat.brass, [s * 1.14 + s * .12, -.9 + .1, -1.38], 'y', 6).rotation.z = s * -.6;
  }

  /* ───────────────────────── dry-sump oil housing ───────────────────────── */
  {
    const pan = profile(oil, [[-.56, -.52], [.56, -.52], [.52, -.7], [.36, -.9], [-.36, -.9], [-.52, -.7]], 2.2, mat.castDark, [0, 0, 0], [], .03, 1);
    pan.name = 'Dry-sump lower housing';
    rounded(oil, [1.2, .02, 2.24], mat.gasket, [0, -.52, 0], undefined, .006);
    for (const x of [-.2, 0, .2]) rounded(oil, [.05, .04, 1.9], mat.cast, [x, -.9, 0], undefined, .012);
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) rounded(oil, [.07, .34, .05], mat.castDark, [s * .545, -.7, -.9 + i * .26], [0, 0, s * .0], .012);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) bolt(oil, [s * .52, -.505, -.9 + i * .36], 'y', .8);
    bolt(oil, [0, -.915, .7], 'y', 1.5).rotation.x = PI;
    // scavenge / pressure fittings: the oil tank itself is a vehicle part (external)
    const fittings = [[-1, -.7, 'Scavenge'], [-1, -.1, 'Scavenge'], [-1, .5, 'Scavenge'], [1, .45, 'Scavenge'], [1, -.4, 'Pressure feed']];
    for (const [sx, z, label] of fittings) {
      const big = label !== 'Scavenge', r = big ? .06 : .045;
      const f = cyl(oil, r, .13, mat.brass, [sx * .62, -.66, z], 'x', 24);
      f.name = `${label} fitting (to external oil tank)`; f.userData.externalConnector = true;
      cyl(oil, r * 1.4, .035, mat.zinc, [sx * .575, -.66, z], 'x', 6);
      ring(oil, r + .004, .008, mat.zinc, [sx * .685, -.66, z], 'x');
      cyl(oil, r * .6, .01, mat.recess, [sx * .688, -.66, z], 'x', 16);
    }
    for (const z of [-.6, -.2, .2, .6]) cyl(oil, .06, .05, mat.cast, [0, -.925, z], 'y', 20);   // sump-plate bosses (sketch)
  }

  /* ───────────────────────── rotating assembly ───────────────────────── */
  {
    const r = .157, L = .6;
    cyl(P.crank, .08, 2.4, mat.steel, [0, 0, 0], 'z', 28);
    for (const z of MAINS) { cyl(P.crank, .1, .09, mat.edge, [0, 0, z], 'z', 32); }
    cyl(P.crank, .1, .68, mat.steel, [0, 0, 1.44], 'z', 28);                    // belt-end nose
    ring(P.crank, .1, .008, mat.zinc, [0, 0, 1.2]);
    cyl(P.crank, .45, .1, mat.steel, [0, 0, -1.19], 'z', 40);                   // bare flange for the PDK
    cyl(P.crank, .2, .03, mat.edge, [0, 0, -1.26], 'z', 32);
    for (let i = 0; i < 8; i++) { const a = i * PI / 4 + .2; bolt(P.crank, [Math.cos(a) * .33, Math.sin(a) * .33, -1.25], 'z', 1.1).rotation.x = -PI / 2; }
    const phase = [0, 4, 2, 5, 1, 3];                                             // illustrative throw phasing (60 degree steps)
    for (let k = 0; k < 6; k++) {
      const s = k % 2 === 0 ? 1 : -1, z = ZC(k), th = phase[k] * PI / 3 + .3;
      const px = r * Math.cos(th), py = r * Math.sin(th);
      cyl(P.crank, .07, .13, mat.edge, [px, py, z], 'z', 24);
      for (const dz of [-.085, .085]) {
        const web = profile(P.crank, [[-.1, .157], [.1, .157], [.12, .05], [.17, -.1], [.16, -.25], [0, -.31], [-.16, -.25], [-.17, -.1], [-.12, .05]],
          .035, mat.steel, [0, 0, z + dz], [], .008);
        web.rotation.z = th - PI / 2; web.name = 'Crank web';
      }
      const xp = px + s * Math.sqrt(L * L - py * py);
      const dir = V3(xp - px, -py, 0), len = dir.length();
      const rod = alignY(rounded(P.crank, [.09, len, .06], mat.steel, [(px + xp) / 2, py / 2, z], undefined, .022), dir);
      rod.name = 'Connecting rod ' + (k + 1);
      ring(P.crank, .095, .025, mat.steel, [px, py, z]);
      ring(P.crank, .052, .02, mat.steel, [xp, 0, z]);
      const pg = new THREE.Group(); pg.name = 'Piston ' + (k + 1);
      pg.position.set(xp, 0, z); pg.rotation.z = -s * PI / 2; P.crank.add(pg);
      latheC(pg, 'piston', [[0, -.14], [.17, -.14], [.19, -.12], [.19, .08], [.18, .1], [0, .1]], mat.steel, [0, 0, 0], [0, 0, 0], 36);
      for (const yy of [.06, .035, .01]) ring(pg, .191, .006, mat.recess, [0, yy, 0], 'y');
      cyl(pg, .04, .34, mat.edge, [0, -.02, 0], 'z', 16);
    }
  }

  /* ───────────────────────── accessory belt drive (+z end, one plane) ───────────────────────── */
  const BZ = 1.62;
  const pulleys = [
    { id: 'crank', x: 0, y: 0, r: .3 }, { id: 'alt', x: -.85, y: .45, r: .15 },
    { id: 'idler', x: 0, y: .95, r: .115 }, { id: 'ac', x: .85, y: .45, r: .17 },
  ];
  for (const p of pulleys) {
    const damper = p.id === 'crank';
    cyl(belt, p.r, damper ? .2 : .12, mat.black, [p.x, p.y, BZ], 'z', 48);
    for (const dz of [-.03, 0, .03]) ring(belt, p.r + .002, .005, mat.recess, [p.x, p.y, BZ + dz]);
    ring(belt, p.r - .008, .008, damper ? mat.recess : mat.steel, [p.x, p.y, BZ + (damper ? .1 : .06)]);
    cyl(belt, p.r * .62, .02, damper ? mat.castLight : mat.steel, [p.x, p.y, BZ + (damper ? .105 : .065)], 'z', 36);
    bolt(belt, [p.x, p.y, BZ + (damper ? .125 : .085)], 'z', damper ? 1.5 : .9);
    if (damper) {
      cyl(belt, p.r * .84, .05, mat.castDark, [p.x, p.y, BZ - .12], 'z', 40);
      ring(belt, p.r * .84, .01, mat.edge, [p.x, p.y, BZ - .095]);
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; cyl(belt, .02, .01, mat.recess, [Math.cos(a) * p.r * .5, Math.sin(a) * p.r * .5, BZ + .112], 'z', 12); }
    }
  }
  // tensioner / idler support arm from the front cover plate
  profile(belt, [[-.13, .44], [.13, .44], [.1, .8], [.15, .95], [0, 1.08], [-.15, .95], [-.1, .8]], .14, mat.cast, [0, 0, 1.25], [[0, .95, .06]], .02);
  cyl(belt, .06, .26, mat.steel, [0, .95, 1.44], 'z', 20);
  for (const x of [-.08, .08]) bolt(belt, [x, .5, 1.325], 'z', .8);
  const route = pulleys;
  const tang = route.map((p, i) => {
    const q = route[(i + 1) % route.length], dx = q.x - p.x, dy = q.y - p.y;
    return Math.atan2(dy, dx) + Math.acos(THREE.MathUtils.clamp((p.r - q.r) / Math.hypot(dx, dy), -1, 1));
  });
  const beltPath = [];
  for (let i = 0; i < route.length; i++) {
    const p = route[i]; let start = tang[(i + route.length - 1) % route.length], end = tang[i];
    while (end > start) end -= PI * 2;
    const count = Math.max(3, Math.ceil((start - end) * 8));
    for (let j = 0; j <= count; j++) {
      const a = start + (end - start) * j / count;
      beltPath.push([p.x + Math.cos(a) * (p.r + .014), p.y + Math.sin(a) * (p.r + .014), BZ]);
    }
    const q = route[(i + 1) % route.length];
    const from = beltPath[beltPath.length - 1], to = [q.x + Math.cos(tang[i]) * (q.r + .014), q.y + Math.sin(tang[i]) * (q.r + .014), BZ];
    for (const t of [.25, .5, .75]) beltPath.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, BZ]);
  }
  beltPath.push([...beltPath[0]]);
  sweep(belt, beltPath, .014, .042, mat.rubber, { planar: true, steps: 160, sides: 12 }).name = 'Ribbed accessory belt';

  /* ───────────────────────── alternator and A/C compressor (same belt plane) ───────────────────────── */
  {
    const ax = -.85, ay = .45;
    cyl(acc, .2, .24, mat.castDark, [ax, ay, 1.4], 'z', 40);
    for (const z of [1.285, 1.515]) { cyl(acc, .205, .035, mat.castLight, [ax, ay, z], 'z', 40); }
    for (let i = 0; i < 10; i++) { const a = i * PI / 5; rounded(acc, [.04, .05, .2], mat.castLight, [ax + Math.sin(a) * .2, ay + Math.cos(a) * .2, 1.4], [0, 0, -a], .012); }
    cyl(acc, .17, .05, mat.recess, [ax, ay, 1.54], 'z', 32);
    cyl(acc, .045, .22, mat.steel, [ax, ay, 1.6], 'z', 16);
    rounded(acc, [.15, .1, .12], mat.black, [ax, ay + .22, 1.34], undefined, .02);                    // regulator / terminal block
    cyl(acc, .022, .06, mat.brass, [ax - .06, ay + .29, 1.34], 'y', 14);
    cyl(acc, .12, .1, mat.cast, [ax, ay, 1.23], 'z', 28);                                             // mounting boss
    rounded(acc, [.52, .15, .1], mat.cast, [-.62, .4, 1.23], [0, 0, .08], .03);
    bolt(acc, [-.42, .4, 1.285], 'z', .9);

    const cx = .85, cy = .45;
    cyl(acc, .15, .28, mat.castLight, [cx, cy, 1.42], 'z', 40);
    for (let i = 0; i < 4; i++) ring(acc, .152, .01, mat.edge, [cx, cy, 1.31 + i * .07]);
    cyl(acc, .165, .03, mat.castDark, [cx, cy, 1.275], 'z', 40);
    cyl(acc, .11, .03, mat.steel, [cx, cy, 1.575], 'z', 32);                                           // clutch plate
    cyl(acc, .04, .1, mat.steel, [cx, cy, 1.64], 'z', 16);
    // refrigerant block: connection to the vehicle's A/C lines (external, not modelled)
    rounded(acc, [.2, .09, .14], mat.cast, [cx, cy + .16, 1.38], undefined, .02);
    for (const dx of [-.05, .05]) {
      const f = cyl(acc, .028, .09, mat.black, [cx + dx, cy + .24, 1.38], 'y', 18);
      f.name = 'A/C line connection (external)'; f.userData.externalConnector = true;
    }
    cyl(acc, .12, .1, mat.cast, [cx, cy, 1.23], 'z', 28);
    rounded(acc, [.52, .15, .1], mat.cast, [.62, .4, 1.23], [0, 0, -.08], .03);
    bolt(acc, [.42, .4, 1.285], 'z', .9);
  }

  /* ───────────────────────── ignition (coil-on-plug) and wiring loom ───────────────────────── */
  for (const { s, tag } of SIDES) {
    for (const z of bankZ(s)) {
      const g = new THREE.Group(); g.name = 'Ignition coil'; ignition.add(g);
      cyl(g, .075, .06, mat.rubber, [s * 1.715, 0, z], 'x', 24);
      cyl(g, .056, .24, mat.black, [s * 1.865, 0, z], 'x', 24);
      ring(g, .058, .01, mat.zinc, [s * 1.76, 0, z], 'x');
      rounded(g, [.09, .1, .1], mat.plastic, [s * 1.99, .035, z], [0, 0, 0], .02);
      rounded(g, [.05, .05, .07], mat.plastic, [s * 1.99, .105, z], undefined, .012);
    }
    // loom on the connectors
    const zs = bankZ(s);
    hose(wiring, [[s * 1.99, .13, zs[0] - .12], [s * 1.99, .13, zs[0]], [s * 1.99, .13, zs[1]], [s * 1.99, .13, zs[2]], [s * 1.99, .13, zs[2] + .22]], .02, 0, mat.rubber).name = 'Loom (' + tag + ')';
    for (const z of zs) rounded(wiring, [.05, .045, .075], mat.black, [s * 1.99, .15, z], undefined, .01);
    const plug = rounded(wiring, [.09, .09, .13], mat.plastic, [s * 1.99, .13, zs[2] + .3], undefined, .015);
    plug.name = 'Vehicle harness connector (' + tag + ')'; plug.userData.externalConnector = true;
  }

  /* ───────────────────────── coolant network (engine side) ───────────────────────── */
  {
    const hz = 1.34;
    const body = profile(cooling, [[-.5, -.7], [.5, -.7], [.55, -.55], [.5, -.45], [-.5, -.45], [-.55, -.55]], .28, mat.cast, [0, 0, hz], [], .03);
    body.name = 'Water pump / thermostat housing';
    cyl(cooling, .24, .06, mat.castLight, [0, -.58, hz + .17], 'z', 40);
    cyl(cooling, .09, .03, mat.castDark, [0, -.58, hz + .205], 'z', 24);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3 + .5; bolt(cooling, [Math.cos(a) * .18, -.58 + Math.sin(a) * .18, hz + .2], 'z', .8); }
    const thermo = cyl(cooling, .12, .08, mat.cast, [-.3, -.4, hz], 'y', 28);
    thermo.name = 'Mechanical thermostat cap';
    ring(cooling, .12, .012, mat.edge, [-.3, -.36, hz], 'y');
    for (const dz of [-.07, .07]) bolt(cooling, [-.3, -.345, hz + dz * 1.3], 'y', .7);
    cyl(cooling, .025, .07, mat.brass, [.28, -.4, hz], 'y', 18);
    rounded(cooling, [.06, .07, .07], mat.plastic, [.28, -.34, hz], undefined, .01);
    for (const x of [-.4, .4]) cyl(cooling, .05, .06, mat.cast, [x, -.58, 1.2 - .0], 'z', 16);

    const portR = coolingKit.port('housing-inlet-right', 'Housing inlet (right head)', [.55, -.58, hz], [1, 0, 0], .055, cooling, body);
    const portL = coolingKit.port('housing-inlet-left', 'Housing inlet (left head)', [-.55, -.58, hz], [-1, 0, 0], .055, cooling, body);
    const portOut = coolingKit.port('housing-radiator-outlet', 'Housing outlet to radiator', [0, -.7, hz], [0, -1, 0], .075, cooling, body);
    const rad = coolingKit.port('external-radiator-hose', 'External radiator hose connector (vehicle nose)', [0, -1.12, hz], [0, 1, 0], .075, cooling, null, true);
    coolingKit.connect(cooling, 'Right head outlet to housing', headPorts.right, portR, [], .055);
    coolingKit.connect(cooling, 'Left head outlet to housing', headPorts.left, portL, [], .055);
    coolingKit.connect(cooling, 'Housing outlet to radiator connector', portOut, rad, [], .075);
  }

  root.userData.engineArchitecture = { layout: 'flat6', cylinders: 6, banksPerSide: 3, camshaftsPerHead: 2, valvesPerCylinder: 4, illustrative: true };
  const network = coolingKit.network(['Vehicle radiator (nose)', 'Vehicle oil tank', 'Vehicle air duct', 'Vehicle A/C lines', 'Vehicle wiring harness']);
  return finishEngine(root, parts, { network, kit });
}

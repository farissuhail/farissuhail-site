/* ==========================================================================
   PETROLHEAD TECHNICA — turbocharged inline-four engine geometry
   --------------------------------------------------------------------------
   One builder, two engines:
     buildInline4(mat, 'ea888')  VW Sharan 7N 2.0 TSI (engine code CCZA)
     buildInline4(mat, 'n20')    BMW X4 F26 xDrive20i (N20B20)
   Authored procedurally for this site. Not manufacturer CAD, not a scan.

   Where the arrangement comes from (everything else is an anatomy study)
   EA888 · Volkswagen SSP 445 (Sharan 2011) gives the 2.0 TSI data sheet — code
     CCZA, 1,984 cc, 82.5 × 92.8 mm, four valves per cylinder, two balancer
     shafts, exchangeable turbo pressure capsule — and calls the engine
     "practically identical in design" to the 1.8 TSI described in SSP 401, which
     supplies the architecture used here: grey-iron closed-deck block; aluminium
     head with an aluminium head cover that carries the camshafts; aluminium upper
     + steel-plate lower sump; polyamide intake manifold carrying throttle and
     fuel rail; turbocharger forming one assembly with the exhaust manifold;
     high-pressure fuel pump on the exhaust camshaft; three chains at the timing
     end; belt-driven coolant pump module; an auxiliary bracket that carries the
     alternator, A/C compressor, oil filter and oil cooler.
   N20   · BMW N20 technical training (ST1111): die-cast aluminium crankcase +
     bedplate, three-layer spring-steel head gasket, arc-sprayed bores, forged
     crankshaft with four balance weights on five bearings (+14 mm crank offset),
     144.35 mm rods, 84 mm pistons, counterbalance shafts one above the other
     with the oil pump, central VANOS + Valvetronic III (servomotor, eccentric
     shaft, intermediate levers), head cover with integrated crankcase
     ventilation, twin-scroll turbo (cylinders 1+4 and 2+3 paired), DME on the
     intake manifold, high-pressure pump with welded rail lines, oil filter
     module with oil-to-coolant heat exchanger, electric coolant pump and map
     thermostat, main belt drive with alternator + A/C compressor, vacuum
     reservoir in the engine cover.
   Which SIDE and which END a unit sits on is illustrative. The timing-end cover
   plate is deliberately left out (open case frame) so the chain drive reads:
   that is a study decision, not the production part.
   ========================================================================== */
import * as THREE from 'three';
import { createKit, finishEngine, makePortFactory } from './engine-kit.js';

const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildInline4(mat, flavour = 'ea888') {
  const N20 = flavour === 'n20';
  const kit = createKit(mat);
  const { add, box, rounded, cyl, ring, bolt, ellipsoid, profile, lathe, sweep, hose, clamp } = kit;
  const root = new THREE.Group();
  root.name = N20 ? 'N20 engine' : 'EA888 engine';
  const parts = new Map();
  const part = (id, parent = root) => { const g = new THREE.Group(); g.name = id; parent.add(g); parts.set(id, g); return g; };
  const cached = (key, make) => (kit.cache[key] ||= make());
  const oriented = (m, dir) => { m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(...dir).normalize()); return m; };
  /** one-mesh hex bolt head with a dimpled centre (cached per scale), head toward `dir` */
  const boltGeo = sc => cached('bolt1:' + sc, () => {
    const g = new THREE.LatheGeometry([[0, -.0105], [.03, -.0105], [.03, .0105], [.016, .0105], [.0115, .0075], [0, .0075]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4) * sc, y * sc)), 6);
    g.computeVertexNormals(); return g;
  });
  const boltDir = (parent, xyz, dir, scale = 1) => oriented(add(parent, boltGeo(scale), mat.zinc, xyz), dir);
  /** cylinder along an arbitrary direction, centred at xyz */
  const cylDir = (parent, r, len, material, xyz, dir, seg = 28, rTop) => oriented(cyl(parent, r, len, material, xyz, 'y', seg, rTop), dir);
  /** ring (torus) whose axis is `dir` */
  const ringDir = (parent, r, w, material, xyz, dir) => {
    const m = ring(parent, r, w, material, xyz, 'z');
    m.quaternion.setFromUnitVectors(V3(0, 0, 1), V3(...dir).normalize());
    return m;
  };
  /** rounded box oriented so its local y runs along `dir` */
  const roundedDir = (parent, size, material, xyz, dir, r) => oriented(rounded(parent, size, material, xyz, undefined, r), dir);
  /** planar slab: polygon in (x, z) extruded vertically, centred at height yc */
  const plan = (parent, pts, h, material, yc, holes = [], bevel = .02, steps = 1) => {
    const m = profile(parent, pts, h, material, [0, yc, 0], holes, bevel, steps);
    m.rotation.x = PI / 2;
    return m;
  };
  const arcPts = (cx0, cy0, r, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx0 + Math.cos(a) * r, cy0 + Math.sin(a) * r]; });
  const rrect = (hx, hz, r, n = 4) => [
    ...arcPts(hx - r, hz - r, r, 0, PI / 2, n), ...arcPts(-hx + r, hz - r, r, PI / 2, PI, n),
    ...arcPts(-hx + r, -hz + r, r, PI, PI * 1.5, n), ...arcPts(hx - r, -hz + r, r, PI * 1.5, PI * 2, n)];
  /** toothed wheel (sprocket / gear) extruded along z */
  const gear = (parent, x, y, z, rRoot, rTip, teeth, thick, material) => {
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = i * PI * 2 / teeth, s = PI * 2 / teeth;
      pts.push([Math.cos(a) * rRoot, Math.sin(a) * rRoot], [Math.cos(a + s * .22) * rTip, Math.sin(a + s * .22) * rTip],
        [Math.cos(a + s * .52) * rTip, Math.sin(a + s * .52) * rTip], [Math.cos(a + s * .74) * rRoot, Math.sin(a + s * .74) * rRoot]);
    }
    return profile(parent, pts, thick, material, [x, y, z], [], Math.min(.006, thick / 4));
  };
  /** closed belt / chain route round pulleys listed CLOCKWISE seen from +z */
  function loopPath(pul, z) {
    const n = pul.length;
    const tg = pul.map((p, i) => { const q = pul[(i + 1) % n], dx = q.x - p.x, dy = q.y - p.y; return Math.atan2(dy, dx) + Math.acos(THREE.MathUtils.clamp((p.r - q.r) / Math.hypot(dx, dy), -1, 1)); });
    const path = [];
    for (let i = 0; i < n; i++) {
      const p = pul[i], q = pul[(i + 1) % n];
      let start = tg[(i + n - 1) % n], end = tg[i];
      while (end > start) end -= PI * 2;
      const count = Math.max(3, Math.ceil((start - end) * 8));
      for (let j = 0; j <= count; j++) { const a = start + (end - start) * j / count; path.push([p.x + Math.cos(a) * (p.r + .002), p.y + Math.sin(a) * (p.r + .002), z]); }
      const from = path[path.length - 1], to = [q.x + Math.cos(tg[i]) * (q.r + .002), q.y + Math.sin(tg[i]) * (q.r + .002), z];
      for (const t of [.25, .5, .75]) path.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, z]);
    }
    path.push([...path[0]]);
    return path;
  }

  /* ── layout constants (model units, 1 unit = 0.26 m) ───────────────── */
  const exS = N20 ? -1 : 1, inS = -exS;                // sign of the exhaust / intake side on x
  const P = N20 ? .346 : .338;                          // bore pitch
  const Zc = [1.5 * P, .5 * P, -.5 * P, -1.5 * P];      // cylinder 1 sits at the belt (+z) end
  const mains = [2 * P, P, 0, -P, -2 * P];
  const HL = 2 * P + .1, L = HL * 2;                    // half length / length of the casting set
  const crankY = .76, deck = 1.62, cx = N20 ? -.054 : 0; // N20: crankshaft offset +14 mm (illustrative side)
  const boreR = N20 ? .1615 : .1587, throwR = N20 ? .1723 : .1785, rodL = .554;
  const camX = .19, camY = 2.19, valveX = .285, valveDz = .075, flangeY = 2.02;
  const GASK = .014;                                    // gasket thickness
  mat.castDark.color.multiplyScalar(1.2);                  // lower mass stays dark but keeps its casting detail readable
  const blockMat = N20 ? mat.cast : mat.castDark;
  const headMat = N20 ? mat.castLight : mat.cast;

  const trim = part('engine-cover');
  const ignition = part('ignition');
  const head = part('cylinder-head');
  const camCover = part('cam-cover', head);
  const valvetrain = part('valvetrain', head);
  const gasket = part('head-gasket');
  const block = part('cylinder-block');
  const crank = part('crank-assembly');
  const sump = part('oil-sump');
  const dipstick = N20 ? null : part('dipstick');
  const intake = part('intake-manifold');
  const exhaust = part('exhaust-manifold');
  const turbo = part('turbocharger');
  const timing = part('timing-drive');
  const belt = part('belt-drive');
  const alternator = part('alternator');
  const compressor = part('ac-compressor');
  const oilFilter = part('oil-filter-housing');
  const fuel = part('fuel-system');
  const cooling = part('coolant-network');

  const ports = makePortFactory(kit, root);
  /** boss + visible port; returns the port record */
  function spigotPort(id, label, parent, mouth, dir, r, material, support, external = false, boss = true) {
    const d = V3(...dir).normalize(), m = V3(...mouth);
    if (boss && !external) {
      const len = .13;
      cylDir(parent, r + .026, len, material, m.clone().addScaledVector(d, -(len / 2 + .012)).toArray(), d.toArray(), 28);
      ringDir(parent, r + .029, .008, material, m.clone().addScaledVector(d, -.012).toArray(), d.toArray());
    }
    const rec = ports.port(id, label, mouth, dir, r, parent, support, external);
    if (external) {   // closed-off stub so it reads as the cut end of a vehicle pipe
      cylDir(parent, r, .006, mat.black, m.clone().addScaledVector(d, -.115).toArray(), d.toArray(), 28);
    }
    return rec;
  }

  /* ════════════════════════ CYLINDER BLOCK ════════════════════════ */
  {
    const holes = [...Zc.map(z => [0, z, boreR]),
      ...mains.flatMap(z => [-.43, .43].map(x => [x, z, .03]))];
    const slab = plan(block, rrect(.60, HL, .07, 4), .60, blockMat, 1.32, holes, .03, 14);
    {   // casting irregularity: the outer walls swell gently between cylinders (bores and deck stay flat)
      const pos = slab.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), wz = pos.getY(i), wy = 1.32 - pos.getZ(i);
        const side = THREE.MathUtils.clamp((Math.abs(x) - .5) * 9, 0, 1), mid = THREE.MathUtils.clamp(Math.sin((wy - 1.02) / .60 * PI) * 1.6, 0, 1);
        const swell = side * mid * (.011 * Math.sin(wz * 8.6 + .4) + .006 * Math.sin(wz * 15.3) + .004 * Math.sin(wy * 9));
        pos.setX(i, x + Math.sign(x) * swell);
      }
      slab.geometry.computeVertexNormals(); slab.geometry.computeBoundingSphere();
    }
    slab.name = N20 ? 'Die-cast aluminium crankcase, upper deck' : 'Closed-deck grey-iron block, upper deck';
    // bore liners: inward-facing dark shells, so each bore reads as deep, with a machined lip at the deck
    Zc.forEach((z, i) => {
      const liner = lathe(block, [[boreR - .002, 1.616], [boreR - .002, 1.03]], mat.recess, [0, 0, z], undefined, 40);
      liner.name = 'Cylinder bore ' + (i + 1);
      ring(block, boreR + .004, .007, mat.edge, [0, deck - .003, z], 'y');
    });
    for (const side of [-1, 1]) {
      const x = side * .60;
      profile(block, [[side * .36, 1.05], [x, 1.05], [x, .92], [side * .555, .60], [side * .50, .50], [side * .36, .50]], L - .2, blockMat, [0, 0, 0], [], .03);
      for (const z of mains) rounded(block, [.05, .46, .06], blockMat, [x + side * .012, .79, z], [0, 0, side * .06], .014);
      rounded(block, [.035, .035, L - .1], N20 ? mat.castDark : mat.castLight, [x + side * .014, 1.0, 0], undefined, .01);
      for (const z of [Zc[0], Zc[3]]) {                    // core plugs
        cyl(block, .07, .02, mat.recess, [x + side * .006, 1.30, z], 'x', 24);
        cyl(block, .06, .014, mat.zinc, [x + side * .016, 1.30, z], 'x', 24);
      }
      for (const z of [mains[1], mains[3]]) boltDir(block, [x + side * .008, 1.42, z], [side, 0, 0], .8);
    }
    if (N20) for (const side of [-1, 1]) rounded(block, [.012, .022, L - .2], mat.gasket, [side * .604, .64, 0], undefined, .004);  // bedplate seam
    // end plates with a crank slot that opens downward, so the crank can drop out
    const slotPts = [[-.60, 1.05], [.60, 1.05], [.60, .92], [.555, .60], [.50, .50], [cx + .125, .50],
      ...arcPts(cx, crankY, .125, 0, PI, 10), [cx - .125, .50], [-.50, .50], [-.555, .60], [-.60, .92]];
    for (const s of [-1, 1]) profile(block, slotPts, .10, blockMat, [0, 0, s * (HL - .05)], [], .03);
    // thin main-bearing arches, sitting in the gap between neighbouring pistons
    for (const z of mains.slice(1, 4)) {
      profile(block, [[-.36, 1.03], [-.36, .56], [cx - .122, .56], ...arcPts(cx, crankY, .122, PI, 0, 10), [cx + .122, .56], [.36, .56], [.36, 1.03]], .024, blockMat, [0, 0, z], [], .006);
    }
    // gearbox-end flange (bell-housing face)
    profile(block, [[-.66, 1.30], [.66, 1.30], [.70, 1.0], [.68, .60], [.55, .46], [cx + .15, .46], ...arcPts(cx, crankY, .15, 0, PI, 10), [cx - .15, .46], [-.55, .46], [-.68, .60], [-.70, 1.0]], .05, blockMat, [0, 0, -HL - .02], [], .02);
    for (const [x, y] of [[-.60, 1.22], [.60, 1.22], [-.62, .72], [.62, .72], [0, 1.22], [-.40, .52]]) boltDir(block, [x, y, -HL - .046], [0, 0, -1], .9);
    for (const side of [-1, 1]) rounded(block, [.07, .06, .09], blockMat, [side * .63, 1.5, HL - .12], [0, 0, side * .1], .02);
    cyl(block, .045, .05, N20 ? mat.castDark : mat.cast, [exS * .64, 1.15, P], 'x', 20);   // sensor boss
    // exhaust-side engine-mount lug
    rounded(block, [.13, .26, .28], blockMat, [exS * .665, .92, .46], [0, 0, exS * .08], .03);
    cyl(block, .05, .06, mat.recess, [exS * .735, .92, .46], 'x', 22);
    ring(block, .052, .01, mat.edge, [exS * .735, .92, .46], 'x');
    if (!N20) {
      // thick-particle oil separator for the crankcase vent, on the intake side of the block (SSP 401)
      rounded(block, [.15, .34, .50], mat.castDark, [inS * .68, 1.17, -.17], [0, 0, -inS * .06], .035).name = 'Oil-vapour separator housing';
      for (const dz of [-.16, 0, .16]) rounded(block, [.04, .24, .035], mat.castDark, [inS * .765, 1.17, -.17 + dz], undefined, .01);
      cylDir(block, .028, .08, mat.plastic, [inS * .70, 1.375, -.17], [0, 1, 0], 16);
      for (const dz of [-.2, .2]) boltDir(block, [inS * .76, 1.05, -.17 + dz], [inS, 0, 0], .8);
    }
  }

  /* ════════════════════════ HEAD GASKET ════════════════════════ */
  {
    const holes = [...Zc.map(z => [0, z, boreR + .004]),
      ...mains.flatMap(z => [-.43, .43].map(x => [x, z, .036])),
      ...[-1, 1].flatMap(s => [Zc[0] + .17, 0, Zc[3] - .17].map(z => [s * .525, z, .026]))];
    plan(gasket, rrect(.60, HL, .07, 4), GASK, mat.gasket, deck + GASK / 2, holes, .004);
    for (const z of Zc) {   // welded stopper-plate bead around each bore (N20 training: three-layer spring-steel gasket)
      ring(gasket, boreR + .014, .0075, mat.steel, [0, deck + GASK, z], 'y');
      ring(gasket, boreR + .026, .0035, mat.edge, [0, deck + GASK + .001, z], 'y');
    }
    for (const s of [-1, 1]) rounded(gasket, [1.19, .004, .012], mat.edge, [0, deck + GASK - .001, s * (HL - .012)], undefined, .002);
  }

  /* ════════════════════════ CYLINDER HEAD ════════════════════════ */
  const hy = deck + GASK;     // head underside
  {
    const headPts = N20
      ? [[-.60, hy], [.60, hy], [.60, 1.80], [.575, 1.96], [.52, 2.02], [.47, 2.02], [.47, 1.92], [-.47, 1.92], [-.47, 2.02], [-.52, 2.02], [-.575, 1.96], [-.60, 1.80]]
      : [[-.60, hy], [.60, hy], [.60, 1.90], [.55, 2.00], [.47, 2.02], [.47, 1.92], [-.47, 1.92], [-.47, 2.02], [-.55, 2.00], [-.60, 1.90]];
    const casting = profile(head, headPts, L, headMat, [0, 0, 0], [], .028);
    casting.name = 'Four-valve aluminium cylinder head';
    // end ribs close the cam trough and carry the cover end walls
    for (const s of [-1, 1]) rounded(head, [.94, .12, .05], headMat, [0, 1.96, s * (HL - .025)], undefined, .012);
    // cam carrier webs with bowl-shaped bearing seats (the upper half-bearings live in the cover)
    for (const z of mains) {
      const seat = x => arcPts(x, camY, .066, 0, -PI, 10);
      profile(head, [[-.34, 1.90], [.34, 1.90], [.34, camY], ...seat(camX), ...seat(-camX), [-.34, camY]], .05, headMat, [0, 0, z], [], .006);
    }
    for (const z of Zc) {   // spark-plug wells between the cams
      cyl(head, .074, .20, headMat, [0, 2.02, z], 'y', 28);
      cyl(head, .052, .012, mat.recess, [0, 2.122, z], 'y', 24);
      ring(head, .074, .006, mat.edge, [0, 2.12, z], 'y');
    }
    for (const z of mains) for (const x of [-.43, .43]) boltDir(head, [x, 1.925, z], [0, 1, 0], 1.0);
    // machined flange pads and port mouths: two ports per cylinder each side
    for (const [side, kind] of [[inS, 'intake'], [exS, 'exhaust']]) {
      const x = side * .60;
      for (const z of Zc) {
        rounded(head, [.045, .30, .31], mat.edge, [x + side * .02, 1.80, z], undefined, .012);
        for (const dz of [-valveDz, valveDz]) {
          cyl(head, kind === 'intake' ? .062 : .054, .02, mat.recess, [x + side * .044, 1.80, z + dz], 'x', 24);
          ringDir(head, kind === 'intake' ? .065 : .057, .006, mat.edge, [x + side * .043, 1.80, z + dz], [side, 0, 0]);
        }
        for (const [dy, dz] of [[.115, -.135], [.115, .135], [-.115, -.135], [-.115, .135]]) boltDir(head, [x + side * .044, 1.80 + dy, z + dz], [side, 0, 0], .7);
      }
    }
    for (const side of [-1, 1]) {
      rounded(head, [.03, .06, L - .12], mat.cast, [side * .61, 1.66, 0], undefined, .01);
      for (const z of mains) rounded(head, [.03, .2, .05], headMat, [side * .614, 1.76, z], undefined, .01);
    }
  }

  /* ════════════════════════ CYLINDER-HEAD COVER ════════════════════════
     EA888 (SSP 401): aluminium alloy, bolted on and liquid-sealed, it HOLDS the
     camshafts and stiffens the head; plastic plugs give access to the head bolts.
     N20 (training ref.): new cover with crankcase ventilation integrated. */
  {
    const hl = HL - .03;
    const lidPts = N20
      ? [[-.58, flangeY], [-.58, 2.20], [-.52, 2.32], [.52, 2.32], [.58, 2.20], [.58, flangeY], [.54, flangeY], [.54, 2.19], [.49, 2.28], [-.49, 2.28], [-.54, 2.19], [-.54, flangeY]]
      : [[-.58, flangeY], [-.58, 2.22], [-.50, 2.34], [.50, 2.34], [.58, 2.22], [.58, flangeY], [.54, flangeY], [.54, 2.21], [.47, 2.30], [-.47, 2.30], [-.54, 2.21], [-.54, flangeY]];
    const cover = profile(camCover, lidPts, hl * 2, N20 ? mat.cast : mat.castLight, [0, 0, 0], [], .02);
    cover.name = N20 ? 'Head cover with integrated crankcase ventilation' : 'Aluminium head cover carrying the camshafts';
    // end walls, notched underneath where camshaft noses (and the Valvetronic eccentric shaft) leave
    const spans = N20
      ? [[exS, camX - .07, camX + .07, camY + .07], [inS, .12, .36, 2.28]]
      : [[exS, camX - .07, camX + .07, camY + .07], [inS, camX - .07, camX + .07, camY + .07]];
    const wallPts = [[-.58, flangeY], [-.58, 2.20], [-.52, 2.32], [.52, 2.32], [.58, 2.20], [.58, flangeY]];
    const xr = spans.map(([s, a, b, t]) => s > 0 ? [a, b, t] : [-b, -a, t]).sort((p, q) => q[0] - p[0]);
    for (const [a, b, t] of xr) wallPts.push([b, flangeY], [b, t], [a, t], [a, flangeY]);
    for (const s of [-1, 1]) profile(camCover, wallPts, .035, N20 ? mat.cast : mat.castLight, [0, 0, s * (HL - .02)], [], .008);
    // seal bosses on the end walls where the camshaft noses pass through
    for (const s of [-1, 1]) for (const cs of [1, -1]) {
      const bx2 = cs * camX;
      if (N20 && cs === inS) continue;
      ringDir(camCover, .075, .014, N20 ? mat.cast : mat.castLight, [bx2, camY, s * (HL - .02) + s * .019], [0, 0, s]);
    }
    // upper half-bearing caps hang from the roof, one over each camshaft journal
    for (const z of mains) for (const s of [-1, 1]) {
      rounded(camCover, [.17, .10, .054], mat.castLight, [s * camX, 2.245, z], undefined, .016);
      boltDir(camCover, [s * camX, 2.304, z], [0, 1, 0], .7);
    }
    // plug-tube bosses over each spark plug; the coil passes through
    for (const z of Zc) {
      cyl(camCover, .094, .20, N20 ? mat.cast : mat.castLight, [0, 2.30, z], 'y', 32);
      cyl(camCover, .066, .012, mat.recess, [0, 2.401, z], 'y', 28);
      ring(camCover, .094, .008, N20 ? mat.castLight : mat.edge, [0, 2.398, z], 'y');
    }
    // casting ribs across the lid, between the plug-tube bosses and the head-bolt plugs
    for (const z of N20 ? [mains[1], mains[2], mains[3]] : mains) rounded(camCover, [N20 ? .34 : .74, .016, .034], N20 ? mat.cast : mat.castLight, [N20 ? exS * .25 : 0, N20 ? 2.325 : 2.345, z], undefined, .006);
    // perimeter flange with bolts
    for (const s of [-1, 1]) {
      rounded(camCover, [.05, .014, hl * 2 - .08], N20 ? mat.cast : mat.castLight, [s * .60, flangeY + .014, 0], undefined, .005);
      for (const z of [-.7, -.47, -.23, 0, .23, .47, .7]) boltDir(camCover, [s * .60, flangeY + .03, z], [0, 1, 0], .62);
    }
    if (!N20) {
      // plastic head-bolt access plugs over the ten head bolts, oil filler at the belt end
      for (const z of mains) for (const x of [-.43, .43]) cyl(camCover, .03, .02, mat.plastic, [x, 2.345, z], 'y', 16);
      cyl(camCover, .075, .05, mat.plastic, [inS * .26, 2.36, Zc[0] + .02], 'y', 32);
      ring(camCover, .078, .008, mat.recess, [inS * .26, 2.385, Zc[0] + .02], 'y');
      // vapour separator housing on the lid, intake side
      rounded(camCover, [.15, .06, .55], mat.castLight, [inS * .30, 2.355, Zc[2] - .08], undefined, .014);
    } else {
      // crankcase-ventilation module: raised housing + three connection nipples (illustrative)
      rounded(camCover, [.22, .075, .95], mat.castDark, [inS * .33, 2.35, -.02], undefined, .02);
      for (const z of [-.40, .08, .46]) { cylDir(camCover, .028, .10, mat.black, [inS * .44, 2.37, z], [inS, .35, 0], 18); ringDir(camCover, .03, .006, mat.zinc, [inS * .49, 2.385, z], [inS, .35, 0]); }
      cyl(camCover, .072, .05, mat.plastic, [exS * .30, 2.355, Zc[0]], 'y', 32);       // oil filler
      ring(camCover, .075, .008, mat.recess, [exS * .30, 2.38, Zc[0]], 'y');
      for (const z of mains) for (const x of [-.43, .43]) cyl(camCover, .028, .02, mat.recess, [x, 2.338, z], 'y', 14);
    }
  }

  /* ════════════════════════ VALVETRAIN ════════════════════════
     Two cam lines, four valves per cylinder (16). Roller rocker fingers on
     hydraulic lash adjusters; N20 adds Valvetronic III on the intake side
     (eccentric shaft + intermediate levers + servomotor). */
  {
    const lobeGeo = cached('lobe', () => {
      const s = new THREE.Shape();
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * PI * 2, r = .056 + .05 * Math.pow(Math.max(0, Math.cos(a)), 5);
        i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const g = new THREE.ExtrudeGeometry(s, { depth: .026, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2, curveSegments: 4 });
      g.translate(0, 0, -.013); g.computeVertexNormals();
      return g;
    });
    const camLen = 1.74, camZ0 = -.80;
    for (const [side, name] of [[inS, 'Intake camshaft'], [exS, 'Exhaust camshaft']]) {
      const x = side * camX;
      const cam = cyl(valvetrain, .042, camLen, mat.steel, [x, camY, camZ0 + camLen / 2], 'z', 24);
      cam.name = name; cam.userData.camshaft = side === inS ? 'intake' : 'exhaust';
      for (const z of mains) cyl(valvetrain, .06, .05, mat.edge, [x, camY, z], 'z', 28);
      Zc.forEach((zc, i) => {
        for (const dz of [-valveDz, valveDz]) {
          const lobe = add(valvetrain, lobeGeo, mat.edge, [x, camY, zc + dz], [0, 0, (i % 2 ? PI : 0) + dz * 6 + (side === inS ? .5 : 1.2)]);
          lobe.userData.valveStation = { cylinder: i + 1, cam: cam.userData.camshaft, pair: dz < 0 ? 1 : 2 };
        }
      });
    }
    // valves: spring, retainer, stem tip, lash adjuster, roller finger and its roller
    const springGeo = cached('valveSpring', () => {
      const pts = [[0, -.05], [.034, -.05], [.034, -.04]];
      for (let k = 0; k < 6; k++) { const y0 = -.038 + k * .0165; pts.push([.0345, y0], [.0385, y0 + .006], [.0385, y0 + .01], [.0345, y0 + .0165 - .002]); }
      pts.push([.034, .045], [.034, .05], [.031, .05], [.031, .062], [.011, .062], [.011, .105], [0, .105]);   // retainer and stem tip
      const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 18); g.computeVertexNormals(); return g;
    });
    for (const side of [inS, exS]) for (const [i, zc] of Zc.entries()) for (const dz of [-valveDz, valveDz]) {
      const z = zc + dz, xv = side * valveX, xh = side * .115;
      const spring = add(valvetrain, springGeo, mat.steel, [xv, 1.98, z]);
      spring.name = `Valve spring ${i + 1}${side === inS ? 'I' : 'E'}${dz < 0 ? 1 : 2}`;
      cyl(valvetrain, .02, .075, mat.zinc, [xh, 2.02, z], 'y', 14);
      const finger = rounded(valvetrain, [.19, .034, .044], mat.edge, [side * .2, 2.075, z], undefined, .01);
      finger.name = 'Roller rocker finger';
      cyl(valvetrain, .027, .04, mat.steel, [side * camX, 2.103, z], 'z', 18);
    }
    // camshaft rear ends: high-pressure pump drive on the exhaust cam
    for (const rz of [0, PI / 2]) rounded(valvetrain, [.19, .06, .03], mat.edge, [exS * camX, camY, -.835], [0, 0, rz], .02);   // four-lobe cam for the pump
    if (N20) {
      // Valvetronic III: eccentric shaft above the intake valves, bearing on the carrier webs, plus a lever per valve
      const ex = inS * .305, ey = 2.228;
      const ecc = cyl(valvetrain, .03, 1.62, mat.steel, [ex, ey, -.08], 'z', 22);
      ecc.name = 'Valvetronic eccentric shaft';
      for (const z of mains) rounded(valvetrain, [.1, .045, .048], mat.castLight, [ex, ey + .035, z], undefined, .012);
      Zc.forEach(zc => {
        ellipsoid(valvetrain, [.05, .05, .02], mat.edge, [ex, ey, zc], [0, 0, .4]);         // eccentric lobe
        for (const dz of [-valveDz, valveDz]) {
          const lever = roundedDir(valvetrain, [.026, .17, .032], mat.steel, [inS * .245, 2.165, zc + dz], [inS * -0.58, .8, 0], .008);
          lever.name = 'Intermediate lever';
          cyl(valvetrain, .02, .036, mat.zinc, [inS * .215, 2.11, zc + dz], 'z', 16);
          rounded(valvetrain, [.02, .06, .02], mat.steel, [inS * .275, 2.11, zc + dz], [0, 0, inS * .3], .004);   // guide-block spring
        }
      });
      // servomotor and worm sector at the gearbox end of the eccentric shaft
      const sec = cyl(valvetrain, .082, .03, mat.castLight, [ex, ey, -.86], 'z', 36);
      sec.name = 'Valvetronic worm sector';
      for (let k = 0; k < 14; k++) { const a = -PI / 2 + (k - 6.5) * .17; rounded(valvetrain, [.012, .018, .026], mat.steel, [ex + Math.cos(a) * .088, ey + Math.sin(a) * .088 + .0, -.86], [0, 0, a - PI / 2], .003); }
      const mx = inS * (.305 + .105), my = ey - .098, mz = -.90;
      const motor = cylDir(valvetrain, .068, .22, mat.black, [mx, my, mz], [inS, 0, 0], 32);
      motor.name = 'Valvetronic servomotor';
      ringDir(valvetrain, .07, .01, mat.zinc, [inS * (.305 + .004), my, mz], [inS, 0, 0]);          // worm housing collar
      cylDir(valvetrain, .03, .07, mat.steel, [inS * (.305 + .05), my, mz], [inS, 0, 0], 16);       // worm
      rounded(valvetrain, [.09, .075, .09], mat.plastic, [inS * (.305 + .235), my, mz], undefined, .015);   // connector
    }
  }

  /* ════════════════════════ CRANKSHAFT, RODS, PISTONS ════════════════════════
     Five main journals, four throws (1-4 up / 2-3 down: firing order 1-3-4-2),
     rods SOLVED from the 144 mm length so each reaches its piston pin. N20: four
     balance weights, crank axis offset 14 mm from the bore axis. EA888: eight. */
  {
    const th0 = .55, th = [th0, th0 + PI, th0 + PI, th0];
    const zRear = -HL - .115, zNose = 1.09;
    cyl(crank, .082, zNose - zRear, mat.steel, [cx, crankY, (zNose + zRear) / 2], 'z', 28);
    for (const z of mains) {
      cyl(crank, .105, .08, mat.edge, [cx, crankY, z], 'z', 32);
      rounded(crank, [.24, .09, .056], mat.castDark, [cx, crankY - .125, z], undefined, .016);      // bearing cap
      for (const dx of [-.095, .095]) boltDir(crank, [cx + dx, crankY - .172, z], [0, -1, 0], .8);
    }
    // rear flange with its bolt circle, and the front nose collar
    cyl(crank, .20, .05, mat.steel, [cx, crankY, -HL - .09], 'z', 44);
    cyl(crank, .16, .02, mat.recess, [cx, crankY, -HL - .125], 'z', 40);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3 + .3; boltDir(crank, [cx + Math.cos(a) * .14, crankY + Math.sin(a) * .14, -HL - .142], [0, 0, -1], .8); }
    cyl(crank, .115, .06, mat.steel, [cx, crankY, HL - .04], 'z', 32);
    const webShape = weighted => {
      const pts = [...arcPts(0, throwR, .095, 0, PI, 10), [-.105, .05]];
      if (weighted) pts.push(...arcPts(0, 0, .27, 3.752, 5.672, 12), [.105, .05]);
      else pts.push([-.105, .03], ...arcPts(0, 0, .12, PI, PI * 2, 8), [.105, .03]);
      return pts;
    };
    const weightedSet = N20 ? [0, 3, 4, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
    Zc.forEach((z, i) => {
      const a = th[i], pin = V3(cx + Math.sin(a) * throwR, crankY + Math.cos(a) * throwR, z);
      cyl(crank, .088, .125, mat.edge, [pin.x, pin.y, z], 'z', 28);
      [1, -1].forEach((sgn, k) => {
        const idx = i * 2 + k, web = profile(crank, webShape(weightedSet.includes(idx)), .045, mat.steel, [cx, crankY, z + sgn * .105], [], .008);
        web.rotation.z = -a; web.name = weightedSet.includes(idx) ? 'Crank web with counterweight' : 'Crank web';
      });
      // piston pin height solved so the rod really spans pin → piston
      const dx = pin.x - 0, yp = pin.y + Math.sqrt(rodL * rodL - dx * dx);
      const top = V3(0, yp, z), rod = top.clone().sub(pin), len = rod.length(), dir = rod.clone().normalize();
      const body = roundedDir(crank, [.07, len - .2, .05], mat.steel, pin.clone().addScaledVector(dir, len / 2).toArray(), dir.toArray(), .018);
      body.name = 'Connecting rod ' + (i + 1);
      const big = cylDir(crank, .105, .1, mat.steel, [pin.x, pin.y, z], [0, 0, 1], 32);
      cyl(crank, .062, .105, mat.recess, [pin.x, pin.y, z], 'z', 24);
      for (const s of [-1, 1]) boltDir(crank, pin.clone().addScaledVector(dir, -.105).add(V3(s * .06, 0, 0)).toArray(), dir.clone().multiplyScalar(-1).toArray(), .6);
      cyl(crank, .052, .062, mat.steel, [top.x, top.y, z], 'z', 22);
      const pg = new THREE.Group(); pg.name = 'Piston ' + (i + 1); pg.position.copy(top); crank.add(pg);
      const pr = boreR - .004;
      lathe(pg, [[0, -.09], [pr - .045, -.104], [pr - .02, -.104], [pr, -.08], [pr, .104], [pr - .004, .113], [pr - .014, .115], [.07, .098], [0, .088]], mat.castLight, [0, 0, 0], undefined, 40);
      for (const yy of [.082, .058, .036]) ring(pg, pr + .0005, .0045, mat.recess, [0, yy, 0], 'y');
      cyl(pg, .031, .27, mat.edge, [0, 0, 0], 'z', 16);
    });
  }

  /* ════════════════════════ OIL SUMP + OIL-PUMP / BALANCER MODULE ════════════════════════
     EA888 (SSP 401): aluminium upper sump holds the oil pump, steel-plate lower
     sump is sealed with liquid sealant. N20: the oil pump with counterbalance shafts
     covers the whole sump and doubles as a windage tray. Here both are drawn as an
     open pan around a ladder module so the shafts can be seen when the crank leaves. */
  {
    const panMat = N20 ? mat.castDark : mat.steel, hs = HL - .04;
    for (const s of [-1, 1]) {
      rounded(sump, [.10, .035, L], N20 ? mat.cast : mat.castLight, [s * .53, .482, 0], undefined, .01);          // flange rails
      rounded(sump, [1.02, .035, .10], N20 ? mat.cast : mat.castLight, [0, .482, s * (HL - .05)], undefined, .01);
      profile(sump, [[s * .575, .48], [s * .515, .48], [s * .445, .16], [s * .5, .16]], L - .06, panMat, [0, 0, 0], [], .008);   // sloped side walls
      profile(sump, [[-.545, .48], [.545, .48], [.475, .16], [-.475, .16]], .03, panMat, [0, 0, s * (HL - .03)], [], .008);       // end walls
    }
    rounded(sump, [.96, .028, L - .06], panMat, [0, .152, 0], undefined, .008);
    for (const s of [-1, 1]) { rounded(sump, [.10, .006, L], mat.gasket, [s * .53, .504, 0], undefined, .002); rounded(sump, [1.02, .006, .10], mat.gasket, [0, .504, s * (HL - .05)], undefined, .002); }
    for (const x of [-.3, -.1, .1, .3]) rounded(sump, [.04, .02, L - .3], panMat, [x, .136, 0], undefined, .008);   // bottom ribs
    for (const s of [-1, 1]) for (const z of [-.62, -.31, 0, .31, .62]) boltDir(sump, [s * .53, .462, z], [0, -1, 0], .8);
    cyl(sump, .052, .036, mat.zinc, [.14, .128, -.2], 'y', 6);                                                    // drain plug
    // module: tray with a hole under each throw, long balancer housing and the oil pump
    const tray = plan(sump, rrect(.46, HL - .07, .05), .026, N20 ? mat.cast : mat.castLight, .30,
      Zc.map(z => [cx, z, .12]), .006);
    tray.name = 'Windage tray / pump module';
    const bs = N20 ? -1 : 1;                      // balancer side (illustrative)
    const hx = bs * .42;
    rounded(sump, [.17, .17, 1.32], N20 ? mat.cast : mat.castLight, [hx, .395, .02], undefined, .03);
    for (const [sy, nm] of [[.355, 'Lower counterbalance shaft'], [.43, 'Upper counterbalance shaft']]) {
      const sh = cyl(sump, .033, 1.52, mat.steel, [hx, sy, .06], 'z', 20); sh.name = nm;
    }
    for (const z of [-.5, -.25, 0, .25, .5]) { cyl(sump, .052, .028, mat.edge, [hx, .43, z], 'z', 20); cyl(sump, .052, .028, mat.edge, [hx, .355, z], 'z', 20); }
    // pump: EA888 chain-driven at the belt end, N20 at the flywheel end with a long drive shaft
    const pz = N20 ? -HL + .2 : HL - .2;
    const pump = cyl(sump, .095, .15, N20 ? mat.cast : mat.castLight, [bs * .25, .365, pz], 'z', 32);
    pump.name = 'Oil pump';
    cyl(sump, .06, .02, mat.zinc, [bs * .25, .365, pz + (N20 ? -.085 : .085)], 'z', 24);
    rounded(sump, [.2, .06, .08], N20 ? mat.cast : mat.castLight, [bs * .34, .39, pz], undefined, .02);
    // suction pipe to the pan floor
    hose(sump, [[bs * .25, .33, pz], [bs * .25, .24, pz + (N20 ? .05 : -.05)], [bs * .15, .185, pz + (N20 ? .08 : -.08)]], .028, 0, mat.steel);
    rounded(sump, [.12, .026, .12], mat.steel, [bs * .15, .178, pz + (N20 ? .08 : -.08)], undefined, .01);
    // level sensor on the pan wall (EA888: G266 in the lower sump; N20: thermal oil-level sensor)
    cylDir(sump, .03, .08, mat.black, [-.52, .30, HL - .14], [-1, -.3, 0], 18);
    rounded(sump, [.05, .06, .04], mat.plastic, [-.56, .286, HL - .14], [0, 0, .25], .01);
  }

  /* ════════════════════════ DIPSTICK (EA888 only) ════════════════════════
     The N20 training text describes electronic oil-level monitoring and never
     mentions a dipstick, so none is modelled for the BMW. */
  if (dipstick) {
    const tx = -.645, tz = .22;
    cyl(dipstick, .036, .06, mat.castLight, [tx, .60, tz], 'y', 20);
    hose(dipstick, [[tx, .60, tz], [tx - .01, 1.0, tz], [tx - .005, 1.38, tz]], .014, 0, mat.steel);
    cyl(dipstick, .022, .06, mat.black, [tx - .005, 1.40, tz], 'y', 20);
    const grip = sweep(dipstick, [[tx - .005, 1.43, tz - .07], [tx - .005, 1.50, tz - .05], [tx - .005, 1.55, tz], [tx - .005, 1.50, tz + .05], [tx - .005, 1.43, tz + .07]], .018, .018, mat.brass, { steps: 24, sides: 12 });
    grip.name = 'Dipstick ring handle';
  }

  /* ════════════════════════ TIMING DRIVE (chain end, +z) ════════════════════════
     Open case frame (cover plate omitted for the study), chain loops, sprockets,
     guides and tensioner. EA888: three chains (camshafts, balancer shafts, oil
     pump), variator on the intake cam only. N20: primary chain to two VANOS
     units, tooth-type secondary chain to the counterbalance shafts. */
  const zf = HL + .06;
  const bs = N20 ? -1 : 1;                              // balancer side (matches the sump module)
  const camPulleys = [{ x: cx, y: crankY, r: .112 }, { x: -camX, y: camY, r: .15 }, { x: camX, y: camY, r: .15 }];
  {
    const railMat = N20 ? mat.cast : mat.castDark, upMat = N20 ? mat.cast : mat.plastic;
    for (const s of [-1, 1]) {
      rounded(timing, [.05, 1.10, .12], railMat, [s * .575, 1.075, zf], undefined, .012);
      rounded(timing, [.05, .40, .12], upMat, [s * .575, 1.83, zf], undefined, .012);
      for (const y of [.62, 1.0, 1.35]) boltDir(timing, [s * .575, y, zf + .062], [0, 0, 1], .8);
    }
    rounded(timing, [1.15, .06, .12], upMat, [0, 2.0, zf], undefined, .012);
    rounded(timing, [1.15, .05, .12], railMat, [0, 1.63, zf], undefined, .008);
    rounded(timing, [1.15, .012, .124], mat.gasket, [0, 1.612, zf], undefined, .003);
    rounded(timing, [1.0, .05, .12], railMat, [0, .53, zf], undefined, .012);
    for (const [x, y] of [[-.575, 2.0], [.575, 2.0], [-.575, .53], [.575, .53], [0, 2.0], [0, .53]]) boltDir(timing, [x, y, zf + .062], [0, 0, 1], .8);
    // crank sprocket + the sprockets / variators on the cams
    cyl(timing, .09, .09, mat.steel, [cx, crankY, zf + .005], 'z', 28);
    gear(timing, cx, crankY, zf + .015, .108, .126, 22, .05, mat.steel);
    for (const sgn of [-1, 1]) {
      const x = sgn * camX, intakeCam = sgn === inS;
      gear(timing, x, camY, zf + .015, .138, .158, 26, .045, mat.steel);
      if (N20 || intakeCam) {   // VANOS unit (N20 both cams) / variator (EA888 intake cam)
        cyl(timing, .135, .07, mat.castLight, [x, camY, zf + .075], 'z', 36);
        ring(timing, .13, .008, mat.recess, [x, camY, zf + .112], 'z');
        boltDir(timing, [x, camY, zf + .118], [0, 0, 1], 1.5);
        for (let k = 0; k < 6; k++) { const a = k * PI / 3 + .2; cyl(timing, .012, .01, mat.recess, [x + Math.cos(a) * .09, camY + Math.sin(a) * .09, zf + .112], 'z', 10); }
      } else {
        cyl(timing, .06, .035, mat.zinc, [x, camY, zf + .055], 'z', 24);
        boltDir(timing, [x, camY, zf + .075], [0, 0, 1], 1.2);
      }
    }
    // primary chain round crank + both cam sprockets (clockwise seen from +z)
    const chain = sweep(timing, loopPath(camPulleys, zf + .015), .011, .026, mat.steel, { planar: true, steps: 420, sides: 10, corrugate: 140 });
    chain.name = N20 ? 'Primary timing chain' : 'Camshaft timing chain';
    // guide + tension rails run just inside the long chain runs; tensioner housing behind the tension rail
    const runOf = (pl, k) => {
      const n = pl.length, a = pl[k], b = pl[(k + 1) % n], dx = b.x - a.x, dy = b.y - a.y;
      const ang = Math.atan2(dy, dx) + Math.acos(THREE.MathUtils.clamp((a.r - b.r) / Math.hypot(dx, dy), -1, 1)), o = V3(Math.cos(ang), Math.sin(ang), 0);
      const P = V3(a.x, a.y, 0).addScaledVector(o, a.r), Q = V3(b.x, b.y, 0).addScaledVector(o, b.r), u = Q.clone().sub(P).normalize();
      return { P, Q, u, inward: o.clone().multiplyScalar(-1) };
    };
    const mkRail = (run, t0, t1, bow, nm) => {
      const len = run.P.distanceTo(run.Q), a = run.P.clone().addScaledVector(run.u, len * t0), b = run.P.clone().addScaledVector(run.u, len * t1);
      const off = run.inward.clone().multiplyScalar(.04);
      const pts = [a, a.clone().lerp(b, .5).addScaledVector(run.inward, bow), b].map(p => [p.x + off.x, p.y + off.y, zf + .015]);
      const m = sweep(timing, pts, .012, .026, mat.plastic, { planar: true, steps: 24, sides: 8 }); m.name = nm;
      return run.P.clone().lerp(run.Q, .5).addScaledVector(run.inward, .1);
    };
    const runL = runOf(camPulleys, 0), runR = runOf(camPulleys, 2);
    mkRail(runL, .12, .88, -.012, 'Chain guide rail');
    mkRail(runR, .12, .88, .02, 'Chain tension rail');
    const tp = runR.P.clone().lerp(runR.Q, .62).addScaledVector(runR.inward, .115);
    cylDir(timing, .032, .13, mat.zinc, tp.toArray().map((c, ci) => ci === 2 ? zf + .015 : c), [runR.inward.x, runR.inward.y, 0], 20).name = 'Chain tensioner';
    ringDir(timing, .036, .006, mat.steel, [tp.x + runR.inward.x * .065, tp.y + runR.inward.y * .065, zf + .015], [runR.inward.x, runR.inward.y, 0]);
    for (const [r, t] of [[runL, .12], [runL, .88], [runR, .12]]) {
      const p = r.P.clone().lerp(r.Q, t).addScaledVector(r.inward, .055);
      cyl(timing, .014, .03, mat.zinc, [p.x, p.y, zf + .015], 'z', 10);
    }
    // secondary drive(s) at the front of the balancer / oil-pump module
    const cbX = bs * .42, cbY = .43;
    const second = N20
      ? [[[{ x: cx, y: crankY, r: .088 }, { x: cbX, y: cbY, r: .075 }], zf - .035, 'Tooth-type secondary chain (counterbalance shafts)']]
      : [[[{ x: cx, y: crankY, r: .088 }, { x: cbX, y: cbY, r: .075 }], zf - .05, 'Balancer-shaft chain'], [[{ x: cx, y: crankY, r: .082 }, { x: bs * .25, y: .365, r: .072 }], zf + .05, 'Oil-pump chain']];
    for (const [pl, z, name] of second) {
      const mx = (pl[0].x + pl[1].x) / 2, my = (pl[0].y + pl[1].y) / 2;
      const cw = [...pl].sort((a, b) => Math.atan2(b.y - my, b.x - mx) - Math.atan2(a.y - my, a.x - mx));
      for (const p of pl) gear(timing, p.x, p.y, z, p.r - .016, p.r + .004, 18, .045, mat.steel);
      sweep(timing, loopPath(cw, z), .009, .02, mat.steel, { planar: true, steps: 220, sides: 8, corrugate: 70 }).name = name;
    }
    // N20: VANOS solenoid actuators in front of the central valves; EA888: variator solenoid valve
    if (N20) for (const sgn of [-1, 1]) {
      const x = sgn * camX;
      cyl(timing, .045, .12, mat.black, [x, camY, zf + .20], 'z', 24);
      cyl(timing, .02, .06, mat.steel, [x, camY, zf + .145], 'z', 14);
      rounded(timing, [.06, .06, .05], mat.plastic, [x, camY + .075, zf + .22], undefined, .01);
      rounded(timing, [.07, .26, .05], mat.cast, [x, camY - .13, zf + .15], undefined, .012);
    } else {
      rounded(timing, [.07, .26, .05], mat.cast, [inS * camX, camY - .13, zf + .15], undefined, .012);
      cyl(timing, .04, .10, mat.black, [inS * camX, camY, zf + .20], 'z', 24);                  // variator solenoid valve
    }
  }

  /* ════════════════════════ BELT DRIVE + ALTERNATOR + A/C COMPRESSOR ════════════════════════
     One contact plane z = zb for every pulley and the belt. Both accessories sit on
     the intake side (EA888: together on the auxiliary bracket, SSP 401). */
  const zb = 1.02;
  const ax = inS * .80;
  const alt = { x: ax, y: N20 ? .55 : .90, r: .105 }, comp = { x: ax, y: N20 ? .90 : .55, r: .15 };
  const tens = { x: N20 ? -.20 : .30, y: 1.42, r: .075 }, crankP = { x: cx, y: crankY, r: .265 };
  {
    // crank damper
    cyl(belt, .125, .14, mat.castDark, [cx, crankY, zb - .01], 'z', 36);
    cyl(belt, .265, .085, mat.black, [cx, crankY, zb], 'z', 56);
    ring(belt, .252, .012, mat.recess, [cx, crankY, zb + .043], 'z');
    ring(belt, .205, .01, mat.steel, [cx, crankY, zb + .043], 'z');
    cyl(belt, .15, .02, mat.steel, [cx, crankY, zb + .05], 'z', 32);
    for (const dz of [-.03, 0, .03]) ring(belt, .264, .004, mat.recess, [cx, crankY, zb + dz], 'z');
    boltDir(belt, [cx, crankY, zb + .068], [0, 0, 1], 1.5);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; cyl(belt, .016, .006, mat.recess, [cx + Math.cos(a) * .095, crankY + Math.sin(a) * .095, zb + .062], 'z', 10); }
    // accessory pulleys (belt group); their shafts belong to the alternator / compressor bodies
    const pulley = (p, hubMat, face) => {
      cyl(belt, p.r, .07, hubMat, [p.x, p.y, zb], 'z', 40);
      for (const dz of [-.022, 0, .022]) ring(belt, p.r - .002, .004, mat.recess, [p.x, p.y, zb + dz], 'z');
      cyl(belt, p.r * .55, .016, face, [p.x, p.y, zb + .043], 'z', 28);
      boltDir(belt, [p.x, p.y, zb + .05], [0, 0, 1], .9);
    };
    pulley(alt, mat.black, mat.steel);
    pulley(comp, mat.black, mat.zinc);
    cyl(belt, .15, .028, mat.steel, [comp.x, comp.y, zb + .052], 'z', 40);          // clutch plate
    // automatic belt tensioner: arm, pulley, spring housing
    cyl(belt, tens.r, .06, mat.steel, [tens.x, tens.y, zb], 'z', 32);
    for (const dz of [-.018, .018]) ring(belt, tens.r - .002, .004, mat.recess, [tens.x, tens.y, zb + dz], 'z');
    cyl(belt, .03, .02, mat.zinc, [tens.x, tens.y, zb + .04], 'z', 18);
    const pivot = V3(tens.x + (N20 ? -.20 : .20), tens.y - .14, zb - .03);
    roundedDir(belt, [.07, .30, .03], mat.cast, [(tens.x + pivot.x) / 2, (tens.y + pivot.y) / 2, zb - .03], [pivot.x - tens.x, pivot.y - tens.y, 0], .012);
    cyl(belt, .055, .05, mat.castDark, [pivot.x, pivot.y, zb - .04], 'z', 28);
    boltDir(belt, [pivot.x, pivot.y, zb - .012], [0, 0, 1], 1.0);
    // the belt itself: one plane, ribbed, route sorted clockwise round the pulleys
    const ring4 = [alt, comp, tens, crankP];
    const cxm = ring4.reduce((a, p) => a + p.x, 0) / 4, cym = ring4.reduce((a, p) => a + p.y, 0) / 4;
    const cw = [...ring4].sort((a, b) => Math.atan2(b.y - cym, b.x - cxm) - Math.atan2(a.y - cym, a.x - cxm));
    const bp = loopPath(cw, zb + .002);
    const strap = sweep(belt, bp, .013, .042, mat.rubber, { planar: true, steps: 300, sides: 12 }); strap.name = 'Poly-V belt';
    for (const dz of [-.026, -.009, .009, .026]) hose(belt, bp.map(p => [p[0], p[1], p[2] + dz * .5]), .0045, 0, mat.black);
  }
  {   // alternator body, shaft reaching the pulley; ears bolt to the bracket / block
    const { x, y } = alt, z0 = .50;
    cyl(alternator, .115, .12, mat.black, [x, y, z0 + .06], 'z', 36);                                     // rear cap
    cyl(alternator, .136, .20, mat.castLight, [x, y, z0 + .22], 'z', 40);
    for (let i = 0; i < 12; i++) { const a = i * PI / 6; rounded(alternator, [.04, .05, .20], mat.castDark, [x + Math.cos(a) * .141, y + Math.sin(a) * .141, z0 + .22], [0, 0, a - PI / 2], .01); }
    cyl(alternator, .142, .13, mat.cast, [x, y, z0 + .385], 'z', 40);
    ring(alternator, .14, .01, mat.castDark, [x, y, z0 + .32], 'z');
    cyl(alternator, .024, .20, mat.steel, [x, y, .91 + .06], 'z', 14);
    cyl(alternator, .055, .02, mat.zinc, [x, y, .955], 'z', 20);
    rounded(alternator, [.09, .05, .06], mat.black, [x, y + .125, z0 + .06], undefined, .012);              // connector
    cyl(alternator, .016, .05, mat.brass, [x - inS * .05, y + .12, z0 + .02], 'y', 10);
    for (const s of [-1, 1]) {                                                                               // mounting ears towards the engine
      rounded(alternator, [.09, .07, .13], mat.cast, [x - inS * .115, y + s * .09, z0 + .385], [0, 0, -inS * s * .45], .02);
      boltDir(alternator, [x - inS * .15, y + s * .105, z0 + .455], [0, 0, 1], .8);
    }
  }
  {   // A/C compressor
    const { x, y } = comp, z0 = .46;
    cyl(compressor, .128, .36, N20 ? mat.cast : mat.castLight, [x, y, z0 + .20], 'z', 40);
    for (const z of [z0 + .08, z0 + .2, z0 + .32]) ring(compressor, .128, .008, mat.castDark, [x, y, z], 'z');
    cyl(compressor, .132, .05, mat.castDark, [x, y, z0 + .02], 'z', 36);
    cyl(compressor, .095, .06, mat.black, [x, y, z0 + .405], 'z', 32);
    cyl(compressor, .03, .12, mat.steel, [x, y, .93], 'z', 14);
    // refrigerant block with two external pipe stubs (the vehicle's lines stop here)
    rounded(compressor, [.14, .08, .13], mat.cast, [x, y - .15, z0 + .1], undefined, .016);
    for (const dx of [-.035, .035]) {
      const p = cyl(compressor, .018, .10, mat.steel, [x + dx, y - .225, z0 + .1], 'y', 12);
      p.userData.externalConnector = true; p.name = 'External A/C refrigerant line stub';
      ring(compressor, .022, .005, mat.zinc, [x + dx, y - .275, z0 + .1], 'y');
    }
    for (const s of [-1, 1]) {
      rounded(compressor, [.09, .07, .13], mat.cast, [x - inS * .115, y + s * .085, z0 + .30], [0, 0, -inS * s * .45], .02);
      boltDir(compressor, [x - inS * .15, y + s * .1, z0 + .37], [0, 0, 1], .8);
    }
  }

  /* ════════════════════════ OIL FILTER HOUSING ════════════════════════ */
  if (!N20) {
    // auxiliary mounting (SSP 401): one casting carries filter, oil cooler, oil-pressure sensor and the alternator + compressor
    rounded(oilFilter, [.07, .92, .40], mat.castLight, [-.635, .80, .66], undefined, .02).name = 'Auxiliary bracket plate';
    rounded(oilFilter, [.20, .24, .40], mat.castLight, [-.715, 1.26, .62], undefined, .03);
    cyl(oilFilter, .105, .05, mat.castLight, [-.73, 1.40, .62], 'y', 36);
    const can = cyl(oilFilter, .098, .22, mat.zinc, [-.73, 1.51, .62], 'y', 40); can.name = 'Spin-on oil filter';
    for (const dy of [-.04, .02]) ring(oilFilter, .099, .006, mat.steel, [-.73, 1.51 + dy, .62], 'y');
    cyl(oilFilter, .074, .014, mat.castDark, [-.73, 1.625, .62], 'y', 28);
    boltDir(oilFilter, [-.73, 1.636, .62], [0, 1, 0], 1.3);
    rounded(oilFilter, [.14, .26, .13], mat.cast, [-.70, 1.02, .34], undefined, .02);                    // oil cooler
    for (let i = 0; i < 5; i++) rounded(oilFilter, [.15, .012, .14], mat.edge, [-.70, .92 + i * .05, .34], undefined, .004);
    cyl(oilFilter, .026, .06, mat.black, [-.78, 1.18, .46], 'x', 16);                                      // oil-pressure sensor
    rounded(oilFilter, [.07, .05, .05], mat.plastic, [-.82, 1.18, .46], undefined, .01);
    for (const [y, z] of [[1.32, .50], [1.18, .74], [.58, .50], [.58, .82], [1.0, .80]]) boltDir(oilFilter, [-.665, y, z], [-1, 0, 0], .8);
  } else {
    // N20: plastic oil filter housing with the engine-oil-to-coolant heat exchanger fitted to it
    const hx = .715, hy2 = 1.28, hz = .46;
    rounded(oilFilter, [.24, .32, .36], mat.black, [hx, hy2, hz], undefined, .04);
    cyl(oilFilter, .096, .10, mat.black, [hx + .02, hy2 + .205, hz], 'y', 36);
    ring(oilFilter, .098, .01, mat.zinc, [hx + .02, hy2 + .255, hz], 'y');
    cyl(oilFilter, .075, .014, mat.plastic, [hx + .02, hy2 + .26, hz], 'y', 28);
    const exch = rounded(oilFilter, [.12, .22, .26], mat.cast, [hx + .18, hy2 - .04, hz], undefined, .02);
    exch.name = 'Oil-to-coolant heat exchanger';
    for (let i = 0; i < 6; i++) rounded(oilFilter, [.13, .01, .27], mat.edge, [hx + .18, hy2 - .12 + i * .035, hz], undefined, .003);
    cyl(oilFilter, .024, .06, mat.black, [hx + .02, hy2 - .20, hz - .22], 'y', 16);
    for (const [y, z] of [[1.15, .30], [1.41, .30], [1.15, .62], [1.41, .62]]) boltDir(oilFilter, [hx - .12, y, z], [-1, 0, 0], .8);
  }

  /* ════════════════════════ INTAKE MANIFOLD ════════════════════════
     EA888 (SSP 401): two bonded polyamide halves with throttle, fuel rail and
     tumble-flap actuator. N20 (training): DME bolted on top of the manifold on a
     metal heat-sink plate that is cooled by the intake air. */
  {
    const fx = inS * .667;                                // flange plane
    const plenumX = inS * (N20 ? 1.00 : 1.02), plenumY = N20 ? 2.10 : 2.22;
    const prof = (w, h) => [[-w, -h * .84], [w, -h * .84], [w * 1.12, -h * .4], [w * 1.12, h * .42], [w * .72, h], [-w * .72, h], [-w * 1.12, h * .42], [-w * 1.12, -h * .4]];
    for (const z of Zc) {
      rounded(intake, [.05, .30, .31], N20 ? mat.cast : mat.castDark, [fx, 1.80, z], undefined, .014);
      for (const [dy, dz] of [[.115, -.135], [.115, .135], [-.115, -.135], [-.115, .135]]) boltDir(intake, [inS * .695, 1.80 + dy, z + dz], [inS, 0, 0], .8);
      const path = [[inS * .69, 1.80, z], [inS * .76, 1.80, z], [inS * (N20 ? .84 : .83), 1.88, z], [inS * (N20 ? .93 : .90), plenumY - .06, z]];
      const runner = sweep(intake, path, N20 ? .066 : .07, .125, mat.black, { planar: true, rectangular: true, bulge: .2, steps: 40, sides: 20 });
      runner.name = 'Intake runner ' + (Zc.indexOf(z) + 1);
      rounded(intake, [.10, .06, .31], mat.recess, [inS * .745, 1.80 + (N20 ? .05 : .06), z], undefined, .02);   // moulded runner clip
    }
    const pl = profile(intake, prof(.13, .15).map(([x, y]) => [x + plenumX, y + plenumY]), 1.48, mat.black, [0, 0, 0], [], .045);
    pl.name = N20 ? 'Intake manifold plenum' : 'Polyamide plenum';
    rounded(intake, [.34, .02, 1.54], mat.recess, [plenumX, plenumY - .005, 0], undefined, .008);          // weld seam between the two bonded halves
    if (!N20) {
      for (const z of [-.5, 0, .5]) rounded(intake, [.18, .07, .05], mat.black, [plenumX, plenumY + .17, z], undefined, .014);
      // throttle body at the gearbox end; the charge-air pipe from the front cooler is the vehicle's
      cyl(intake, .115, .14, mat.castLight, [plenumX, plenumY, -.88], 'z', 40).name = 'Throttle body';
      ring(intake, .118, .014, mat.edge, [plenumX, plenumY, -.81], 'z');
      cyl(intake, .095, .016, mat.recess, [plenumX, plenumY, -.955], 'z', 36);
      rounded(intake, [.13, .11, .11], mat.plastic, [plenumX + .13, plenumY + .06, -.86], undefined, .02);
      const coupler = cyl(intake, .125, .11, mat.black, [plenumX, plenumY, -1.03], 'z', 40);
      coupler.name = 'External charge-air pipe connection'; coupler.userData.externalConnector = true;
      ring(intake, .126, .008, mat.zinc, [plenumX, plenumY, -1.085], 'z');
      ring(intake, .126, .008, mat.zinc, [plenumX, plenumY, -.975], 'z');
      // tumble-flap actuator and sensors at the belt end
      cyl(intake, .05, .14, mat.black, [plenumX, plenumY - .02, .84], 'z', 24).name = 'Intake-flap actuator';
      cyl(intake, .02, .06, mat.steel, [plenumX, plenumY - .02, .94], 'z', 12);
      rounded(intake, [.07, .06, .08], mat.plastic, [plenumX + .1, plenumY + .1, .62], undefined, .014);
      rounded(intake, [.07, .06, .08], mat.plastic, [plenumX + .1, plenumY + .1, -.45], undefined, .014);
    } else {
      // heat-sink plate and the DME on top of the manifold
      rounded(intake, [.34, .03, .66], mat.cast, [plenumX, plenumY + .19, -.12], undefined, .008);
      for (let i = 0; i < 9; i++) rounded(intake, [.30, .016, .018], mat.castDark, [plenumX, plenumY + .215, -.4 + i * .06], undefined, .004);
      const dme = rounded(intake, [.32, .13, .60], mat.black, [plenumX, plenumY + .29, -.12], undefined, .03);
      dme.name = 'Digital Engine Electronics (DME) on the intake manifold';
      rounded(intake, [.20, .07, .17], mat.plastic, [plenumX, plenumY + .32, .34], undefined, .02);
      rounded(intake, [.20, .07, .17], mat.plastic, [plenumX, plenumY + .32, -.58], undefined, .02);
      rounded(intake, [.26, .006, .40], mat.zinc, [plenumX, plenumY + .358, -.12], undefined, .002);
      // throttle valve housing at the belt end with the pressure/temperature sensor
      cyl(intake, .115, .15, mat.cast, [plenumX, plenumY, .84], 'z', 40).name = 'Throttle valve housing';
      ring(intake, .118, .014, mat.edge, [plenumX, plenumY, .76], 'z');
      cyl(intake, .095, .016, mat.recess, [plenumX, plenumY, .92], 'z', 36);
      rounded(intake, [.13, .11, .11], mat.plastic, [plenumX + .13, plenumY + .06, .85], undefined, .02);
      const coupler = cyl(intake, .125, .11, mat.black, [plenumX, plenumY, 1.02], 'z', 40);
      coupler.name = 'External charge-air pipe connection'; coupler.userData.externalConnector = true;
      ring(intake, .126, .008, mat.zinc, [plenumX, plenumY, .97], 'z');
      ring(intake, .126, .008, mat.zinc, [plenumX, plenumY, 1.075], 'z');
      cyl(intake, .03, .07, mat.black, [plenumX + .13, plenumY, -.45], 'y', 14);
    }
  }

  /* ════════════════════════ EXHAUST MANIFOLD ════════════════════════ */
  const T = { x: exS * 1.30, y: N20 ? 1.40 : 1.46, z: N20 ? -.02 : -.12 };    // turbo centre-housing axis
  const tdir = N20 ? 1 : -1;                              // which way the turbine sits along z
  {
    const fx = exS * .667, eMat = N20 ? mat.steel : mat.exhaust;
    rounded(exhaust, [.05, .34, L - .12], N20 ? mat.steel : mat.castDark, [fx, 1.80, 0], undefined, .014);
    for (const z of Zc) for (const [dy, dz] of [[.125, -.135], [.125, .135], [-.125, -.135], [-.125, .135]]) boltDir(exhaust, [exS * .695, 1.80 + dy, z + dz], [exS, 0, 0], .8);
    const tz = T.z + tdir * .16;                           // turbine inlet z
    if (!N20) {
      Zc.forEach((z, i) => {
        const pts = [[exS * .69, 1.80, z], [exS * .80, 1.79, z], [exS * .93, 1.69, z + (tz - z) * .45], [exS * 1.03, 1.58, z + (tz - z) * .88], [exS * 1.10, 1.52, tz]];
        const r = hose(exhaust, pts, .072, 0, eMat); r.name = 'Exhaust runner ' + (i + 1);
        ellipsoid(exhaust, [.095, .095, .085], eMat, [exS * .74, 1.795, z], undefined);                           // cast bell at each port
      });
      ellipsoid(exhaust, [.17, .165, .19], mat.exhaust, [exS * 1.12, 1.52, tz]).name = 'Collector';
      rounded(exhaust, [.05, .26, .26], mat.castDark, [exS * 1.245, 1.47, tz], undefined, .012);
    } else {
      // twin-scroll: cylinders 1+4 and 2+3 paired, two separate pipes reach two separate turbine inlets
      const pairs = [[0, 3, 1.28, tz + .05], [1, 2, 1.52, tz - .05]];
      for (const [a, b, yIn, zm] of pairs) {
        for (const i of [a, b]) {
          const z = Zc[i];
          const pts = [[exS * .69, 1.80, z], [exS * .79, 1.78, z], [exS * .90, (1.80 + yIn) / 2, z + (zm - z) * .5], [exS * 1.01, yIn + .02, z + (zm - z) * .9], [exS * 1.06, yIn, zm]];
          const pm = a === 0 ? mat.steel : mat.titanium;
          hose(exhaust, pts, .058, 0, pm).name = 'Exhaust runner ' + (i + 1) + ' (scroll ' + (a === 0 ? 'A' : 'B') + ')';
          ellipsoid(exhaust, [.08, .08, .075], pm, [exS * .73, 1.795, z], undefined);
        }
        ellipsoid(exhaust, [.07, .075, .115], a === 0 ? mat.steel : mat.titanium, [exS * 1.075, yIn, zm], undefined);
      }
      rounded(exhaust, [.05, .38, .22], mat.castDark, [exS * 1.17, 1.40, tz], undefined, .012);
    }
  }

  /* ════════════════════════ TURBOCHARGER ════════════════════════
     Separate component: turbine housing on the manifold flange, water- and oil-
     cooled centre housing, compressor housing, wastegate actuator.
     EA888: exchangeable pneumatic pressure capsule (SSP 445); the capsule is
     the grey can with the rod.  N20: twin-scroll housing (two inlets), vacuum
     unit on the wastegate and an electric blow-off valve (training text). */
  const tx = T.x, ty = T.y, tz0 = T.z;
  const zT = tz0 + tdir * .16, zC = tz0 - tdir * .17;     // turbine / compressor volute centres
  {
    const eMat = N20 ? mat.titanium : mat.exhaust, cdir = -tdir;       // cdir: from turbine toward compressor
    lathe(turbo, [[0, -.15], [.11, -.15], [.19, -.09], [.205, .02], [.17, .11], [.10, .15], [0, .15]], eMat, [tx, ty, zT], [PI / 2, 0, 0], 40).name = 'Turbine housing';
    ring(turbo, .17, .028, eMat, [tx, ty, zT + .0], 'z');                                                              // scroll lip
    rounded(turbo, [.04, .24, .24], mat.castDark, [tx - exS * .205, ty + (N20 ? .05 : .03), zT], undefined, .01);     // inlet flange (meets the manifold)
    if (N20) rounded(turbo, [.04, .26, .24], mat.castDark, [tx - exS * .205, ty - .02, zT], undefined, .01);
    // turbine outlet toward the downpipe + external stub
    cylDir(turbo, .105, .16, eMat, [tx, ty, zT + tdir * .22], [0, 0, tdir], 36);
    ringDir(turbo, .115, .012, mat.zinc, [tx, ty, zT + tdir * .30], [0, 0, tdir]);
    const dp = cylDir(turbo, .105, .12, mat.black, [tx, ty, zT + tdir * .37], [0, 0, tdir], 36);
    dp.name = 'External exhaust downpipe connection'; dp.userData.externalConnector = true;
    // centre housing
    cyl(turbo, .078, .20, mat.castDark, [tx, ty, (zT + zC) / 2], 'z', 32).name = 'Centre housing';
    ring(turbo, .082, .008, mat.edge, [tx, ty, zT + cdir * .085], 'z');
    ring(turbo, .082, .008, mat.edge, [tx, ty, zC - cdir * .085], 'z');
    // compressor volute + inlet + outlet elbow to the (external) charge-air pipe
    lathe(turbo, [[0, -.10], [.09, -.10], [.17, -.06], [.19, .02], [.15, .09], [.09, .10], [0, .10]], mat.cast, [tx, ty, zC], [PI / 2, 0, 0], 40).name = 'Compressor housing';
    cylDir(turbo, .09, .16, mat.cast, [tx, ty, zC + cdir * .17], [0, 0, cdir], 32, .10);
    ringDir(turbo, .105, .01, mat.zinc, [tx, ty, zC + cdir * .26], [0, 0, cdir]);
    cylDir(turbo, .088, .02, mat.recess, [tx, ty, zC + cdir * .262], [0, 0, cdir], 28);
    const elbow = sweep(turbo, [[tx, ty + .17, zC], [tx, ty + .27, zC + cdir * .03], [tx, ty + .34, zC + cdir * .09]], .05, .05, mat.cast, { steps: 24, sides: 18 });
    elbow.name = 'Compressor outlet';
    const out = cylDir(turbo, .056, .09, mat.black, [tx, ty + .385, zC + cdir * .12], [0, .6, cdir * .8], 28);
    out.name = 'External charge-air connection'; out.userData.externalConnector = true;
    ringDir(turbo, .06, .008, mat.zinc, [tx, ty + .34, zC + cdir * .092], [0, .6, cdir * .8]);
    // wastegate actuator on a bracket off the compressor housing; its rod reaches the lever on the turbine housing
    const wx = tx + (N20 ? -exS : exS) * .15, wy = ty + .205, wz0 = zC + cdir * .01;
    if (!N20) {
      const capsule = cylDir(turbo, .062, .12, mat.zinc, [wx, wy, wz0], [0, 0, 1], 32);
      capsule.name = 'Wastegate pressure capsule (exchangeable)';
      lathe(turbo, [[0, 0], [.062, 0], [.055, .035], [.032, .065], [0, .075]], mat.zinc, [wx, wy, wz0 + cdir * .06], [cdir * PI / 2, 0, 0], 28);
      ringDir(turbo, .064, .008, mat.steel, [wx, wy, wz0 - cdir * .005], [0, 0, 1]);
      const rl = Math.abs(zC - zT) - .02, rc = (zC - cdir * .06 + zT) / 2;
      cylDir(turbo, .009, rl, mat.steel, [wx, wy, rc], [0, 0, 1], 8).name = 'Wastegate actuator rod';
      rounded(turbo, [.04, .035, .05], mat.steel, [wx, wy, zT + cdir * .03], undefined, .01);                          // lever on the turbine housing
      rounded(turbo, [.15, .03, .06], mat.steel, [(wx + tx) / 2, wy - .015, zC + cdir * .02], undefined, .008);          // bracket on the compressor housing
    } else {
      cylDir(turbo, .052, .12, mat.black, [wx, wy, wz0], [0, 0, 1], 28).name = 'Wastegate vacuum unit';
      const rl = Math.abs(zC - zT) - .02;
      cylDir(turbo, .009, rl, mat.steel, [wx, wy, (zC - cdir * .06 + zT) / 2], [0, 0, 1], 8);
      rounded(turbo, [.04, .035, .05], mat.steel, [wx, wy, zT + cdir * .03], undefined, .01);
      rounded(turbo, [.15, .03, .06], mat.steel, [(wx + tx) / 2, wy - .015, zC + cdir * .02], undefined, .008);
      cyl(turbo, .045, .09, mat.black, [tx, ty + .21, zC + cdir * .0], 'x', 24).name = 'Electric blow-off valve';
      rounded(turbo, [.08, .05, .05], mat.plastic, [tx + exS * .08, ty + .21, zC], undefined, .01);
    }
  }

  /* ════════════════════════ FUEL SYSTEM ════════════════════════
     High-pressure pump on the exhaust camshaft (EA888: quadruple cam; N20: cam for
     the high-pressure pump on the exhaust cam), rail, injectors, steel lines. */
  {
    const pz = -.94, px = exS * camX, py = camY;
    rounded(fuel, [.26, .26, .045], mat.castLight, [px, py, -.80], undefined, .03);       // mounting flange on the head rear
    cyl(fuel, .09, .12, mat.cast, [px, py, -.86], 'z', 32);                                // adapter over the cam end
    const pump = cyl(fuel, .105, .17, mat.castLight, [px, py, pz], 'z', 36); pump.name = 'High-pressure fuel pump';
    cyl(fuel, .108, .05, mat.steel, [px, py, pz - .11], 'z', 36);
    ring(fuel, .106, .008, mat.zinc, [px, py, pz - .085], 'z');
    cyl(fuel, .06, .09, mat.black, [px - exS * .13, py + .02, pz + .0], 'x', 24);          // quantity control valve
    rounded(fuel, [.06, .06, .08], mat.plastic, [px - exS * .20, py + .02, pz], undefined, .014);
    cyl(fuel, .022, .06, mat.zinc, [px, py + .125, pz - .03], 'y', 6);                     // HP outlet fitting
    cyl(fuel, .024, .05, mat.steel, [px + exS * .1, py - .03, pz - .02], 'y', 12);         // low-pressure inlet stub (tank-side line is the vehicle's)
    for (const [dx, dy] of [[.105, .105], [-.105, .105], [.105, -.105], [-.105, -.105]]) boltDir(fuel, [px + dx, py + dy, -.775], [0, 0, 1], .7);
    // rail along the intake-side shoulder of the head, injectors dropping into the head
    const ry = N20 ? 2.075 : 1.995, rx = inS * .655;
    const rail = cyl(fuel, .024, 1.14, mat.steel, [rx, ry, 0], 'z', 18); rail.name = 'Fuel rail';
    for (const z of [-.57, .57]) { rounded(fuel, [.05, .05, .05], mat.zinc, [rx, ry, z], undefined, .01); }
    Zc.forEach((z, i) => {
      const cup = cyl(fuel, .03, .06, mat.zinc, [rx, ry - .035, z], 'y', 16);
      const inj = cylDir(fuel, .021, .17, mat.steel, [inS * .595, ry - .09 + (N20 ? -.02 : 0), z], [inS * 1, -1, 0], 14);
      inj.name = 'Injector ' + (i + 1); void cup;
      if (N20) hose(fuel, [[rx, ry + .02, z], [rx - inS * .03, ry + .09, z], [inS * .60, ry + .05, z], [inS * .585, ry - .02, z]], .007, 0, mat.steel);   // welded rail-to-injector line
    });
    cyl(fuel, .03, .09, mat.steel, [rx, ry, .6], 'z', 14);
    rounded(fuel, [.05, .05, .07], mat.plastic, [rx, ry + .05, .5], undefined, .012);      // rail pressure sensor
    // high-pressure line pump → rail (rigid), ends at visible fittings
    const hp = hose(fuel, [[px, py + .155, pz - .03], [px, py + .26, pz - .06], [px * .3 + rx * .7, py + .26, -.90], [rx, ry + .10, -.80], [rx, ry + .03, -.62]], .012, 0, mat.steel);
    hp.name = 'High-pressure fuel line';
    cyl(fuel, .02, .03, mat.zinc, [rx, ry + .025, -.585], 'y', 6);
  }

  /* ════════════════════════ COOLANT NETWORK (engine side) ════════════════════════
     Every hose ends at a visible port, or at a connector the vehicle owns
     (radiator, expansion tank, heater core). The vehicle parts are not modelled. */
  const portSupport = (g) => g.children.find(c => c.isMesh) || null;
  const Pt = {};
  {
    // head outlet boss on the rear face; thermostat housing behind it
    Pt.headOut = spigotPort('head-outlet', 'Cylinder-head coolant outlet', head, [.30, 1.78, -HL - .07], [0, 0, -1], .055, headMat, null);
    rounded(head, [.20, .20, .06], headMat, [.30, 1.78, -HL - .005], undefined, .02);
    const hz = -1.20, hx = .02, hy = 1.50;
    const th = rounded(cooling, [.34, .28, .32], N20 ? mat.black : mat.plastic, [hx, hy, hz], undefined, .05);
    th.name = N20 ? 'Map-controlled thermostat housing' : 'Thermostat housing';
    cyl(cooling, .075, .04, N20 ? mat.castLight : mat.castDark, [hx, hy + .15, hz], 'y', 28);                    // thermostat cap
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; boltDir(cooling, [hx + Math.cos(a) * .1, hy + .175, hz + Math.sin(a) * .1], [0, 1, 0], .7); }
    rounded(cooling, [.07, .05, .08], mat.plastic, [hx + .06, hy + .13, hz + .11], undefined, .014);              // coolant temperature sensor / heater connector
    if (N20) cyl(cooling, .03, .06, mat.brass, [hx - .06, hy + .17, hz - .1], 'y', 16);
    Pt.tIn = spigotPort('thermostat-inlet', 'Thermostat housing inlet (from head)', cooling, [.22, 1.62, hz + .20], [0, 0, 1], .055, mat.castDark, null);
    Pt.tRad = spigotPort('thermostat-radiator', 'Thermostat housing outlet to radiator', cooling, [hx - .20, hy - .06, hz], [-1, 0, 0], .06, mat.castDark, null);
    Pt.tHeat = spigotPort('thermostat-heater', 'Thermostat housing heater connection', cooling, [hx - .20, hy + .08, hz - .06], [-1, 0, 0], .028, mat.castDark, null);
    Pt.extRad = spigotPort('external-radiator-hose', 'External radiator hose connector', cooling, [-.46, 1.30, -1.30], [1, 0, .2], .06, mat.black, null, true);
    Pt.extHeat = spigotPort('external-heater-hose', 'External heater-core hose connector', cooling, [-.44, 1.74, -1.22], [1, 0, .1], .028, mat.black, null, true);
    ports.connect(cooling, 'Head outlet to thermostat housing', Pt.headOut, Pt.tIn, [], .055);
    ports.connect(cooling, 'Radiator feed hose', Pt.tRad, Pt.extRad, [], .06);
    ports.connect(cooling, 'Heater feed hose', Pt.tHeat, Pt.extHeat, [], .028);
    // coolant pump module on the intake-side of the block
    const px = inS * .715, py = .86, pzz = -.50;
    rounded(cooling, [.18, .26, .30], N20 ? mat.castDark : mat.castLight, [px, py, pzz], undefined, .04).name = N20 ? 'Electric coolant pump' : 'Coolant pump module';
    cylDir(cooling, .11, .08, N20 ? mat.black : mat.castDark, [px + inS * .13, py, pzz], [inS, 0, 0], 32);
    ringDir(cooling, .114, .01, mat.zinc, [px + inS * .175, py, pzz], [inS, 0, 0]);
    rounded(cooling, [.08, .07, .09], mat.plastic, [px + inS * .2, py + .08, pzz + .05], undefined, .014);
    for (const [y, z] of [[.98, -.1], [.74, -.1], [.98, .1], [.74, .1]]) boltDir(cooling, [px - inS * .095, y, z], [-inS, 0, 0], .8);
    if (!N20) { cyl(cooling, .06, .03, mat.castDark, [px, py, pzz + .165], 'z', 24); ring(cooling, .062, .006, mat.steel, [px, py, pzz + .18], 'z'); }   // belt-pulley cover from the balancer shaft
    Pt.pumpIn = spigotPort('pump-inlet', 'Coolant pump inlet (from radiator)', cooling, [px + inS * .02, py + .02, pzz - .22], [0, 0, -1], .055, N20 ? mat.castDark : mat.castLight, null);
    Pt.extRet = spigotPort('external-radiator-return', 'External radiator return connector', cooling, [inS * .84, py + .14, -1.02], [0, 0, 1], .055, mat.black, null, true);
    ports.connect(cooling, 'Radiator return hose', Pt.pumpIn, Pt.extRet, [], .055);
    // turbo cooling lines: block ports ↔ turbo centre housing
  }
  {
    const zm = (zT + zC) / 2;
    const bx0 = exS * .69, tx0 = tx - exS * .115;
    const oilF = spigotPort('turbo-oil-feed-block', 'Block oil-feed fitting (to turbo)', block, [bx0, 1.30, -.10], [exS, 0, 0], .016, blockMat, null);
    const oilFT = spigotPort('turbo-oil-feed', 'Turbo oil-feed fitting', turbo, [tx, ty + .115, zm], [0, 1, 0], .016, mat.castDark, null);
    ports.connect(turbo, 'Turbo oil feed line', oilFT, oilF, [[tx - exS * .09, ty + .10, zm + .04], [tx - exS * .33, ty - .02, zm + .1], [tx - exS * .50, 1.36, zm + .1]], .016, true);
    const dr = spigotPort('turbo-oil-drain', 'Turbo oil-drain fitting', turbo, [tx, ty - .118, zm], [0, -1, 0], .028, mat.castDark, null);
    const drB = spigotPort('turbo-oil-drain-block', 'Block oil-return fitting (from turbo)', block, [bx0, .98, -.34], [exS, 0, 0], .028, blockMat, null);
    ports.connect(turbo, 'Turbo oil drain hose', dr, drB, [], .028);
    const cF = spigotPort('turbo-coolant-in', 'Turbo coolant inlet', turbo, [tx0, ty - .02, zm - .03], [-exS, 0, 0], .02, mat.castDark, null);
    const cFB = spigotPort('turbo-coolant-in-block', 'Block coolant fitting (to turbo)', block, [bx0, 1.12, -.20], [exS, 0, 0], .02, blockMat, null);
    ports.connect(turbo, 'Turbo coolant feed hose', cFB, cF, [], .02);
    const cR = spigotPort('turbo-coolant-out', 'Turbo coolant outlet', turbo, [tx0, ty + .035, zm + .06], [-exS, 0, 0], .02, mat.castDark, null);
    const cRB = spigotPort('turbo-coolant-out-block', 'Block coolant return fitting (from turbo)', block, [bx0, 1.42, .06], [exS, 0, 0], .02, blockMat, null);
    ports.connect(turbo, 'Turbo coolant return hose', cR, cRB, [], .02);
  }

  /* ════════════════════════ IGNITION COILS + HARNESS ════════════════════════ */
  {
    Zc.forEach((z, i) => {
      const g = new THREE.Group(); g.name = 'Ignition coil ' + (i + 1); ignition.add(g);
      cyl(g, .052, .20, mat.rubber, [0, 2.23, z], 'y', 24);                      // boot into the plug well
      ring(g, .056, .008, mat.recess, [0, 2.33, z], 'y');
      cyl(g, .05, .13, N20 ? mat.plastic : mat.black, [0, 2.40, z], 'y', 28);
      for (const y of [2.37, 2.43]) ring(g, .051, .004, mat.recess, [0, y, z], 'y');
      rounded(g, [.11, .075, .13], mat.black, [exS * .03, 2.495, z], undefined, .02);       // connector shroud
      rounded(g, [.05, .02, .09], mat.zinc, [exS * .03, 2.535, z], undefined, .006);       // retaining clip
      hose(g, [[exS * .085, 2.495, z], [exS * .13, 2.505, z], [exS * .15, 2.525, z - .03 * (i < 2 ? 1 : -1)]], .012, 0, mat.black);
    });
    // trunk harness with short branches, clipped on brackets and ending in plugs
    const ty0 = 2.54, tx1 = exS * .16;
    const trunk = hose(ignition, [[tx1, ty0, .66], [tx1, ty0 + .01, .3], [tx1, ty0 + .01, -.3], [tx1, ty0, -.7], [tx1, ty0 - .02, -.94]], .022, 40, mat.black);
    trunk.name = 'Coil harness trunk';
    rounded(ignition, [.07, .06, .09], mat.plastic, [tx1, ty0 + .005, .70], undefined, .014);
    rounded(ignition, [.07, .06, .09], mat.plastic, [tx1, ty0 - .02, -.97], undefined, .014);
    rounded(ignition, [.045, .02, .06], mat.zinc, [tx1, ty0 + .03, -.97], undefined, .006);
    Zc.forEach((z, i) => {
      hose(ignition, [[tx1, ty0 + .01, z], [exS * .155, ty0 - .01, z - .02 * (i < 2 ? 1 : -1)], [exS * .15, 2.525, z - .03 * (i < 2 ? 1 : -1)]], .01, 0, mat.black);
    });
    for (const z of [.4, -.4]) rounded(ignition, [.04, .08, .03], mat.zinc, [tx1, ty0 - .035, z], undefined, .006);
  }

  /* ════════════════════════ ENGINE COVER ════════════════════════
     EA888: black acoustic cover over the head cover and coils. N20: engine cover
     with the vacuum reservoir for the wastegate built in (training text). */
  {
    const hl = N20 ? .74 : .76;
    const y0 = 2.58, wl = N20 ? .62 : .66, wr = N20 ? .62 : .64;
    const topY = (x, inset) => { const u = (x - (wr - wl) / 2) / ((wr + wl) / 2); return y0 + .105 + .045 * (1 - u * u) - inset; };
    const xs = Array.from({ length: 19 }, (_, i) => -wl + .05 + (wl + wr - .1) * i / 18);
    const outer = [[-wl, y0], [-wl, y0 + .07], [-wl + .025, y0 + .098], ...xs.map(x => [x, topY(x, 0)]), [wr - .025, y0 + .098], [wr, y0 + .07], [wr, y0]];
    const inner = [[wr - .035, y0], [wr - .035, y0 + .065], ...[...xs].reverse().map(x => [x, topY(x, .035)]), [-wl + .035, y0 + .065], [-wl + .035, y0]];
    const shell = profile(trim, [...outer, ...inner], hl * 2, N20 ? mat.black : mat.plastic, [0, 0, 0], [], .02);
    shell.name = N20 ? 'Engine cover with built-in vacuum reservoir' : 'Acoustic engine cover';
    for (const s of [-1, 1]) profile(trim, outer, .03, N20 ? mat.black : mat.plastic, [0, 0, s * (hl - .015)], [], .01);
    // side skirts hang down over the head-cover shoulders (the harness leaves under the open ends)
    for (const [x, w] of [[-wl + .016, .032], [wr - .016, .032]]) rounded(trim, [w, .27, hl * 2 - .06], N20 ? mat.black : mat.plastic, [x, y0 - .065, 0], undefined, .01);
    for (const x of [-wl + .016, wr - .016]) for (const z of [-.5, 0, .5]) cyl(trim, .012, .012, mat.zinc, [x + (x < 0 ? -.02 : .02), y0 - .1, z], 'x', 10);
    const topS = x => topY(x, 0) + .02;     // outer surface incl. the .02 edge bevel
    // ribs follow the dome; a recessed panel with a satin trim frame and a hinged oil-filler hatch
    for (const x of N20 ? [-.40, -.2, .02] : [-.48, -.3, .3, .48]) rounded(trim, [.045, .014, hl * 1.74], mat.recess, [x, topS(x) + .004, 0], undefined, .005);
    const px0 = N20 ? -.20 : -.0, pz0 = .06;
    rounded(trim, [.38, .01, .40], mat.recess, [px0, topS(px0) + .003, pz0], undefined, .012);
    for (const [dx, dz, w, d] of [[0, .205, .40, .014], [0, -.205, .40, .014], [.195, 0, .014, .40], [-.195, 0, .014, .40]]) rounded(trim, [w, .012, d], mat.castLight, [px0 + dx, topS(px0 + dx) + .009, pz0 + dz], undefined, .004);
    rounded(trim, [.12, .014, .14], N20 ? mat.recess : mat.black, [inS * .3, topS(inS * .3) + .005, Zc[0] + .02], undefined, .01);
    rounded(trim, [.13, .008, .018], mat.castLight, [inS * .3, topS(inS * .3) + .014, Zc[0] - .06], undefined, .004);
    if (N20) {
      rounded(trim, [.2, .075, hl * 1.55], mat.plastic, [inS * .32, topS(inS * .32) + .03, 0], undefined, .03).name = 'Vacuum reservoir (moulded into the cover)';
      for (const z of [-.5, 0, .5]) cyl(trim, .018, .02, mat.zinc, [inS * .32, topS(inS * .32) + .075, z], 'y', 12);
    }
    // grommet posts down onto the head cover
    const gy = N20 ? 2.32 : 2.34;
    for (const [x, z] of N20 ? [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]] : [[-.45, -.5], [.45, -.5], [-.45, .5], [.45, .5]]) {
      cyl(trim, .032, y0 - gy + .02, mat.rubber, [x, (y0 + gy) / 2 + .01, z], 'y', 16);
      ring(trim, .04, .006, mat.zinc, [x, gy + .02, z], 'y');
    }
  }

  root.userData.engineArchitecture = N20
    ? { layout: 'inline-4', code: 'N20B20', cylinders: 4, camshafts: 2, valves: 16, turbo: 'twin-scroll', illustrative: true }
    : { layout: 'inline-4', code: 'CCZA', cylinders: 4, camshafts: 2, valves: 16, turbo: 'exchangeable pressure capsule (SSP 445)', illustrative: true };
  const network = ports.network(N20
    ? ['Vehicle radiator', 'Vehicle expansion tank', 'Heater core', 'Intercooler charge-air pipe', 'Intake silencer / clean-air pipe', 'Exhaust downpipe', 'A/C refrigerant lines']
    : ['Vehicle radiator', 'Vehicle expansion tank', 'Heater core', 'Front charge-air cooler pipe', 'Intake air pipe', 'Exhaust downpipe', 'A/C refrigerant lines']);
  return finishEngine(root, parts, { network, kit });
}

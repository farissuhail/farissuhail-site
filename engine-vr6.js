/* ==========================================================================
   PETROLHEAD TECHNICA — 3.2 VR6 (Golf Mk5 R32) engine geometry
   --------------------------------------------------------------------------
   Authored procedurally for this site (not manufacturer CAD, not a scan).
   Form follows the supplied in-car photographs and Volkswagen's 2005 R32
   engine photograph (DB2005AU01564):
     · ONE cylinder head over six staggered cylinders, two camshaft lines,
       four valves per cylinder (24).
     · Shallow broad silver plenum with six wide, near-rectangular ducts,
       rounded shoulders, tapered ends and connector windows.
     · Cosmetic badge trim is separate from the oil-sealing head cover; the
       sealing cover encloses both cam lines and carries the oil-filler wing.
     · Throttle + bent black inlet at the gearbox end (opposite the belt
       accessories); orange T-bar dipstick at the centre of the front edge.
   The red ignition connectors come from the user's photographs and are NOT
   claimed as verified factory Mk5 equipment. Cooling routes are
   illustrative until engine-code documentation is matched.
   ========================================================================== */
import * as THREE from 'three';
import { createKit, finishEngine } from './engine-kit.js';

export function buildVR6(mat) {
  const kit = createKit(mat);
  const { add, box, rounded, cyl, ring, bolt, ellipsoid, profile, sweep, hose, clamp } = kit;
  const PI = Math.PI;
  const root = new THREE.Group();
  root.name = 'VR6 engine';
  const parts = new Map();
  /** A semantic assembly. `parent` nests it so it can move relative to it. */
  const part = (id, parent = root) => {
    const g = new THREE.Group(); g.name = id;
    parent.add(g); parts.set(id, g);
    return g;
  };
  const trim = part('cosmetic-trim');
  const ignition = part('ignition');
  const head = part('cylinder-head');
  const sealGroup = part('cam-cover', head);       // oil-sealing cover, nested so it lifts within the head
  const valvetrain = part('valvetrain', head);     // cams, followers and valves, nested likewise
  const gasket = part('head-gasket');
  const block = part('cylinder-block');
  const crank = part('crank-assembly');
  const dipstick = part('dipstick');
  const sump = part('oil-sump');
  const intake = part('intake-manifold');
  const exhaust = part('exhaust-manifold');
  const belt = part('belt-drive');
  const alternator = part('alternator');
  const accessories = part('ancillaries');
  const wiring = part('wiring');
  const cooling = part('coolant-network');

  const Z = [-.79, -.475, -.16, .16, .475, .79];
  const L = 2.12;

  // Compact VR6 casting: large irregular forms first, then machining and ribs.
  const crankcase = profile(block, [[-.59, -.3], [-.68, -.12], [-.65, .29], [-.5, .44], [.5, .44], [.68, .27], [.65, -.12], [.53, -.3], [.24, -.37], [-.22, -.37]], L, mat.castDark, [0, 1.04, 0], [], .07, 16);
  const castingVertices = crankcase.geometry.getAttribute('position');
  for (let i = 0; i < castingVertices.count; i++) {
    const x = castingVertices.getX(i), y = castingVertices.getY(i), z = castingVertices.getZ(i);
    const sideWall = THREE.MathUtils.clamp((Math.abs(x) -.3) * 3.3, 0, 1) * THREE.MathUtils.clamp((.33 - y) * 1.7, 0, 1);
    castingVertices.setXYZ(i, x + Math.sign(x) * sideWall * (.023 * Math.sin(z * 7.2 + .4) + .012 * Math.sin(z * 13.7)), y + sideWall * .014 * Math.sin(z * 4.8), z);
  }
  crankcase.geometry.computeVertexNormals(); crankcase.geometry.computeBoundingSphere();
  rounded(block, [1.35, .09, 2.21], mat.edge, [0, 1.535, 0], undefined, .025);
  rounded(sump, [1.23, .045, 2.2], mat.gasket, [0, .675, 0], undefined, .013);
  rounded(gasket, [1.36, .017, 2.211], mat.gasket, [0, 1.593, 0], undefined, .005);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = -.91 + i * .3 + (side > 0 ? i % 2 * .018 : -.01);
      const h = .37 + (i % 3) * .045, y = 1.042 + (i % 2 ? .065 : -.015);
      rounded(block, [.053 + (i % 2) * .012, h, .071], mat.castDark, [side * .657, y, z], [0, 0, side * (.11 + (i % 2) * .085)], .017);
    }
    for (const z of [-.68, -.04, .61]) {
      cyl(block, .106, .035, mat.recess, [side * .678, 1.05, z], 'x');
      cyl(block, .093, .034, mat.zinc, [side * .691, 1.05, z], 'x');
      ring(block, .108, .014, mat.castDark, [side * .70, 1.05, z], 'x');
    }
    for (const z of [-.92, -.47, 0, .47, .92]) bolt(block, [side * .56, 1.59, z]);
  }
  for (let i = 0; i < 6; i++) {
    const x = i % 2 ? .16 : -.16;
    const boreAngle = (i % 2 ? -1 : 1) * THREE.MathUtils.degToRad(7.5);
    const bore = cyl(block, .158, .024, mat.recess, [x, 1.597, Z[i]]); bore.rotation.z = boreAngle;
    const boreLip = ring(block, .16, .015, mat.edge, [x, 1.611, Z[i]], 'y');
    boreLip.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), boreAngle));
    const piston = cyl(crank, .134, .057, mat.steel, [x, 1.563, Z[i]]); piston.rotation.z = boreAngle;
    bore.userData.cylinderIndex = i + 1; bore.userData.bankAngle = i % 2 ? -7.5 : 7.5;
  }
  profile(block, [[-.73, -.18], [-.77, .12], [-.63, .43], [-.29, .56], [.25, .55], [.61, .43], [.71, .17], [.54, -.14], [.26, -.2], [-.32, -.24]], .16, mat.cast, [0, 1.1, 1.123], [[-.56, .3, .056], [.5, .3, .058], [.4, -.09, .042], [-.44, -.08, .042]], .027);
  for (const [x, y] of [[-.57, 1.38], [-.32, 1.6], [.29, 1.61], [.53, 1.37], [.55, .83], [-.46, .76]]) bolt(block, [x, y, 1.245], 'z');
  for (const [x, y] of [[-.5, 1.26], [-.24, 1.41], [.08, 1.4], [.38, 1.26], [-.34, .98], [.38, 1.02]]) {
    cyl(block, .062, .031, mat.recess, [x, y, 1.23], 'z');
    ring(block, .072, .014, mat.castDark, [x, y, 1.253]);
  }
  for (const side of [-1, 1]) {
    profile(block, [[-.12, -.13], [.1, -.13], [.15, .08], [.02, .18], [-.14, .09]], .27, mat.cast, [side * .76, .94, .54], [[.025, .035, .045]], .018);
    bolt(block, [side * .78, 1.12, .55]);
  }
  // Offset cast shoulders and short webs vary the lower profile without filling it.
  rounded(block, [.237, .248, .23], mat.castDark, [.667, .917, -.767], [0, -.14, -.18], .036);
  cyl(block, .089, .031, mat.oxide, [.793, .912, -.766], 'x');
  cyl(block, .057, .035, mat.recess, [.811, .912, -.766], 'x');
  profile(block, [[-.12, -.16], [.08, -.17], [.17, .08], [-.05, .24], [-.11, .13]], .13, mat.castDark, [-.642, 1.14, -.39], [[.032, .052, .039]], .016);
  rounded(block, [.211, .128, .31], mat.castDark, [-.571, .746, .44], [0, .12, 0], .025);
  cyl(block, .04, .041, mat.zinc, [-.693, .756, .479], 'x', 6);
  rounded(block, [.184, .169, .29], mat.castDark, [.575, 1.269, .051], [0, -.13, -.11], .025);
  rounded(block, [.097, .022, .214], mat.oxide, [.658, 1.356, .041], [0, -.13, -.11], .009);

  // One head, two close camshaft lines, twelve valve stations on each cam line.
  const headCasting = profile(head, [[-.665, -.14], [.665, -.14], [.665, .14], [.515, .17], [.515, .018], [-.48, .018], [-.48, .17], [-.665, .14]], 2.18, mat.cast, [.06, 1.76, 0], [], .024);
  headCasting.name = 'Single cylinder head with cam chamber';
  for (const side of [-1, 1]) rounded(head, [.09, .041, 2.22], mat.edge, [.06 + side * .642, 1.926, 0], undefined, .014);
  for (const z of [-1.067, 1.067]) rounded(head, [1.285, .041, .08], mat.edge, [.06, 1.926, z], undefined, .014);
  rounded(gasket, [1.375, .031, 2.22], mat.recess, [.06, 1.599, 0], undefined, .013);
  rounded(gasket, [1.384, .009, 2.219], mat.oxide, [.06, 1.621, 0], undefined, .003);
  for (const side of [-1, 1]) {
    const cam = cyl(valvetrain, .048, 1.94, mat.steel, [.06 + side * .255, 1.906, 0], 'z');
    cam.name = side < 0 ? 'Camshaft A · 12 stations' : 'Camshaft B · 12 stations';
    cam.userData.camshaft = side < 0 ? 'A' : 'B';
    for (let i = 0; i < Z.length; i++) for (const station of [-1, 1]) {
      const z = Z[i] + station * .057, x = .06 + side * .255;
      const lobe = ellipsoid(valvetrain, [.063, .077, .023], mat.edge, [x + side * .011, 1.917, z], [0, 0, side * .19]);
      lobe.userData.valveStation = { cylinder: i + 1, cam: side < 0 ? 'A' : 'B', pair: station < 0 ? 1 : 2 };
      const follower = cyl(valvetrain, .037, .065, mat.recess, [x, 1.825, z]);
      follower.name = 'Valve follower ' + (i + 1) + (side < 0 ? 'A' : 'B') + (station < 0 ? '1' : '2');
      follower.userData.valveStation = { ...lobe.userData.valveStation, role: 'follower' };
      ring(valvetrain, .04, .006, mat.steel, [x, 1.846, z], 'y');
      ring(valvetrain, .04, .006, mat.steel, [x, 1.863, z], 'y');
      cyl(valvetrain, .012, .125, mat.steel, [x, 1.731, z]);
      cyl(valvetrain, .034, .016, mat.steel, [x, 1.669, z]);
    }
    for (const z of [-.96, -.48, 0, .48, .96]) bolt(head, [.06 + side * .59, 1.971, z]);
  }
  for (const z of Z) {
    cyl(head, .075, .057, mat.recess, [-.64, 1.745, z], 'x');
    ring(head, .09, .012, mat.edge, [-.68, 1.745, z], 'x');
  }

  // The oil-sealing cylinder-head cover is separate from the cosmetic trim.
  const sealBase = rounded(sealGroup, [1.305, .018, 2.096], mat.castLight, [.06, 2.009, 0], undefined, .005);
  sealBase.name = 'Sealing cover over both camshaft lines';
  for (const side of [-1, 1]) {
    rounded(sealGroup, [.032, .075, 2.096], mat.castLight, [.06 + side * .636, 1.964, 0], undefined, .009);
    rounded(sealGroup, [.045, .009, 2.114], mat.gasket, [.06 + side * .636, 1.935, 0], undefined, .003);
  }
  for (const z of [-1.042, 1.042]) {
    rounded(sealGroup, [1.273, .075, .025], mat.castLight, [.06, 1.964, z], undefined, .006);
    rounded(sealGroup, [1.291, .009, .036], mat.gasket, [.06, 1.935, z], undefined, .003);
  }
  rounded(sealGroup, [.493, .164, 1.97], mat.castLight, [.759, 2.018, -.045], [0, 0, -.035], .039);
  rounded(sealGroup, [.511, .018, 1.992], mat.gasket, [.76, 1.927, -.045], [0, 0, -.035], .006);
  rounded(sealGroup, [.416, .029, .415], mat.castLight, [.775, 2.126, -.841], [0, 0, -.035], .011);
  const oilFiller = cyl(sealGroup, .096, .044, mat.rubber, [.855, 2.175, -.823], 'y', 40);
  oilFiller.name = 'Oil filler on sealing cover';
  ring(sealGroup, .098, .007, mat.recess, [.855, 2.19, -.823], 'y');
  rounded(sealGroup, [.125, .02, .028], mat.plastic, [.855, 2.205, -.823], undefined, .004);
  for (const z of [-.935, -.41, .2, .86]) bolt(sealGroup, [.987, 2.072, z], 'y', .64);

  // Cosmetic front trim: smooth outer shoulder and a lowered badge channel.
  const lidShape = new THREE.Shape();
  lidShape.moveTo(-.395, -.13); lidShape.lineTo(-.36, .095);
  lidShape.bezierCurveTo(-.36, .189, -.353, .211, -.342, .215);
  // The black inset spans local X -.275..+.231. Keep cast metal below it,
  // including the outward bevel, rather than running a silver crown through it.
  lidShape.lineTo(-.325, .215); lidShape.lineTo(-.322, .145);
  lidShape.lineTo(.274, .145); lidShape.lineTo(.283, .206);
  lidShape.bezierCurveTo(.367, .196, .499, .083, .508, -.107);
  lidShape.bezierCurveTo(.507, -.245, .366, -.292, .175, -.286);
  lidShape.lineTo(-.305, -.23); lidShape.quadraticCurveTo(-.412, -.204, -.395, -.13);
  const lidGeo = new THREE.ExtrudeGeometry(lidShape, { depth: 1.735, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 5, curveSegments: 18, steps: 1 });
  lidGeo.translate(0, 0, -.868); lidGeo.computeVertexNormals();
  const cosmeticTrim = add(trim, lidGeo, mat.castLight, [.512, 1.89, .16]);
  cosmeticTrim.name = 'Cosmetic front trim'; cosmeticTrim.userData.cosmeticTrim = true;
  rounded(trim, [.633, .015, 1.625], mat.recess, [.494, 2.121, .153], [0, 0, -.05], .023);
  const badge = rounded(trim, [.506, .032, 1.511], mat.black, [.49, 2.129, .155], [0, 0, -.05], .028);
  badge.userData.vr6Badge = true;
  rounded(trim, [.472, .022, .12], mat.castLight, [.488, 2.132, .967], [0, 0, -.05], .019);
  rounded(trim, [.472, .022, .12], mat.castLight, [.488, 2.132, -.646], [0, 0, -.05], .019);
  for (const z of [-.655, -.26, .16, .58, 1.009]) {
    bolt(sealGroup, [.937, 1.699, z], 'y', .78); bolt(trim, [.148, 2.038, z], 'y', .76);
  }
  for (const z of [-.6, -.35, -.1, .15, .4, .65, .9]) {
    const shoulder = new THREE.CubicBezierCurve3(new THREE.Vector3(.795, 2.096, z), new THREE.Vector3(.879, 2.086, z), new THREE.Vector3(1.011, 1.973, z), new THREE.Vector3(1.02, 1.783, z));
    const points = [];
    for (let j = 0; j <= 18; j++) {
      const t = j / 18, p = shoulder.getPoint(t), tangent = shoulder.getTangent(t);
      p.addScaledVector(new THREE.Vector3(-tangent.y, tangent.x, 0).normalize(), .032);
      points.push(p.toArray());
    }
    sweep(sealGroup, points, .02, .027, mat.castLight, { planar: true, steps: 31, sides: 12 });
  }
  // Orange T-bar dipstick at the centre of the FRONT outer edge (photographs): the
  // handle lies along the long edge just below the trim, and its guide tube drops
  // through the gap between exhaust runners 3 and 4 into the crankcase.
  const DX = 1.08;
  const gripG = new THREE.Group(); gripG.position.set(DX, 0, 0); gripG.rotation.y = PI / 2; dipstick.add(gripG);
  const dipstickGrip = sweep(gripG, [[-.2, 1.757, 0], [-.12, 1.768, 0], [0, 1.774, 0], [.12, 1.768, 0], [.2, 1.757, 0]], .017, .022, mat.dipstick, { planar: true, steps: 24, sides: 12 });
  dipstickGrip.name = 'Orange dipstick T-bar';
  cyl(dipstick, .019, .071, mat.dipstick, [DX, 1.718, 0]);
  hose(dipstick, [[DX, 1.684, 0], [DX + .02, 1.42, 0], [DX - .02, 1.12, 0], [.8, .93, 0], [.7, .9, 0]], .012, 0, mat.steel);
  cyl(dipstick, .02, .035, mat.black, [.71, .9, 0], 'x');
  for (let i = 0; i < 6; i++) {
    const z = Z[i];
    const connector = new THREE.Group(); ignition.add(connector);
    connector.name = 'Ignition connector ' + (i + 1);
    rounded(connector, [.092, .145, .083], mat.red, [.109, 2.008, z], [0, 0, .075], .014);
    rounded(connector, [.031, .063, .054], mat.redSleeve, [.13, 1.946, z], [0, 0, .075], .009);
    hose(connector, [[.128, 1.931, z], [.155, 1.908, z + .006], [.188, 1.91, z + .018], [.209, 1.932, z + .018]], .016, 9, mat.redSleeve);
    rounded(connector, [.058, .042, .057], mat.black, [.232, 1.934, z + .018], [0, 0, -.07], .009);
    hose(connector, [[.232, 1.934, z + .018], [.253, 1.94, z + .008], [.277, 1.942, z]], .005, 0, mat.brass);
  }
  rounded(ignition, [.11, .096, 2.043], mat.black, [.261, 1.993, 0], undefined, .018);
  for (let i = 0; i < 45; i++) rounded(ignition, [.117, .101, .012], mat.plastic, [.261, 1.996, -.995 + i * .045], undefined, .003);
  for (const z of [-.8, -.2, .4, .94]) {
    rounded(ignition, [.067, .021, .039], mat.plastic, [.298, 2.048, z], undefined, .007);
    bolt(ignition, [.323, 2.044, z], 'y', .5);
  }

  // A broad rear plenum feeds six shallow, near-rectangular cast ducts.
  rounded(intake, [.579, .298, 1.938], mat.castLight, [-.684, 1.979, -.019], [0, 0, .04], .089);
  rounded(intake, [.533, .059, 1.844], mat.castLight, [-.72, 2.12, -.019], [0, 0, .045], .021);
  for (let i = 0; i < 6; i++) {
    const z = Z[i];
    const shift = i % 2 ? .006 : -.006;
    const points = [[-.708, 1.994, z], [-.597, 2.073, z], [-.412, 2.124 + shift, z], [-.183, 2.117 + shift, z], [-.019, 2.066, z], [.018, 2.022, z]];
    const duct = sweep(intake, points, .05, .149, mat.castLight, { planar: true, rectangular: true, bulge: .22, steps: 52, sides: 24 });
    duct.name = 'Cast intake duct ' + (i + 1); duct.userData.intakeDuct = i + 1;
    sweep(intake, [[-.612, 2.12, z], [-.42, 2.177 + shift, z], [-.195, 2.17 + shift, z], [-.049, 2.126, z]], .006, .013, mat.castLight, { planar: true, rectangular: true, steps: 30, sides: 12 });
    for (const edgeZ of [z -.12, z + .12]) rounded(intake, [.105, .219, .043], mat.castLight, [.055, 1.931, edgeZ], [0, 0, -.06], .016);
    rounded(intake, [.17, .056, .238], mat.cast, [.09, 1.811, z], [0, 0, -.21], .02);
    bolt(intake, [.162, 1.862, z], 'y', .77);
  }
  rounded(intake, [.117, .058, 1.874], mat.edge, [.123, 1.789, 0], [0, 0, -.1], .022);
  rounded(intake, [.122, .016, 1.886], mat.gasket, [.123, 1.753, 0], [0, 0, -.1], .005);
  // Rear/gearbox-end throttle joins the plenum and a substantial intake elbow.
  const throttle = cyl(intake, .183, .14, mat.castLight, [-.715, 1.984, -1.048], 'z', 48);
  throttle.name = 'Gearbox-end throttle housing';
  rounded(intake, [.177, .145, .121], mat.black, [-.923, 1.957, -1.079], [0, 0, .16], .027);
  ring(intake, .167, .018, mat.edge, [-.715, 1.984, -1.125]);
  cyl(intake, .153, .016, mat.recess, [-.715, 1.984, -1.124], 'z', 40);
  for (const [dx, dy] of [[-.15, -.115], [.15, -.115], [-.15, .115], [.15, .115]]) bolt(intake, [-.715 + dx, 1.984 + dy, -1.117], 'z', .64);
  const elbowCurve = new THREE.CubicBezierCurve3(new THREE.Vector3(-.715, 1.984, -1.125), new THREE.Vector3(-.715, 1.984, -1.324), new THREE.Vector3(-.906, 1.915, -1.485), new THREE.Vector3(-1.143, 1.864, -1.485));
  const elbow = hose(intake, elbowCurve.getPoints(16).map(p => p.toArray()), .148);
  elbow.name = 'Rear intake elbow to vehicle air duct';
  clamp(intake, [-.72, 1.982, -1.158], [0, 0, -1], .148, .38);
  clamp(intake, [-1.111, 1.871, -1.484], [-.237, -.051, 0], .148, .2);
  const airDuctCoupler = add(intake, new THREE.CylinderGeometry(.15, .15, .068, 40, 1, true), mat.black, [-1.143, 1.864, -1.485]);
  airDuctCoupler.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.237, -.051, 0).normalize());
  airDuctCoupler.name = 'External vehicle air-duct connector'; airDuctCoupler.userData.externalConnector = true;
  hose(intake, [[-.914, 1.945, -1.066], [-.973, 1.863, -.951], [-.941, 1.725, -.838], [-.803, 1.609, -.742]], .018, 23, mat.black);
  rounded(intake, [.052, .058, .076], mat.plastic, [-.803, 1.609, -.742], [0, 0, .18], .008);
  profile(intake, [[-.12, -.07], [.12, -.07], [.135, .073], [-.083, .095]], .055, mat.cast, [-.796, 2.109, -.893], [[.072, .023, .027]], .012);

  // Exhaust branches remain naturally aspirated and partly hidden behind engine.
  rounded(exhaust, [.061, .157, 1.993], mat.exhaust, [-.766, 1.577, -.034], undefined, .022);
  for (let i = 0; i < 6; i++) {
    const z = Z[i];
    hose(exhaust, [[-.79, 1.595, z], [-1.067, 1.405, z], [-1.138, 1.069, z -.05], [-.928, .929, z * .33 -.49], [-.798, .91, -.96]], .053, 0, mat.exhaust);
    bolt(exhaust, [-.815, 1.637, z], '-x', .75);
  }
  hose(exhaust, [[-.798, .91, -.96], [-.866, .758, -1.206], [-.9, .617, -1.44]], .11, 0, mat.exhaust);
  ring(exhaust, .125, .016, mat.zinc, [-.9, .617, -1.449]);
  rounded(exhaust, [.137, .31, 1.78], mat.castDark, [-1.036, 1.42, -.073], [0, 0, .22], .025);
  for (const z of [-.67, 0, .64]) bolt(exhaust, [-1.115, 1.417, z], '-x', .7);

  // Sump: bevelled cast mass with a taper, gasket lip and realistic low fittings.
  profile(sump, [[-.57, .16], [.57, .16], [.49, -.1], [.25, -.23], [-.31, -.22], [-.49, -.08]], 1.967, mat.castDark, [0, .483, -.037], [], .051);
  rounded(sump, [1.257, .045, 2.069], mat.edge, [0, .672, -.037], undefined, .014);
  rounded(sump, [1.27, .014, 2.081], mat.gasket, [0, .704, -.037], undefined, .004);
  for (const x of [-.4, -.2, 0, .2, .4]) rounded(sump, [.053, .04, 1.572], mat.cast, [x, .284, -.045], undefined, .012);
  for (const side of [-1, 1]) for (const z of [-.86, -.43, 0, .43, .86]) bolt(sump, [side * .544, .71, z], 'y', .82);
  cyl(sump, .079, .045, mat.brass, [.33, .414, 1.019], 'z', 6);
  hose(accessories, [[-.573, .442, -.673], [-.81, .589, -.553], [-.818, .82, -.14], [-.61, 1.039, .08]], .029, 0, mat.steel);
  cyl(accessories, .092, .214, mat.black, [-.773, .771, -.27], 'y');

  // Asymmetric front drive: a large solid dark crank damper, smaller hubs nearby.
  profile(belt, [[-.22, -.39], [-.28, -.14], [-.17, .12], [-.06, .39], [.14, .39], [.21, .06], [.36, -.1], [.28, -.37]], .096, mat.castLight, [.22, .828, 1.292], [[.07, .225, .048], [.16, -.225, .048], [-.108, -.103, .037]], .023);
  profile(belt, [[-.16, -.08], [-.21, .09], [-.05, .24], [.15, .18], [.18, -.1]], .106, mat.cast, [-.547, 1.014, 1.279], [[-.04, .095, .047]], .019);
  rounded(belt, [.249, .137, .187], mat.cast, [.684, .717, 1.238], [0, 0, .34], .031);
  const pulleys = [
    { x: -.36, y: .591, r: .309, style: 'crank' },
    { x: -.56, y: 1.02, r: .118, style: 'idler' },
    { x: .09, y: 1.135, r: .146, style: 'hub' },
    { x: .636, y: .794, r: .15, style: 'alternator' },
    { x: .291, y: .491, r: .102, style: 'idler' },
    { x: .021, y: .819, r: .073, style: 'idler' },
  ];
  for (const p of pulleys) {
    // The belt contact plane is fixed; cast supports and face caps have depth.
    const mountingDepth = p.style === 'crank' ? 1.305 : p.style === 'hub' ? 1.369 : p.style === 'alternator' ? 1.326 : 1.355;
    cyl(belt, p.r * (p.style === 'crank' ? .77 : .64), .136, p.style === 'hub' ? mat.cast : mat.castDark, [p.x, p.y, mountingDepth], 'z', 40);
    ring(belt, p.r * .62, .012, mat.oxide, [p.x, p.y, mountingDepth + .075]);
    cyl(belt, p.r * .35, .071, mat.steel, [p.x, p.y, 1.409], 'z');
    const hubFace = p.style === 'crank' ? 1.549 : p.style === 'hub' ? 1.53 : p.style === 'alternator' ? 1.513 : 1.529;
    cyl(belt, p.r, p.style === 'crank' ? .13 : .083, mat.black, [p.x, p.y, 1.461], 'z', 48);
    ring(belt, p.r - .009, .009, p.style === 'crank' ? mat.recess : mat.steel, [p.x, p.y, 1.515]);
    for (const dz of [-.034, -.015, .004]) ring(belt, p.r -.005, .005, mat.recess, [p.x, p.y, 1.48 + dz]);
    cyl(belt, p.r * (p.style === 'crank' ? .80 : .6), .021, p.style === 'crank' ? mat.black : p.style === 'hub' ? mat.castLight : mat.steel, [p.x, p.y, hubFace], 'z', 40);
    ring(belt, p.r * .49, .007, mat.recess, [p.x, p.y, hubFace + .016]);
    bolt(belt, [p.x, p.y, hubFace + .024], 'z', p.style === 'crank' ? 1.23 : .86);
    if (p.style === 'crank' || p.style === 'hub') for (let i = 0; i < (p.style === 'crank' ? 6 : 4); i++) {
      const a = i * PI * 2 / (p.style === 'crank' ? 6 : 4), radius = p.r * .61;
      cyl(belt, p.r * .069, .01, mat.recess, [p.x + Math.sin(a) * radius, p.y + Math.cos(a) * radius, hubFace + .016], 'z', 14);
    }
  }
  profile(belt, [[-.148, -.145], [.092, -.161], [.16, -.014], [.074, .218], [-.091, .231]], .116, mat.castDark, [-.397, .857, 1.225], [[.039, .121, .037]], .017);
  profile(belt, [[-.116, -.124], [.13, -.133], [.21, .074], [.028, .173], [-.1, .085]], .137, mat.cast, [.335, 1.021, 1.19], [[.074, .019, .047]], .018);
  rounded(belt, [.123, .071, .147], mat.oxide, [.444, 1.175, 1.214], [0, 0, -.16], .012);
  cyl(belt, .033, .037, mat.zinc, [.417, 1.136, 1.283], 'z', 6);
  const beltRoute = [pulleys[0], pulleys[1], pulleys[2], pulleys[3], pulleys[4]];
  const tangents = beltRoute.map((p, i) => {
    const q = beltRoute[(i + 1) % beltRoute.length], dx = q.x - p.x, dy = q.y - p.y;
    return Math.atan2(dy, dx) + Math.acos(THREE.MathUtils.clamp((p.r - q.r) / Math.hypot(dx, dy), -1, 1));
  });
  const beltPath = [];
  for (let i = 0; i < beltRoute.length; i++) {
    const p = beltRoute[i]; let start = tangents[(i + beltRoute.length - 1) % beltRoute.length], end = tangents[i];
    while (end > start) end -= PI * 2;
    const count = Math.max(3, Math.ceil((start - end) * 8));
    for (let j = 0; j <= count; j++) {
      const a = start + (end - start) * j / count;
      beltPath.push([p.x + Math.cos(a) * (p.r + .002), p.y + Math.sin(a) * (p.r + .002), 1.47]);
    }
    const q = beltRoute[(i + 1) % beltRoute.length];
    const from = beltPath[beltPath.length - 1], to = [q.x + Math.cos(tangents[i]) * (q.r + .002), q.y + Math.sin(tangents[i]) * (q.r + .002), 1.47];
    for (const t of [.25, .5, .75]) beltPath.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, 1.47]);
  }
  beltPath.push([...beltPath[0]]);
  sweep(belt, beltPath, .014, .039, mat.rubber, { planar: true, steps: 128, sides: 12 });
  // Three narrow ribs on the belt read clearly in close-up.
  for (const dz of [-.024, 0, .024]) hose(belt, beltPath.map(p => [p[0], p[1], p[2] + dz]), .007, 0, mat.black);

  // Vented alternator cage uses bars around a recessed copper/stator interior.
  const ax = .636, ay = .794, az = 1.202;
  cyl(alternator, .111, .254, mat.recess, [ax, ay, az], 'z', 40);
  cyl(alternator, .13, .205, mat.copper, [ax, ay, az], 'z', 40);
  for (const z of [az -.088, az, az + .088]) cyl(alternator, .154, .025, mat.recess, [ax, ay, z], 'z', 40);
  for (const z of [az -.157, az + .148]) {
    ring(alternator, .184, .027, mat.castLight, [ax, ay, z]);
    cyl(alternator, .166, .042, mat.castDark, [ax, ay, z], 'z', 40);
  }
  for (let i = 0; i < 12; i++) {
    const a = i * PI / 6;
    rounded(alternator, [.038, .047, .28], mat.castLight, [ax + Math.sin(a) * .178, ay + Math.cos(a) * .178, az], [0, 0, -a], .011);
  }
  const noseOutline = [], noseHoles = [[0, 0, .074]];
  for (let i = 0; i < 36; i++) {
    const a = i * PI / 18, r = i === 4 || i === 21 ? .209 : .18;
    noseOutline.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = 0; i < 6; i++) {
    const a = i * PI / 3 + .19;
    noseHoles.push([Math.cos(a) * .127, Math.sin(a) * .127, .017, .043, a - PI / 2]);
  }
  profile(alternator, noseOutline, .028, mat.castLight, [ax, ay, 1.399], noseHoles, .004);
  for (const a of [.63, 3.7]) bolt(alternator, [ax + Math.cos(a) * .185, ay + Math.sin(a) * .185, 1.421], 'z', .58);
  rounded(alternator, [.194, .105, .136], mat.black, [ax, ay + .247, az -.078], undefined, .025);
  hose(alternator, [[ax, ay + .274, az -.08], [.928, 1.21, .913], [.89, 1.48, .51], [.779, 1.628, .013]], .025, 35);
  rounded(alternator, [.069, .078, .1], mat.plastic, [.779, 1.628, .013], [0, 0, -.19], .012);
  profile(alternator, [[-.087, -.12], [.078, -.13], [.173, .055], [.107, .193], [-.057, .157]], .12, mat.cast, [.877, .978, 1.213], [[.056, .064, .046]], .02);
  for (const [x, y] of [[-.758, 1.025], [-.493, 1.318], [.19, 1.432], [.493, 1.247], [.898, .931], [.029, .487]]) bolt(belt, [x, y, 1.398], 'z', .85);
  hose(accessories, [[-.582, 1.556, 1.19], [-.316, 1.51, 1.241], [.11, 1.535, 1.249], [.426, 1.559, 1.173], [.603, 1.669, 1.066]], .03, 43);
  for (const p of [[-.582, 1.556, 1.19], [.603, 1.669, 1.066]]) rounded(accessories, [.081, .057, .07], mat.plastic, p, undefined, .012);
  // Wiring hugs the head rail and terminates in plugs, without a perimeter frame.
  hose(wiring, [[.812, 1.739, -.722], [.876, 1.665, -.41], [.861, 1.649, -.02], [.811, 1.574, .274]], .019, 43);
  for (const p of [[.812, 1.739, -.722], [.811, 1.574, .274]]) rounded(wiring, [.063, .069, .082], mat.black, p, [0, 0, -.14], .009);
  for (const z of [-.4, .01]) {
    rounded(wiring, [.057, .03, .032], mat.plastic, [.887, 1.679, z], [0, 0, -.11], .004);
    rounded(wiring, [.012, .027, .029], mat.zinc, [.916, 1.68, z], [0, 0, -.11], .003);
  }

  // Compact side ancillary housings. Dark cylinders break up the lower mass.
  cyl(accessories, .15, .486, mat.black, [.91, .754, -.345], 'z', 40);
  for (const z of [-.607, -.084]) {
    cyl(accessories, .153, .044, mat.cast, [.91, .754, z], 'z', 40);
    ring(accessories, .145, .012, mat.steel, [.91, .754, z]);
  }
  cyl(accessories, .081, .244, mat.castLight, [.912, .938, -.384], 'z');
  cyl(accessories, .044, .064, mat.black, [.912, .938, -.553], 'z');
  rounded(accessories, [.138, .078, .245], mat.cast, [.813, .882, -.349], [0, 0, -.21], .021);
  for (const z of [-.521, -.164]) bolt(accessories, [1.051, .753, z], 'x', .78);
  cyl(accessories, .132, .328, mat.black, [-.838, 1.054, -.335], 'y', 40);
  ring(accessories, .127, .013, mat.steel, [-.838, 1.227, -.335], 'y');
  cyl(accessories, .133, .041, mat.recess, [-.838, 1.248, -.335], 'y', 14);
  rounded(accessories, [.244, .13, .236], mat.cast, [-.785, .843, -.335], [0, 0, .1], .025);
  cyl(accessories, .092, .25, mat.castLight, [.382, 1.356, 1.181], 'z');
  cyl(accessories, .074, .023, mat.black, [.382, 1.356, 1.322], 'z');
  ring(accessories, .086, .008, mat.steel, [.382, 1.356, 1.343]);
  hose(accessories, [[-.838, 1.05, -.335], [-.989, 1.2, -.155], [-1.004, 1.414, .16], [-.823, 1.531, .27]], .029, 31);
  hose(accessories, [[.914, .944, -.51], [1.036, 1.09, -.66], [1.051, 1.418, -.398], [.936, 1.577, -.224]], .021, 42);
  profile(accessories, [[-.16, -.13], [.13, -.13], [.23, .12], [.037, .26], [-.136, .08]], .084, mat.cast, [.688, .536, .549], [[.119, .093, .047]], .016);
  profile(accessories, [[-.148, -.18], [.144, -.18], [.12, .11], [-.099, .183]], .083, mat.cast, [-.841, .787, .68], [[.015, -.018, .053]], .016);
  hose(accessories, [[-1.087, 1.58, .739], [-1.165, 1.717, .628], [-1.22, 1.695, .477]], .023, 23);
  rounded(accessories, [.11, .08, .131], mat.plastic, [-1.217, 1.691, .424], [0, -.15, .2], .018);
  cyl(accessories, .035, .048, mat.recess, [-1.222, 1.69, .329], 'z', 12);
  hose(accessories, [[1.008, 1.154, .728], [1.094, 1.407, .814], [1.162, 1.419, 1.029]], .022, 25);
  rounded(accessories, [.08, .093, .12], mat.black, [1.168, 1.416, 1.079], [0, .21, -.12], .016);
  // Engine-side plumbing: a mounted housing, large outlet, rigid return and bleed.
  // External couplers identify connections to the vehicle, not a modeled radiator.
  const coolingPorts = [], coolingConnections = [];
  const thermostatBody = profile(cooling, [[-.19, -.15], [.1, -.18], [.24, -.03], [.19, .17], [-.16, .19], [-.21, .05]], .24, mat.black, [.334, 1.002, -1.171], [], .027);
  thermostatBody.name = 'Engine-side thermostat/distributor housing';
  rounded(cooling, [.329, .27, .026], mat.gasket, [.334, 1.003, -1.04], undefined, .012);
  for (const [x, y] of [[.184, 1.102], [.466, .904], [.462, 1.122]]) bolt(cooling, [x, y, -1.314], 'z', .69);
  const thermostatFlange = cyl(cooling, .126, .052, mat.cast, [.32, .978, -1.312], 'z', 40);
  ring(cooling, .12, .01, mat.gasket, [.32, .978, -1.345]);
  // A valve disk, seal and spring remain contained inside the flange opening.
  cyl(cooling, .092, .012, mat.zinc, [.32, .978, -1.349], 'z', 36);
  cyl(cooling, .021, .074, mat.steel, [.32, .978, -1.377], 'z', 20);
  for (const z of [-1.354, -1.369, -1.384]) ring(cooling, .032, .005, mat.steel, [.32, .978, z]);
  const pumpFixture = rounded(block, [.27, .205, .171], mat.cast, [-.707, .916, .718], [0, 0, .03], .027);
  pumpFixture.name = 'Return-pipe engine fitting';
  bolt(block, [-.827, .952, .739], 'x', .7);

  function coolantPort(id, label, xyz, direction, radius, parent, support, external = false) {
    const p = new THREE.Vector3(...xyz), axis = new THREE.Vector3(...direction).normalize(), depth = .12;
    const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, depth, 36, 1, true), external ? mat.black : mat.cast, p.clone().addScaledVector(axis, -depth / 2).toArray());
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    mesh.name = label; mesh.userData.coolingPortId = id; mesh.userData.externalConnector = external;
    const lip = ring(parent, radius + .003, .006, external ? mat.zinc : mat.cast, p.toArray(), 'y');
    lip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    const port = { id, label, position: p.toArray(), axis: axis.toArray(), radius, external, assemblyId: parent.userData.assemblyId, innerPosition: p.clone().addScaledVector(axis, -depth).toArray(), insertionDepth: depth, supportMeshUuid: support?.uuid || null, mesh, support };
    mesh.userData.coolingJoint = { id, position: port.position, axis: port.axis, radius, insertionDepth: depth, external, supportMeshUuid: port.supportMeshUuid };
    coolingPorts.push(port); return port;
  }
  function coolantConnection(id, from, to, bends, radius, rigid = false) {
    const p = new THREE.Vector3(...from.position), q = new THREE.Vector3(...to.position);
    const a = new THREE.Vector3(...from.axis), b = new THREE.Vector3(...to.axis);
    const run = [p.toArray(), p.clone().addScaledVector(a, .065).toArray(), ...bends, q.clone().addScaledVector(b, .065).toArray(), q.toArray()];
    const handle = Math.max(radius * 1.8, p.distanceTo(q) * .46);
    const smoothCurve = new THREE.CubicBezierCurve3(p, p.clone().addScaledVector(a, handle), q.clone().addScaledVector(b, handle), q);
    const mesh = rigid ? hose(cooling, run, radius, 0, mat.steel) : sweep(cooling, [], radius, radius, mat.rubber, { curve: smoothCurve, steps: 64, sides: 12, open: true });
    mesh.name = id; mesh.userData.coolingConnectionId = id;
    for (const [point, axis] of [[p, a], [q, b]]) clamp(cooling, point.clone().addScaledVector(axis, .026).toArray(), axis.toArray(), radius, .24);
    coolingConnections.push({ id, from: from.id, to: to.id, radius, rigid, start: p.toArray(), end: q.toArray(), mesh });
    return mesh;
  }
  const headOutlet = coolantPort('head-outlet', 'Cylinder-head coolant outlet', [.468, 1.751, -1.194], [0, 0, -1], .065, head, headCasting);
  const upperPort = coolantPort('housing-inlet', 'Thermostat inlet', [.422, 1.128, -1.403], [0, 0, -1], .065, cooling, thermostatBody);
  coolantConnection('Head outlet to thermostat', headOutlet, upperPort, [[.458, 1.6, -1.342], [.442, 1.416, -1.35]], .065);
  const mainPort = coolantPort('housing-main-outlet', 'Main coolant outlet', [.32, .978, -1.438], [0, 0, -1], .081, cooling, thermostatFlange);
  const radiatorCoupler = coolantPort('external-radiator-hose', 'External radiator hose connector', [.254, .804, -1.687], [0, .3, 1], .081, cooling, null, true);
  coolantConnection('Main outlet to radiator hose connector', mainPort, radiatorCoupler, [[.297, .925, -1.567]], .081);
  const pumpPort = coolantPort('engine-return-fitting', 'Engine coolant return fitting', [-.763, .915, .586], [0, 0, -1], .038, block, pumpFixture);
  const returnPort = coolantPort('housing-return', 'Thermostat return inlet', [.052, .933, -1.164], [-1, 0, 0], .038, cooling, thermostatBody);
  coolantConnection('Rigid engine return pipe', pumpPort, returnPort, [[-.773, .901, .1], [-.772, .894, -.49], [-.636, .915, -.923], [-.323, .922, -1.11]], .038, true);
  for (const z of [.23, -.49]) {
    // A proper strap clamps the pipe and its short mounting ear reaches the block.
    clamp(cooling, [-.773, .9, z], [0, 0, -1], .038, .34);
    rounded(block, [.135, .035, .047], mat.zinc, [-.71, .943, z], [0, 0, .16], .006);
    bolt(block, [-.652, .958, z], 'y', .57);
  }
  const bleedPort = coolantPort('housing-bleed', 'Small coolant bleed outlet', [.524, 1.045, -1.353], [0, 0, -1], .018, cooling, thermostatBody);
  const expansionCoupler = coolantPort('external-expansion-hose', 'External expansion-tank hose connector', [.635, 1.281, -1.511], [0, -1, 0], .018, cooling, null, true);
  coolantConnection('Small bleed line to vehicle hose connector', bleedPort, expansionCoupler, [[.525, 1.081, -1.482], [.61, 1.148, -1.512]], .018);
  rounded(cooling, [.083, .067, .359], mat.plastic, [.635, 1.397, -1.34], undefined, .017);
  bolt(cooling, [.635, 1.434, -1.195], 'y', .52);
  // Sensor body and retaining clip are part of this illustrative housing.
  cyl(cooling, .025, .074, mat.brass, [.564, 1.075, -1.17], 'x', 20);
  rounded(cooling, [.064, .075, .086], mat.plastic, [.619, 1.075, -1.17], [0, 0, .06], .011);
  ring(cooling, .03, .004, mat.zinc, [.586, 1.075, -1.17], 'x');
  rounded(cooling, [.017, .084, .014], mat.zinc, [.59, 1.075, -1.134], undefined, .004);

  /* ── rotating assembly ─────────────────────────────────────────────────
     Seven main journals, six throws, rods and pistons. Throw phasing is
     illustrative (three 120° pairs, each pair split by a small offset); piston
     heights are SOLVED from rod length so every rod really reaches its
     piston pin instead of floating beside it. */
  {
    const crankY = .80, throwR = .184, rodL = .55;
    const mains = [-.95, -.6325, -.3175, 0, .3175, .6325, .95];
    cyl(crank, .085, 2.04, mat.steel, [0, crankY, 0], 'z', 28);
    for (const z of mains) {
      cyl(crank, .105, .15, mat.edge, [0, crankY, z], 'z', 32);
      ring(crank, .108, .006, mat.zinc, [0, crankY, z + .08]);
    }
    cyl(crank, .2, .05, mat.steel, [0, crankY, -1.02], 'z', 40);        // gearbox-end flange
    cyl(crank, .13, .12, mat.steel, [0, crankY, 1.04], 'z', 28);        // nose for the front drive
    for (let i = 0; i < 6; i++) {
      const z = Z[i], th = (i >> 1) * (2 * PI / 3) + (i & 1) * .39;
      const px = Math.sin(th) * throwR, py = crankY + Math.cos(th) * throwR;
      cyl(crank, .092, .2, mat.edge, [px, py, z], 'z', 28);
      for (const dz of [-.105, .105]) {
        const web = rounded(crank, [.36, .27, .045], mat.steel, [Math.sin(th) * throwR * .5, crankY + Math.cos(th) * throwR * .5, z + dz], [0, 0, -th], .03);
        web.name = 'Crank web';
        const cw = profile(crank, [[-.15, .02], [.15, .02], [.21, -.16], [.1, -.29], [-.1, -.29], [-.21, -.16]], .04, mat.castDark, [Math.sin(th + PI) * .02, crankY - Math.cos(th) * .0, z + dz * 1.13], [], .01);
        cw.rotation.z = -th + PI; cw.position.set(0, crankY, z + dz * 1.13);
      }
      // piston solved on its bore axis so the rod length is honoured
      const ba = (i % 2 ? -1 : 1) * THREE.MathUtils.degToRad(7.5), dir = new THREE.Vector2(-Math.sin(ba), Math.cos(ba));
      const b0 = new THREE.Vector2(i % 2 ? .16 : -.16, 1.50), pin = new THREE.Vector2(px, py);
      const w = b0.clone().sub(pin), bq = w.dot(dir), cq = w.lengthSq() - rodL * rodL;
      const sSol = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
      const q = b0.clone().addScaledVector(dir, Math.min(sSol, .02));
      const rodDir = new THREE.Vector3(q.x - pin.x, q.y - pin.y, 0);
      const len = rodDir.length(); rodDir.normalize();
      const rod = rounded(crank, [.085, len, .055], mat.steel, [(q.x + pin.x) / 2, (q.y + pin.y) / 2, z], undefined, .02);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rodDir);
      rod.name = 'Connecting rod ' + (i + 1);
      ring(crank, .125, .03, mat.steel, [pin.x, pin.y, z]);
      ring(crank, .055, .02, mat.steel, [q.x, q.y, z]);
      const pg = new THREE.Group(); pg.name = 'Piston ' + (i + 1);
      pg.position.set(q.x, q.y, z); pg.rotation.z = ba; crank.add(pg);
      kit.lathe(pg, [[0, .1], [.124, .1], [.134, .09], [.134, -.1], [.12, -.11], [0, -.11]], mat.steel, [0, 0, 0], undefined, 36);
      for (const yy of [.07, .045, .02]) ring(pg, .1345, .005, mat.recess, [0, yy, 0], 'y');
      cyl(pg, .03, .24, mat.edge, [0, 0, 0], 'z', 16);
    }
  }

  root.userData.engineArchitecture = { layout: 'VR6', cylinders: 6, bankAngleDegrees: 15, cylinderHeads: 1, camshafts: 2, valves: 24, illustrative: true };
  const network = {
    illustrative: true, externalComponents: ['Vehicle radiator', 'Vehicle expansion tank', 'Vehicle air duct'],
    ports: coolingPorts.map(({ mesh, support, ...p }) => p),
    connections: coolingConnections.map(({ mesh, ...c }) => c),
  };
  return finishEngine(root, parts, { network, kit });
}

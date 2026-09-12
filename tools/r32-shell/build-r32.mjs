// Build a studio-ready Golf Mk5 R32 GLB from stunner2211's print shell (CC BY-NC-SA 3.0).
// Input: body.stl + wheel.stl. Output: one GLB with tagged parts (extras.part) and PBR materials.
// usage: node build-r32.mjs <dir-with-stls> <out.glb> [--json params.json]
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self = globalThis; globalThis.window = globalThis;
if (!globalThis.document) globalThis.document = { createElementNS: () => ({ style: {} }), createElement: () => ({ style: {}, getContext: () => null }) };
if (!globalThis.FileReader) globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.(); }); } readAsDataURL(blob) { blob.arrayBuffer().then(b => { this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`; this.onloadend?.(); }); } };

const [, , dir, out, ...flags] = process.argv;
const P = {
  length: 4.246,            // real Mk5 length (m) → sets scale from the 15-unit shell
  groundClearance: 0.184,   // body floor above ground, measured from complete.stl
  wheelY: [0.917, 3.505],   // wheel centres from the nose (m)
  wheelOuterX: 0.853,       // tyre outer face from centreline (m)
  tyreRadiusRatio: 0.70,    // r/R above which a wheel triangle is tyre
  // glass band (body coordinates: X width from centre, Y from nose, Z from body floor)
  beltZ: 0.76, roofZ: 1.205,
  sideGlassFront: (z) => 1.60 + (z - 0.76) * 0.9,   // A-pillar diagonal
  sideGlassRear: (z) => 3.85 - (z - 0.76) * 0.5,    // C-pillar diagonal
  windscreen: { y: [1.28, 1.98], z: [0.78, 1.19], xMax: 0.72 },
  rearScreen: { y: [3.75, 4.25], z: [0.72, 1.02], xMax: 0.62 },
  grille: { y: 0.35, z: [0.42, 0.57], xMax: 0.50 },
  intake: { y: 0.35, z: [0.04, 0.30], xMax: 0.72 },
  lampFront: { y: 0.5, z: [0.36, 0.60], x: [0.60, 0.90] },
  lampRear: { y: 3.9, z: [0.44, 0.80], x: [0.55, 0.92] },
  rearLower: { y: 4.05, z: 0.2, xMax: 0.55 },
  creaseDeg: 32,
};
if (flags.includes('--json')) Object.assign(P, JSON.parse(fs.readFileSync(flags[flags.indexOf('--json') + 1], 'utf8')));

const loader = new STLLoader();
const readSTL = f => loader.parse(fs.readFileSync(path.join(dir, f)).buffer);
let bodyGeo = readSTL('body.stl'), wheelGeo = readSTL('wheel.stl');
// STL winding sanity: outward normals must point away from the centroid; flip if the shell is inside-out.
function fixWinding(geo, label) {
  const p = geo.getAttribute('position'); const cen = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) cen.add(new THREE.Vector3().fromBufferAttribute(p, i)); cen.divideScalar(p.count);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), nn = new THREE.Vector3(), d = new THREE.Vector3(); let score = 0;
  for (let t = 0; t < p.count / 3; t++) {
    A.fromBufferAttribute(p, t * 3); B.fromBufferAttribute(p, t * 3 + 1); C.fromBufferAttribute(p, t * 3 + 2);
    nn.copy(B).sub(A).cross(d.copy(C).sub(A)); d.copy(A).add(B).add(C).divideScalar(3).sub(cen);
    score += Math.sign(nn.dot(d));
  }
  console.error(label, 'winding score', score, score < 0 ? '→ flipping' : '→ ok');
  if (score >= 0) return geo;
  const src = p.array, out = new Float32Array(src.length);
  for (let t = 0; t < p.count / 3; t++) { const o = t * 9; out.set(src.subarray(o, o + 3), o); out.set(src.subarray(o + 6, o + 9), o + 3); out.set(src.subarray(o + 3, o + 6), o + 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); return g;
}
bodyGeo = fixWinding(bodyGeo, 'body'); wheelGeo = fixWinding(wheelGeo, 'wheel');

// ── body: measure the raw frame ────────────────────────────────────────────
const bp = bodyGeo.getAttribute('position');
let bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < bp.count; i++) for (let k = 0; k < 3; k++) { const v = bp.getComponent(i, k); if (v < bmin[k]) bmin[k] = v; if (v > bmax[k]) bmax[k] = v; }
const S = P.length / (bmax[1] - bmin[1]);
const cx = (bmin[0] + bmax[0]) / 2;
// body coords helper (metres): X centred width, Y from nose, Z from floor
const toBody = (x, y, z) => [(x - cx) * S, (y - bmin[1]) * S, (z - bmin[2]) * S];

const triCount = bp.count / 3;
const cls = new Uint8Array(triCount);           // 0 paint,1 glass,2 grille,3 intake,4 lampF,5 lampR,6 dark
const N = ['paint', 'glass', 'grille', 'intake', 'lampFront', 'lampRear', 'dark'];
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
for (let t = 0; t < triCount; t++) {
  a.fromBufferAttribute(bp, t * 3); b.fromBufferAttribute(bp, t * 3 + 1); c.fromBufferAttribute(bp, t * 3 + 2);
  n.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
  const [X, Y, Z] = toBody((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
  const ax = Math.abs(X), nx = n.x, ny = n.y, nz = n.z;  // ny<0 faces the nose, nz>0 faces up
  let k = 0;
  if (nz < -0.75 && Z < 0.08) k = 6;                                                     // floor plate
  else if (Y > P.rearLower.y && Z < P.rearLower.z && ax < P.rearLower.xMax && ny > 0.4) k = 6; // diffuser
  else if (Y < P.intake.y && Z > P.intake.z[0] && Z < P.intake.z[1] && ax < P.intake.xMax && ny < -0.45) k = 3;
  else if (Y < P.grille.y && Z > P.grille.z[0] && Z < P.grille.z[1] && ax < P.grille.xMax && ny < -0.45) k = 2;
  else if (Y < P.lampFront.y && Z > P.lampFront.z[0] && Z < P.lampFront.z[1] && ax > P.lampFront.x[0] && ax < P.lampFront.x[1] && ny < -0.35 && nz < 0.8) k = 4;
  else if (Y > P.lampRear.y && Z > P.lampRear.z[0] && Z < P.lampRear.z[1] && ax > P.lampRear.x[0] && ax < P.lampRear.x[1] && ny > 0.3) k = 5;
  else if (ax < P.windscreen.xMax && Y > P.windscreen.y[0] && Y < P.windscreen.y[1] && Z > P.windscreen.z[0] && Z < P.windscreen.z[1] && ny < -0.25 && nz > 0.3 && nz < 0.88) k = 1;
  else if (ax < P.rearScreen.xMax && Y > P.rearScreen.y[0] && Y < P.rearScreen.y[1] && Z > P.rearScreen.z[0] && Z < P.rearScreen.z[1] && ny > 0.35 && nz > 0.15 && nz < 0.85) k = 1;
  else if (Math.abs(nx) > 0.45 && ax < 0.74 && ax > 0.5 && Z > P.beltZ && Z < P.roofZ && Y > P.sideGlassFront(Z) && Y < P.sideGlassRear(Z)) k = 1;
  // wheel-arch liners: near a wheel, low, not facing sideways
  else if (Z < 0.7 && ax > 0.45 && nx * Math.sign(X) < -0.35 && P.wheelY.some(y => Math.abs(Y - y) < 0.45)) k = 6;   // inward-facing arch walls
  cls[t] = k;
}
const counts = {}; for (const k of cls) counts[N[k]] = (counts[N[k]] || 0) + 1;
console.error('body class counts', counts);

// build per-class geometries in studio frame: x = -(Y - L/2), y = Z + ground clearance, z = X
function extract(src, sel, transform) {
  const p = src.getAttribute('position'); const arr = [];
  for (let t = 0; t < p.count / 3; t++) if (sel(t)) for (let v = 0; v < 3; v++) { const i = t * 3 + v; arr.push(...transform(p.getX(i), p.getY(i), p.getZ(i))); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  g = mergeVertices(g, 1e-5); g = toCreasedNormals(g, THREE.MathUtils.degToRad(P.creaseDeg)); return g;
}
// studio frame: nose at -x, y up, +z = car's left side (rotation of body frame by 180° about y keeps handedness)
const bodyXform = (x, y, z) => { const [X, Y, Z] = toBody(x, y, z); return [-(Y - P.length / 2), Z + P.groundClearance, -X]; };  // det +1

// ── materials ─────────────────────────────────────────────────────────────
const M = {
  paint: new THREE.MeshPhysicalMaterial({ name: 'Paint_Body', color: 0x1748b5, metalness: .55, roughness: .28, clearcoat: 1, clearcoatRoughness: .06 }),
  glass: new THREE.MeshPhysicalMaterial({ name: 'Glass', color: 0x0b1620, metalness: .05, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .97 }),
  grille: new THREE.MeshStandardMaterial({ name: 'Grille_Alu', color: 0x9aa3ab, metalness: .9, roughness: .38 }),
  intake: new THREE.MeshStandardMaterial({ name: 'Intake_Mesh', color: 0x101214, metalness: .1, roughness: .85 }),
  lampFront: new THREE.MeshPhysicalMaterial({ name: 'Lamp_Front', color: 0xd6dde3, metalness: .3, roughness: .06, clearcoat: 1 }),
  lampRear: new THREE.MeshPhysicalMaterial({ name: 'Lamp_Rear', color: 0xb0101c, metalness: .1, roughness: .12, clearcoat: 1, emissive: 0x3a0308, emissiveIntensity: .35 }),
  dark: new THREE.MeshStandardMaterial({ name: 'Underbody', color: 0x15181b, metalness: .05, roughness: .9 }),
  rim: new THREE.MeshStandardMaterial({ name: 'Rim_Zolder', color: 0xaab3b4, metalness: .88, roughness: .28 }),
  tyre: new THREE.MeshStandardMaterial({ name: 'Tyre', color: 0x121415, metalness: 0, roughness: .92 }),
};
const scene = new THREE.Scene(); scene.name = 'Volkswagen_Golf_R32_Mk5_2006';
const vehicle = new THREE.Group(); vehicle.name = 'Vehicle'; scene.add(vehicle);
const PART = { paint: 'body', glass: 'glass', grille: 'body', intake: 'body', lampFront: 'body', lampRear: 'body', dark: 'trim' };
const NAME = { paint: 'Body_Shell', glass: 'Glazing', grille: 'Grille', intake: 'Front_Intake', lampFront: 'Headlamps', lampRear: 'Tail_Lamps', dark: 'Underbody_Arches' };
for (let k = 0; k < N.length; k++) {
  const g = extract(bodyGeo, t => cls[t] === k, bodyXform);
  if (!g.getAttribute('position').count) continue;
  const m = new THREE.Mesh(g, M[N[k]]); m.name = NAME[N[k]]; m.userData = { part: PART[N[k]], piece: N[k] }; vehicle.add(m);
}

// ── wheels: split rim/tyre by radius, orient so the spoke face points outward ─
const wp = wheelGeo.getAttribute('position');
let wmin = [Infinity, Infinity, Infinity], wmax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < wp.count; i++) for (let k = 0; k < 3; k++) { const v = wp.getComponent(i, k); if (v < wmin[k]) wmin[k] = v; if (v > wmax[k]) wmax[k] = v; }
const wc = [(wmin[0] + wmax[0]) / 2, (wmin[1] + wmax[1]) / 2, (wmin[2] + wmax[2]) / 2];
const R = Math.max(wmax[1] - wmin[1], wmax[2] - wmin[2]) / 2;   // axis along x
// which x side carries the spoke face? count triangles with small radius near each end
let lo = 0, hi = 0;
for (let t = 0; t < wp.count / 3; t++) { const i = t * 3; const r = Math.hypot(wp.getY(i) - wc[1], wp.getZ(i) - wc[2]); if (r < .55 * R) { if (wp.getX(i) < wc[0]) lo++; else hi++; } }
const faceSign = hi >= lo ? 1 : -1;  // +1: spokes at +x end of wheel.stl
console.error('wheel: R(m)', (R * S).toFixed(3), 'width(m)', ((wmax[0] - wmin[0]) * S).toFixed(3), 'spoke face at', faceSign > 0 ? '+x' : '-x', { lo, hi });
const wheelClass = t => { let rs = 0; for (let v = 0; v < 3; v++) { const i = t * 3 + v; rs += Math.hypot(wp.getY(i) - wc[1], wp.getZ(i) - wc[2]); } return rs / 3 > P.tyreRadiusRatio * R ? 'tyre' : 'rim'; };
for (const [name, y, side] of [['Wheel_FL', P.wheelY[0], -1], ['Wheel_FR', P.wheelY[0], 1], ['Wheel_RL', P.wheelY[1], -1], ['Wheel_RR', P.wheelY[1], 1]]) {
  const grp = new THREE.Group(); grp.name = name; grp.userData = { part: 'wheels', piece: 'wheel', side, axle: y < 2 ? 'front' : 'rear' };
  // studio position: x = -(y - L/2), y = R*S (axle height), z = side * (outerX - halfWidth)
  const halfW = (wmax[0] - wmin[0]) * S / 2;
  grp.position.set(-(y - P.length / 2), R * S, side * (P.wheelOuterX - halfW));
  // local transform: wheel.stl axis is x; studio needs axis along z (across the car). spoke face must point to +side.
  // proper rotation (det +1): x_s = k*y_stl, y_s = z_stl, z_s = k*x_stl with k = side*faceSign so the spoke face lands at z = side
  const k = side * faceSign;
  const xf = (x, y2, z) => [k * (y2 - wc[1]) * S, (z - wc[2]) * S, k * (x - wc[0]) * S];
  for (const piece of ['rim', 'tyre']) {
    const g = extract(wheelGeo, t => wheelClass(t) === piece, xf);
    const m = new THREE.Mesh(g, M[piece]); m.name = `${name}_${piece === 'rim' ? 'Rim' : 'Tyre'}`; m.userData = { part: 'wheels', piece, side, axle: grp.userData.axle }; grp.add(m);
  }
  vehicle.add(grp);
}
vehicle.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(vehicle), sz = bb.getSize(new THREE.Vector3());
console.error('vehicle size (m)', sz.toArray().map(v => +v.toFixed(3)), 'min y', bb.min.y.toFixed(3));
scene.userData = { car: 'r32', title: 'Volkswagen Golf R32 Mk5 2006', source: 'stunner2211 Thingiverse thing:2973517, CC BY-NC-SA 3.0; segmented and materialised for farissuhail.com', units: 'metres', upAxis: 'Y', forwardAxis: '-X' };
const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
fs.writeFileSync(out, Buffer.from(glb));
console.error('wrote', out, fs.statSync(out).size, 'bytes');

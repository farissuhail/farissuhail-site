// BMW X4 F26 (2016, xDrive20i) · dataset for car-studio.js
// Model supplied by Faris: GTA-mod F26 converted to glTF, corrected to BMW's published F26
// dimensions (4.671 m long, 2.810 m wheelbase), with the source cabin retained and de-duplicated.
// 108 meshes, 620k triangles. Provenance and limits: assets/x4/NOTICES.md and model-provenance.json.
import * as THREE from 'three';
import { bootStudio } from './car-studio.js';

const GROUPS = [
  { id: 'all', name: 'Complete vehicle', subtitle: 'BMW X4 · F26', description: 'Explore the first-generation X4 coupé-SUV.' },
  { id: 'body', name: 'Body & structure', subtitle: 'PANELS, DOORS & TAILGATE', description: 'Explore the bonnet, four doors, the coupé roofline, tailgate and M Sport bumpers.' },
  { id: 'glass', name: 'Glass & mirrors', subtitle: 'GLAZING & REAR-VIEW MIRRORS', description: 'Isolate the windscreen, side glass, rear screen and mirror glass.' },
  { id: 'wheels', name: 'Wheels & brakes', subtitle: '19-INCH WHEELS, TYRES & BRAKES', description: 'Inspect the wheels and tyres with their brake detail behind the spokes.' },
  { id: 'cabin', name: 'Interior', subtitle: 'FIVE SEATS · DRIVER’S COCKPIT', description: 'Explore the dashboard, instruments, steering wheel, front seats and rear bench.' },
  { id: 'trim', name: 'Trim & details', subtitle: 'KIDNEY GRILLE, LAMPS & EXHAUST', description: 'Inspect the chrome kidney grille, headlamp reflectors, tail-lamp optics, badges and the single oval exhaust.' },
];
// Index 0 keeps the model's own paint; the rest are F26-era BMW colours.
const PAINTS = [
  { name: 'Steel blue (as modelled)', body: '#678193', swatch: '#678193', checkColor: '#17232f' },
  { name: 'Alpine White', body: '#eef0f0', checkColor: '#17232f' },
  { name: 'Black Sapphire Metallic', body: '#14181d' },
  { name: 'Glacier Silver Metallic', body: '#b9bdc0', checkColor: '#17232f' },
  { name: 'Carbon Black Metallic', body: '#1c2330' },
  { name: 'Melbourne Red Metallic', body: '#8c1220' },
  { name: 'Long Beach Blue', body: '#2d5f9e' },
];

bootStudio({
  brand: 'BMW', title: 'X4', badge: 'F26', subtitle: '2016 · xDrive20i · 3D Studio', loadingLabel: 'BMW X4 F26',
  modelUrl: 'assets/x4/x4-f26-2016.glb', environmentRoot: 'assets/studio/environments/',
  groups: GROUPS, paints: PAINTS, partMode: 'mesh', alignTyres: 'X4 Textured Tire', glassGroups: ['glass'],
  footnote: 'F26 reference · Visual disassembly',
  credit: 'Model: converted GTA mod (Santa Claus | MTA CAR), see <a href="assets/x4/NOTICES.md" target="_blank" rel="noreferrer">notices</a> · <a href="https://polyhaven.com/hdris" target="_blank" rel="noreferrer">HDRIs: Poly Haven (CC0)</a>',
  camera: { position: [6.1, 3.4, 7.1], target: [0, .82, 0] },
  platformRadius: 3.55,   // 4.671 m long, so a wider turntable than the hatchbacks
  explosionZoom: .0032,   // ease the camera back while the body comes apart
  groupOf(mesh) {
    const group = mesh.userData.component;
    return ['body', 'glass', 'wheels', 'cabin', 'trim'].includes(group) ? group : 'trim';
  },
  partOffset(group, center, mesh) {
    const { x, y, z } = center, role = mesh.userData.wheelRole;
    if (group === 'wheels') return new THREE.Vector3(Math.sign(x) * (role === 'brake' ? 1.2 : 2.15), .12, Math.sign(z) * .18);
    if (group === 'glass') return new THREE.Vector3(x * .4, 1.2, z * .22);
    if (group === 'body') return new THREE.Vector3(x * 1.2, (1.3 + Math.max(0, y - .65) * .9) * .7, z * .8);
    if (group === 'cabin') return new THREE.Vector3(x * .3, .3, z * .18);
    return new THREE.Vector3(x * .99, -.054, z * .72);
  },
  // Only the painted panels change colour; chrome, lamps, glass, wheels and cabin keep their own materials.
  materialRole: (mesh, material) => (material.name === 'X4 Body Paint' ? 'body' : null),
});

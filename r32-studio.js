// Volkswagen Golf Mk5 R32 (2006) · dataset for car-studio.js
// Model supplied by Faris: Racer DOF assembly converted to GLB (83 parts, 258k triangles,
// 4.246 m × 1.985 m × 1.465 m, 2.578 m wheelbase). Three-door reference body.
// Provenance and rights: assets/r32/NOTICES.md.
import * as THREE from 'three';
import { bootStudio } from './car-studio.js';

const GROUPS = [
  { id: 'all', name: 'Complete vehicle', subtitle: 'VOLKSWAGEN GOLF · MK5 R32', description: 'Explore the complete Mk5 R32.' },
  { id: 'body', name: 'Body & structure', subtitle: 'BODY PANELS & HATCH', description: 'Explore the bonnet, doors, hatch and R32 bumpers.' },
  { id: 'glass', name: 'Glass & mirrors', subtitle: 'GLAZING & REAR-VIEW MIRRORS', description: 'Isolate the windscreen, side glass, rear screen and mirror glass.' },
  { id: 'wheels', name: 'Wheels & brakes', subtitle: 'WHEELS, TYRES & BRAKES', description: 'Inspect the wheels and tyres, plus the 345 mm front and 310 mm rear discs with their blue calipers.' },
  { id: 'cabin', name: 'Passenger cabin', subtitle: 'COCKPIT & INTERIOR', description: 'Explore the seats, dashboard, steering wheel and cabin details.' },
  { id: 'trim', name: 'Trim & details', subtitle: 'LAMPS, GRILLE, EXHAUST & DETAILS', description: 'Inspect the lamps, grille, mirrors, exhaust and the remaining trim and structural details.' },
];
// Mk5 R32 colours. Index 0 keeps the model's own Deep Blue Pearl paint.
const PAINTS = [
  { name: 'Deep Blue Pearl (original)', body: '#133dab', swatch: '#133dab' },
  { name: 'Reflex Silver', body: '#bfc4ca', checkColor: '#17232f' },
  { name: 'Black Magic Pearl', body: '#111419' },
  { name: 'United Grey', body: '#555c65' },
  { name: 'Candy White', body: '#f0eee8', checkColor: '#17232f' },
  { name: 'Tornado Red', body: '#ae1723' },
];

bootStudio({
  brand: 'VOLKSWAGEN', title: 'GOLF R32', badge: 'MK5', subtitle: '2006 · 3.2 VR6 · 4MOTION · 3D Studio', loadingLabel: 'Volkswagen Golf R32',
  modelUrl: 'assets/r32/golf-r32-mk5.glb', environmentRoot: 'assets/studio/environments/',
  groups: GROUPS, paints: PAINTS, partMode: 'mesh', alignTyres: 'tire', glassGroups: ['glass'],
  footnote: 'Three-door reference body · Visual disassembly',
  credit: 'Model: Racer conversion, see <a href="assets/r32/NOTICES.md" target="_blank" rel="noreferrer">notices</a> · <a href="https://polyhaven.com/hdris" target="_blank" rel="noreferrer">HDRIs: Poly Haven (CC0)</a>',
  camera: { position: [5.6, 3.2, 6.5], target: [0, .75, 0] },
  groupOf(mesh) {
    const group = mesh.userData.component;
    return ['body', 'glass', 'wheels', 'cabin', 'trim'].includes(group) ? group : 'trim';
  },
  partOffset(group, center, mesh) {
    const { x, y, z } = center, role = mesh.userData.wheelRole;
    if (group === 'wheels') return new THREE.Vector3(Math.sign(x) * (role === 'brake' ? 1.2 : 2.15), .12, Math.sign(z) * .18);
    if (group === 'glass') return new THREE.Vector3(x * .4, 1.15, z * .22);
    if (group === 'body') return new THREE.Vector3(x * 1.2, (1.3 + Math.max(0, y - .65) * .9) * .7, z * .8);
    if (group === 'cabin') return new THREE.Vector3(x * .3, .3, z * .18);
    return new THREE.Vector3(x * .99, -.054, z * .72);
  },
  // Only the painted shell changes colour; the textured rims, tyres and brakes keep their own materials.
  materialRole: (mesh, material) => (material.name === 'R32 Body Paint' ? 'body' : null),
});

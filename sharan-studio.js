// Volkswagen Sharan 7N (2012) · dataset for car-studio.js
// Model supplied by Faris: GTA-mod exterior converted to glTF and corrected toward the 2012 7N,
// plus an original seven-seat reference cabin. 440 meshes, 649k triangles.
// Provenance, adaptations and limits: assets/sharan/NOTICES.md and model-provenance.json.
import * as THREE from 'three';
import { bootStudio } from './car-studio.js';

const GROUPS = [
  { id: 'all', name: 'Complete vehicle', subtitle: 'VOLKSWAGEN SHARAN · 7N', description: 'Explore the seven-seat Sharan 7N.' },
  { id: 'body', name: 'Body & structure', subtitle: 'PANELS, SLIDING DOORS & HATCH', description: 'Explore the bonnet, front doors, sliding rear doors, tailgate and bumpers.' },
  { id: 'glass', name: 'Glass & mirrors', subtitle: 'GLAZING & REAR-VIEW MIRRORS', description: 'Isolate the windscreen, side glass, rear screen and mirror glass.' },
  { id: 'wheels', name: 'Wheels & brakes', subtitle: 'WHEELS, TYRES & BRAKES', description: 'Inspect the wheels and tyres with the brake discs behind them.' },
  { id: 'cabin', name: 'Cabin reference', subtitle: 'SEVEN SEATS · 2–3–2', description: 'Explore the seven-seat cabin: three rows, dashboard, instruments and steering wheel. An original reconstruction from period photographs, not factory geometry.' },
  { id: 'trim', name: 'Trim & details', subtitle: 'LAMPS, CHROME & DETAILS', description: 'Inspect the lamps and their 2012-style rear internals, the chrome grille bars, badges, window trim and roof rails.' },
];
// Index 0 keeps the model's own steel-blue paint; the rest are 7N-era colours.
const PAINTS = [
  { name: 'Steel blue (as modelled)', body: '#618197', swatch: '#618197', checkColor: '#17232f' },
  { name: 'Reflex Silver', body: '#bfc4ca', checkColor: '#17232f' },
  { name: 'Deep Black Pearl', body: '#111419' },
  { name: 'Night Blue Metallic', body: '#1d304a' },
  { name: 'Candy White', body: '#f0eee8', checkColor: '#17232f' },
  { name: 'Salsa Red', body: '#ae1723' },
];

bootStudio({
  brand: 'VOLKSWAGEN', title: 'SHARAN', badge: '7N', subtitle: '2012 · Seven seats · 3D Studio', loadingLabel: 'Volkswagen Sharan 7N',
  modelUrl: 'assets/sharan/sharan-7n.glb', environmentRoot: 'assets/studio/environments/',
  groups: GROUPS, paints: PAINTS, partMode: 'mesh', alignTyres: 'Tire rubber', glassGroups: ['glass'],
  footnote: '7N reference · Visual disassembly',
  credit: 'Model: converted GTA mod (Victor / SQUIR) + original cabin, see <a href="assets/sharan/NOTICES.md" target="_blank" rel="noreferrer">notices</a> · <a href="https://polyhaven.com/hdris" target="_blank" rel="noreferrer">HDRIs: Poly Haven (CC0)</a>',
  camera: { position: [6.3, 3.5, 7.4], target: [0, .85, 0] },
  platformRadius: 3.7,   // the Sharan is 4.854 m long, so it needs a wider turntable than the hatchbacks
  groupOf(mesh) {
    const group = mesh.userData.component;
    return ['body', 'glass', 'wheels', 'cabin', 'trim'].includes(group) ? group : 'trim';
  },
  partOffset(group, center, mesh) {
    const { x, y, z } = center, role = mesh.userData.wheelRole;
    if (group === 'wheels') return new THREE.Vector3(Math.sign(x) * (role === 'brake' ? 1.2 : 2.15), .12, Math.sign(z) * .18);
    if (group === 'glass') return new THREE.Vector3(x * .4, 1.25, z * .22);
    if (group === 'body') return new THREE.Vector3(x * 1.2, (1.3 + Math.max(0, y - .65) * .9) * .7, z * .8);
    if (group === 'cabin') return new THREE.Vector3(x * .3, .3, z * .18);
    return new THREE.Vector3(x * .99, -.054, z * .72);
  },
  // Only the painted panels change colour; chrome, lamps, glass, rims and cabin keep their own materials.
  materialRole: (mesh, material) => (material.name === 'Sharan Body Paint' ? 'body' : null),
});

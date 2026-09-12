// Volkswagen Golf Mk5 R32 (2006) · dataset for car-studio.js
// Model: stunner2211's Golf V R32 print shell (Thingiverse thing:2973517, CC BY-NC-SA 3.0),
// segmented into paint / glass / grille / lamps / wheels and materialised by build-r32.mjs.
import * as THREE from 'three';
import { bootStudio } from './car-studio.js';

const GROUPS = [
  { id: 'all', name: 'Complete vehicle', subtitle: 'VOLKSWAGEN GOLF MK5 · R32 · 2006', description: 'Explore the complete Mk5 R32.' },
  { id: 'body', name: 'Body & lamps', subtitle: 'SHELL, GRILLE, INTAKE & LAMPS', description: 'The painted shell with its R32 grille, lower intake, headlamps and tail lamps.' },
  { id: 'glass', name: 'Glazing', subtitle: 'WINDSCREEN, SIDE GLASS & REAR SCREEN', description: 'The tinted greenhouse as one lifted piece: windscreen, door and quarter glass, and the rear screen.' },
  { id: 'wheels', name: 'Wheels & tyres', subtitle: '18-INCH ZOLDER WHEELS', description: 'Four multi-spoke Zolder wheels with their tyres, pulled out on their axles.' },
  { id: 'trim', name: 'Underbody', subtitle: 'FLOOR, DIFFUSER & ARCH LINERS', description: 'The floor pan, rear diffuser and wheel-arch liners that sit below and inside the shell.' },
];
// Mk5 R32 factory colours. Index 0 keeps the model's own Deep Blue Pearl.
const PAINTS = [
  { name: 'Deep Blue Pearl (original)', body: '#1748b5', wheel: '#aab3b4', swatch: '#1748b5' },
  { name: 'Reflex Silver', body: '#a9aeb3', wheel: '#aab3b4', checkColor: '#17232f' },
  { name: 'Black Magic Pearl', body: '#0b0d10', wheel: '#aab3b4' },
  { name: 'Tornado Red', body: '#b3101c', wheel: '#aab3b4' },
  { name: 'United Grey', body: '#5b6166', wheel: '#aab3b4' },
  { name: 'Candy White', body: '#eeefec', wheel: '#2a2d30', checkColor: '#17232f', wheelMetalness: .55 },
];

bootStudio({
  brand: 'VOLKSWAGEN', title: 'GOLF R32', badge: 'MK5', subtitle: '2006 · 3.2 VR6 · 4MOTION · 3D Studio', loadingLabel: 'Golf Mk5 R32',
  modelUrl: 'assets/r32/golf-r32-mk5-2006-shell.glb', environmentRoot: 'assets/studio/environments/',
  groups: GROUPS, paints: PAINTS, partMode: 'assembly', glassGroups: ['glass'],
  footnote: 'Three-door shell · Segmented print model, not manufacturer CAD',
  credit: '<a href="https://www.thingiverse.com/thing:2973517" target="_blank" rel="noreferrer">Model: stunner2211 (CC BY-NC-SA 3.0)</a> · <a href="https://polyhaven.com/hdris" target="_blank" rel="noreferrer">HDRIs: Poly Haven (CC0)</a>',
  camera: { position: [7.0, 3.4, 7.8], target: [0, .7, 0] },   // nose is at +x
  // parts: the body-class meshes and each Wheel_* group (its rim + tyre move together)
  isPart: object => (object.isMesh && object.userData.part && object.userData.part !== 'wheels') || object.userData.piece === 'wheel',
  groupOf: object => object.userData.part ?? 'trim',
  partOffset(group, center, object) {
    const piece = object.userData.piece;
    if (group === 'wheels') return new THREE.Vector3(0, .08, Math.sign(center.z || object.userData.side || 1) * 1.05);
    if (group === 'glass') return new THREE.Vector3(0, 1.15, 0);
    if (piece === 'lampFront') return new THREE.Vector3(.75, .2, 0);
    if (piece === 'lampRear') return new THREE.Vector3(-.75, .2, 0);
    if (piece === 'grille') return new THREE.Vector3(.9, .1, 0);
    if (piece === 'intake') return new THREE.Vector3(.65, -.05, 0);
    if (group === 'trim') return new THREE.Vector3(0, -.55, 0);
    return new THREE.Vector3(0, .45, 0);   // shell
  },
  materialRole(mesh, material) {
    if (material.name === 'Paint_Body') return 'body';
    if (material.name === 'Rim_Zolder') return 'rim';
    return null;
  },
});

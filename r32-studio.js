// Volkswagen Golf Mk5 R32 (2006) · dataset for car-studio.js
// Model: original procedural study geometry built for farissuhail.com (no third-party mesh).
import * as THREE from 'three';
import { bootStudio } from './car-studio.js';

const GROUPS = [
  { id: 'all', name: 'Complete vehicle', subtitle: 'VOLKSWAGEN GOLF MK5 · R32 · 2006', description: 'Explore the complete five-door Mk5 R32.' },
  { id: 'body', name: 'Body & panels', subtitle: 'SHELL, BONNET, DOORS & TAILGATE', description: 'The painted shell with its bumpers and lights, plus the four doors, the bonnet and the tailgate that hinge off it.' },
  { id: 'roof', name: 'Roof & glazing', subtitle: 'ROOF SKIN, PILLARS & GLASS', description: 'The roof panel, A/B/C pillars, windscreen, side glazing and rear screen as one lifted assembly.' },
  { id: 'wheels', name: 'Wheels & suspension', subtitle: '18-INCH ZOLDER WHEELS & STRUTS', description: 'Four multi-spoke wheels with their tyres and brakes, and the MacPherson front and multi-link rear suspension behind them.' },
  { id: 'cabin', name: 'Passenger cabin', subtitle: 'SEATS, DASHBOARD & CONSOLE', description: 'Front and rear seats, the dashboard, steering wheel and centre console.' },
  { id: 'drivetrain', name: 'Engine & drivetrain', subtitle: 'VR6, DSG, 4MOTION & EXHAUST', description: 'The transverse 3.2 VR6, the 02E DSG gearbox, the Haldex driveline to the rear axle and the twin centre-exit exhaust.' },
  { id: 'chassis', name: 'Floor & chassis', subtitle: 'FLOORPAN & STRUCTURE', description: 'The floorpan, sills and structural rails everything else bolts to.' },
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
const PART_GROUP = {
  body: 'body', bonnet: 'body', tailgate: 'body', doors: 'body',
  roof: 'roof', wheels: 'wheels', suspension: 'wheels', interior: 'cabin',
  engine: 'drivetrain', transmission: 'drivetrain', driveline: 'drivetrain', exhaust: 'drivetrain', floor: 'chassis',
};
// The GLB stores a per-assembly explodeOffset in metres; scale it so the car opens up like the GT3.
const EXPLODE_SCALE = 1.0;

bootStudio({
  brand: 'VOLKSWAGEN', title: 'GOLF R32', badge: 'MK5', subtitle: '2006 · 3.2 VR6 · 4MOTION · 3D Studio', loadingLabel: 'Golf Mk5 R32',
  modelUrl: 'assets/r32/golf-r32-mk5-2006.glb', environmentRoot: 'assets/studio/environments/',
  groups: GROUPS, paints: PAINTS, partMode: 'assembly', glassGroups: ['roof'],
  footnote: 'Illustrative study model · Not manufacturer CAD',
  credit: 'Original study model · <a href="https://polyhaven.com/hdris" target="_blank" rel="noreferrer">HDRIs: Poly Haven (CC0)</a>',
  camera: { position: [-7.2, 3.6, 8.0], target: [0, .7, 0] },
  isPart: object => object.userData.semanticAssembly === true && typeof object.userData.part === 'string',
  groupOf: object => PART_GROUP[object.userData.part] ?? 'chassis',
  partOffset(group, center, object) {
    const [x, y, z] = object.userData.explodeOffset ?? [0, 0, 0];
    const v = new THREE.Vector3(x, y, z).multiplyScalar(EXPLODE_SCALE);
    if (object.userData.part === 'wheels') v.y += .08;
    if (object.userData.part === 'floor') v.y -= .35;
    return v;
  },
  materialRole(mesh, material, group) {
    if (material.name?.startsWith('Paint_')) return 'body';
    if (group === 'wheels' && mesh.userData.part === 'wheels' && material.name === 'Material_002_aab3b4') return 'rim';
    return null;
  },
});

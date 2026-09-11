// Porsche 911 (992) GT3 RS · dataset for car-studio.js
import * as THREE from 'three';
import { bootStudio, splitConnectedGeometry } from './car-studio.js';

const GROUPS = [
  { id: 'all', name: 'Complete vehicle', subtitle: 'PORSCHE 911 · 992 GT3 RS', description: 'Explore the complete 992 GT3 RS.' },
  { id: 'body', name: 'Body & structure', subtitle: 'BODY PANELS & AERODYNAMICS', description: 'Explore the body panels, aerodynamic surfaces and rear wing.' },
  { id: 'glass', name: 'Glass & mirrors', subtitle: 'GLAZING & REAR-VIEW MIRRORS', description: 'Isolate the windows, light lenses and mirror components.' },
  { id: 'wheels', name: 'Wheels & brakes', subtitle: 'WHEELS, TYRES & BRAKES', description: 'Inspect the wheels, tyres and brake components.' },
  { id: 'cabin', name: 'Passenger cabin', subtitle: 'COCKPIT & INTERIOR', description: 'Explore the seats, dashboard, steering wheel and cabin details.' },
  { id: 'trim', name: 'Trim & details', subtitle: 'DETAILS & OTHER STRUCTURES', description: 'Inspect the remaining trim, fasteners and structural details.' },
];
const PAINTS = [
  { name: 'White / red', body: '#f5f5f2', wheel: '#ed001c', decal: '#ed001c', checkColor: '#17232f' },
  { name: 'Blue / white', body: '#168dde', wheel: '#eeeeee', decal: '#eeeeee', wheelMetalness: .25 },
  { name: 'Grey / red', body: '#777e80', wheel: '#c81024', decal: '#c81024' },
  { name: 'Purple / silver / gold', body: '#6337a0', wheel: '#c4c7ce', decal: '#e5b725' },
  { name: 'Yellow / bronze', body: '#f3d32d', wheel: '#9c8469', decal: '#151719', checkColor: '#17232f' },
  { name: 'Green / graphite', body: '#0bb278', wheel: '#42474a', decal: '#303b38' },
];

/** Split the disconnected exterior badge geometry so each badge explodes with its own panel. */
function splitExteriorBadges(root) {
  const candidates = [];
  root.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.length === 1 && materials[0].name === 'Logo' && /\.(206|013|014|015|016)$/.test(object.userData.originalName || object.name)) candidates.push(object);
  });
  for (const mesh of candidates) {
    const parent = mesh.parent; if (!parent) continue;
    splitConnectedGeometry(mesh.geometry).forEach((geometry, i) => {
      const badge = mesh.clone(false); badge.geometry = geometry; badge.name = `${mesh.name}_badge_${i}`;
      badge.userData = { ...mesh.userData, exteriorBadge: true }; parent.add(badge);
    });
    parent.remove(mesh); mesh.geometry.dispose();
  }
  root.updateMatrixWorld(true);
}
/** Badges travel with the nearest body panel when exploded. */
function attachBadges(parts) {
  const body = parts.filter(part => part.group === 'body');
  const triangle = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), closest = new THREE.Vector3();
  for (const badge of parts.filter(part => part.mesh.userData.exteriorBadge)) {
    let nearest, minimum = Infinity;
    for (const panel of body) {
      const geometry = panel.mesh.geometry, position = geometry.getAttribute('position'), indices = geometry.index;
      const box = new THREE.Box3().setFromObject(panel.mesh);
      if (box.distanceToPoint(badge.center) ** 2 >= minimum) continue;
      const count = indices?.count ?? position.count;
      for (let i = 0; i < count; i += 3) {
        a.fromBufferAttribute(position, indices ? indices.getX(i) : i).applyMatrix4(panel.mesh.matrixWorld);
        b.fromBufferAttribute(position, indices ? indices.getX(i + 1) : i + 1).applyMatrix4(panel.mesh.matrixWorld);
        c.fromBufferAttribute(position, indices ? indices.getX(i + 2) : i + 2).applyMatrix4(panel.mesh.matrixWorld);
        triangle.set(a, b, c).closestPointToPoint(badge.center, closest);
        const distance = closest.distanceToSquared(badge.center);
        if (distance < minimum) { minimum = distance; nearest = panel; }
      }
    }
    if (nearest) {
      const bodyParent = nearest.mesh.parent, badgeParent = badge.mesh.parent;
      const delta = bodyParent.localToWorld(nearest.offset.clone()).sub(bodyParent.localToWorld(new THREE.Vector3()));
      badge.offset.copy(badgeParent.worldToLocal(badge.center.clone().add(delta)).sub(badgeParent.worldToLocal(badge.center.clone())));
    }
  }
}

bootStudio({
  brand: 'PORSCHE', title: '911 GT3', badge: 'RS', subtitle: '992 · Interactive 3D Studio', loadingLabel: 'Porsche 911 GT3 RS',
  modelUrl: 'assets/gt3/porsche-gt3-rs.glb', dracoPath: 'assets/gt3/draco/', environmentRoot: 'assets/studio/environments/',
  groups: GROUPS, paints: PAINTS, partMode: 'mesh', alignTyres: 'Tyre', glassGroups: ['glass'],
  credit: '<a href="https://porsche-911-gt3-rs.cgboy.chatgpt.site/" target="_blank" rel="noreferrer">Model reference: CGboy_3D</a> · <a href="https://polyhaven.com/hdris" target="_blank" rel="noreferrer">HDRIs: Poly Haven (CC0)</a>',
  prepare(gltf) {
    gltf.scene.traverse(object => {
      const association = gltf.parser.associations.get(object);
      if (association?.nodes !== undefined) object.userData.originalName = gltf.parser.json.nodes[association.nodes].name;
    });
    splitExteriorBadges(gltf.scene);
  },
  groupOf(mesh) {
    const group = mesh.userData.component;
    return ['body', 'glass', 'wheels', 'cabin', 'trim'].includes(group) ? group : 'trim';
  },
  partOffset(group, center, mesh) {
    const { x, y, z } = center, role = mesh.userData.wheelRole;
    if (group === 'wheels') return new THREE.Vector3(Math.sign(x) * (role === 'rim' ? 2.15 : 1.2), .12, Math.sign(z) * .18);
    if (group === 'glass') return new THREE.Vector3(x * .4, 1.15, z * .22);
    if (group === 'body') return new THREE.Vector3(x * 1.2, (1.3 + Math.max(0, y - .65) * .9) * .7, z * .8);
    if (group === 'cabin') return new THREE.Vector3(x * .3, .3, z * .18);
    return new THREE.Vector3(x * .99, -.054, z * .72);
  },
  materialRole(mesh, material, group) {
    if (material.name === 'Vehicle - Body - Paint') return 'body';
    if (group === 'wheels' && mesh.userData.wheelRole === 'rim' && ['Aluminum', 'Glossy Red'].includes(material.name)) return 'rim';
    if (/\.(201|203|205|216)$/.test(mesh.userData.originalName || mesh.name) && material.name === 'Glossy Red') return 'decal';
    return null;
  },
  afterParts: attachBadges,
});

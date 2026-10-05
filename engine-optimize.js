/* ==========================================================================
   PETROLHEAD TECHNICA — static mesh merging
   --------------------------------------------------------------------------
   An engine builder emits hundreds of small meshes (bolts, ribs, clamps…).
   Drawing each separately is wasteful on a phone, so after a build each
   semantic component's static meshes are baked into its own coordinate frame
   and merged per material. Component identity, transforms and highlighting
   are untouched; only draw calls drop.

   Meshes that other code must find individually — coolant ports, hoses and
   anything flagged userData.keepSeparate — are left alone, so the hose-to-port
   contact check still works on the real geometry.
   ========================================================================== */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SEPARATE_KEYS = ['sweep', 'coolingJoint', 'coolingPortId', 'coolingConnectionId', 'keepSeparate', 'portId'];

function owner(o) { while (o && !o.userData.componentId) o = o.parent; return o; }

function normalise(g, wantUv) {
  const out = g.index ? g : g;
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  if (wantUv && !out.getAttribute('uv')) {
    out.setAttribute('uv', new T.BufferAttribute(new Float32Array(out.getAttribute('position').count * 2), 2));
  }
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') out.deleteAttribute(k);
  return out;
}

/** Merge every component of a built engine in place. Returns before/after counts. */
export function mergeComponents(built) {
  built.group.updateMatrixWorld(true);
  const stats = { meshesBefore: 0, meshesAfter: 0 };
  built.group.traverse(o => { if (o.isMesh) stats.meshesBefore++; });

  for (const [, obj] of built.parts) {
    const inv = new T.Matrix4().copy(obj.matrixWorld).invert();
    const buckets = new Map();             // material → [{ geo, mesh }]
    const victims = [];
    obj.traverse(m => {
      if (!m.isMesh || owner(m) !== obj) return;
      if (SEPARATE_KEYS.some(k => m.userData[k] !== undefined)) return;
      if (Array.isArray(m.material)) return;               // multi-material meshes stay as built
      const g = m.geometry.clone();
      g.applyMatrix4(inv.clone().multiply(m.matrixWorld));
      normalise(g, true);
      if (!buckets.has(m.material)) buckets.set(m.material, []);
      buckets.get(m.material).push(g);
      victims.push(m);
    });
    for (const m of victims) m.parent.remove(m);
    for (const [material, list] of buckets) {
      const anyIndexed = list.some(g => g.index), allIndexed = list.every(g => g.index);
      const prepared = anyIndexed && !allIndexed ? list.map(g => (g.index ? g.toNonIndexed() : g)) : list;
      const merged = mergeGeometries(prepared, false);
      list.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new T.Mesh(merged, material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = `${obj.name}:${material.name || 'merged'}`;
      obj.add(mesh);
    }
  }
  built.group.traverse(o => { if (o.isMesh) stats.meshesAfter++; });
  return stats;
}

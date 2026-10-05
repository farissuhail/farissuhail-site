/* ==========================================================================
   PETROLHEAD TECHNICA — engine geometry loader
   --------------------------------------------------------------------------
   One module per engine architecture, loaded on demand so a visitor only
   downloads the engine they open:
     engine-vr6.js      3.2 VR6   (Golf Mk5 R32)
     engine-inline4.js  EA888 / N20 inline-fours (Sharan, BMW X4)
     engine-flat6.js    4.0 flat-six (911 GT3 RS)
   Each builder returns { group, parts:Map(id → Object3D), network? }, with
   the group already scaled to metres. The shared kit lives in engine-kit.js.
   ========================================================================== */
import { makeMaterials } from './engine-kit.js';
import { mergeComponents } from './engine-optimize.js';

const LAYOUTS = {
  vr6:           { module: './engine-vr6.js',     build: 'buildVR6' },
  'inline4-ea888': { module: './engine-inline4.js', build: 'buildInline4', arg: 'ea888' },
  'inline4-n20': { module: './engine-inline4.js', build: 'buildInline4', arg: 'n20' },
  flat6:         { module: './engine-flat6.js',   build: 'buildFlat6' },
};

/** Load and build an engine. `onStage(fraction)` reports genuine progress. */
export async function loadEngine(layout, onStage = () => {}) {
  const spec = LAYOUTS[layout];
  if (!spec) throw new Error(`Unknown engine layout "${layout}"`);
  onStage(0.05);
  const mod = await import(spec.module);
  onStage(0.4);
  const { mat, textures } = makeMaterials(layout);
  onStage(0.55);
  // yield so the progress bar can paint before the synchronous build
  // (raced with a timer: rAF never fires in a background tab, and the build must not wait for it)
  await new Promise(r => { requestAnimationFrame(() => r()); setTimeout(r, 80); });
  const built = mod[spec.build](mat, spec.arg);
  built.disposables = { mat, textures };
  // fewer draw calls on phones: merge static meshes per component + material
  built.mergeStats = new URLSearchParams(location.search).get('merge') === '0' ? null : mergeComponents(built);
  onStage(1);
  return built;
}

/** Free every geometry, material and texture owned by a built engine. */
export function disposeBuilt(built) {
  if (!built) return;
  built.group.traverse(o => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose?.());
  });
  built.kit?.disposeGeometry?.();
  const d = built.disposables;
  if (d) {
    Object.values(d.mat).forEach(m => m.dispose?.());
    d.textures.forEach(t => t.dispose?.());
  }
}

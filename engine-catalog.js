/* ==========================================================================
   PETROLHEAD TECHNICA — engine explorer catalogue
   --------------------------------------------------------------------------
   One manifest per car. Rendering lives in engine-viewer.js and geometry in
   engine-vr6.js / engine-inline4.js / engine-flat6.js (via engine-geometry.js);
   everything car-specific lives here: asset provenance, verified facts,
   stable component ids and numbers, authored separation paths, camera
   presets, bilingual copy, sources and capabilities.

   Rules this file follows
   · Only specifications the cited source supports appear in `facts`. Where a
     figure is not confirmed for our car it is simply absent.
   · A component's NUMBER is its position in `components` (1-based). It is a
     viewer identifier that keeps the selector, callouts and guides in step —
     not an OEM part number.
   · `offset` is metres in the engine's own axes (y up) and is a displacement
     RELATIVE TO THE PARENT when `parent` is set (so the R32's sealing cover
     lifts inside the head assembly). `window` is the slice of the single 0–1
     explosion state during which the component travels.
   · `status` records the evidence behind the geometry: 'photo' follows the
     supplied photographs, 'verified' follows engine documentation,
     'illustrative' is an anatomy-study arrangement.
   · The component count is the number of semantic inspectable components —
     not triangles, meshes or engineering part totals.
   ========================================================================== */

/** Shared category labels. */
export const CATEGORIES = {
  structure:  { en: 'Engine structure',  bm: 'Struktur enjin' },
  trim:       { en: 'Trim and covers',   bm: 'Hiasan dan penutup' },
  valve:      { en: 'Valvetrain',        bm: 'Rangkaian injap' },
  rotating:   { en: 'Rotating assembly', bm: 'Pemasangan berputar' },
  lubrication:{ en: 'Lubrication',       bm: 'Pelinciran' },
  air:        { en: 'Air path',          bm: 'Laluan udara' },
  cooling:    { en: 'Cooling',           bm: 'Penyejukan' },
  ancillary:  { en: 'Ancillaries',       bm: 'Kelengkapan sokongan' },
  electrical: { en: 'Electrical',        bm: 'Elektrik' },
};

export const STATUS = {
  photo:        { en: 'Shape follows supplied photographs', bm: 'Bentuk mengikut foto yang dibekalkan' },
  verified:     { en: 'Arrangement follows engine documentation', bm: 'Susunan mengikut dokumentasi enjin' },
  illustrative: { en: 'Illustrative anatomy-study geometry', bm: 'Geometri kajian anatomi (ilustrasi)' },
};

const NOTE_GEOMETRY = {
  en: 'The 3D model is authored for this site. It is not manufacturer CAD and not a scan.',
  bm: 'Model 3D ini dibina khas untuk laman ini. Ia bukan CAD pengilang dan bukan imbasan.',
};

/* ───────────────────────── per-car manifests ───────────────────────── */

import r32 from './engine-manifest-r32.js';
import bmw from './engine-manifest-bmw.js';
import sharan from './engine-manifest-sharan.js';
import gt3 from './engine-manifest-gt3.js';
// Further manifests are registered here, one file per car.
export const CARS = { r32, bmw, sharan, gt3 };

export const CAR_ORDER = ['r32', 'bmw', 'sharan', 'gt3'];

/** Semantic component count — not triangles, meshes or engineering part totals. */
export function componentCount(car) { return CARS[car].components.length; }

export { NOTE_GEOMETRY };

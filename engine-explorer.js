/* ==========================================================================
   PETROLHEAD TECHNICA — engine explorer controller
   Wires the catalogue and the viewer to the page: selection, explosion,
   step-by-step, component copy, cinematic mode and the EN/BM toggle.
   ========================================================================== */
import { CARS, CAR_ORDER, CATEGORIES, STEP_ORDER, componentCount } from './engine-catalog.js';
import { createEngineViewer } from './engine-viewer.js';

const $ = s => document.querySelector(s);
const html = document.documentElement;

/* ── language ─────────────────────────────────────────────── */
function lang() { return html.getAttribute('data-lang') === 'bm' ? 'bm' : 'en'; }
function applyLang(l) {
  html.setAttribute('data-lang', l);
  html.lang = l === 'bm' ? 'ms' : 'en';
  document.querySelectorAll('[data-en][data-bm]').forEach(el => {
    el.innerHTML = l === 'bm' ? el.dataset.bm : el.dataset.en;
  });
  const lb = $('#langToggle');
  lb.querySelector('.lang-en').classList.toggle('on', l === 'en');
  lb.querySelector('.lang-bm').classList.toggle('on', l === 'bm');
  try { localStorage.setItem('fs-lang', l); } catch (e) {}
  renderAll();
}

/* ── state ────────────────────────────────────────────────── */
const PRESETS = [0, 45, 100];
let car = null;
let viewer = null;
let mode = 'explode';        // 'explode' | 'steps'
let stepIndex = 0;
let steps = [];
let labelLayer = null, labelRaf = 0;

const T = {
  does:    { en: 'What it does',     bm: 'Apa fungsinya' },
  connects:{ en: 'Where it connects', bm: 'Di mana ia bersambung' },
  parts:   { en: 'Included parts',   bm: 'Bahagian termasuk' },
  none:    { en: 'Pick a component, or click a part on the model.',
             bm: 'Pilih komponen, atau klik bahagian pada model.' },
  stepHelp:{ en: 'Walk the assembly one layer at a time and read what each one does.',
             bm: 'Telusuri pemasangan satu lapisan pada satu masa dan baca fungsi setiapnya.' },
  of:      { en: 'of', bm: 'drpd' },
  webgl:   { en: 'This browser cannot display WebGL, so the engine explorer cannot start.',
             bm: 'Pelayar ini tidak boleh memaparkan WebGL, jadi penjelajah enjin tidak boleh bermula.' },
  webglSub:{ en: 'Try a current desktop or mobile browser with hardware acceleration enabled.',
             bm: 'Cuba pelayar desktop atau mudah alih terkini dengan pecutan perkakasan dihidupkan.' },
  lost:    { en: 'The 3D context was lost.', bm: 'Konteks 3D terputus.' },
  lostSub: { en: 'This usually means the graphics driver restarted.',
             bm: 'Ini biasanya bermakna pemacu grafik dimulakan semula.' },
  pause:   { en: 'Pause', bm: 'Jeda' },
  play:    { en: 'Play', bm: 'Main' },
  exploded:{ en: 'exploded', bm: 'terurai' },
};
const t = k => T[k][lang()];

/* ── identity ─────────────────────────────────────────────── */
function renderIdentity() {
  const l = lang();
  $('#idCode').textContent = `${car.brand} · ${car.yearLabel}`;
  $('#idTitle').textContent = car.code;
  $('#idTagline').textContent = car.tagline[l];
  $('#idFacts').innerHTML = car.facts
    .map(f => `<div><b>${f.value}</b><span>${f.unit[l]}</span></div>`).join('');
  $('#carNote').innerHTML = `${car.note[l]} <span style="opacity:.75">·
    ${componentCount(car.id)} ${l === 'bm' ? 'komponen boleh diperiksa' : 'inspectable components'}.</span>`;
  const links = [
    car.fourStroke && { href: car.fourStroke, en: 'Four-stroke lab', bm: 'Makmal empat lejang' },
    car.gearbox && { href: car.gearbox, en: 'Gearbox lab', bm: 'Makmal kotak gear' },
    { href: car.studio, en: 'Whole-car studio', bm: 'Studio kereta penuh' },
  ].filter(Boolean);
  $('#carLinks').innerHTML =
    links.map(x => `<a class="ex-btn" href="${x.href}">${x[l]} <span aria-hidden="true">↗</span></a>`).join('') +
    car.sources.map(s => `<a class="ex-btn" href="${s.href}" target="_blank" rel="noreferrer">${s.text} <span aria-hidden="true">↗</span></a>`).join('');
  document.title = `${car.code} · ${car.model[l]} · Engine Explorer`;
}

/* ── component panel ──────────────────────────────────────── */
function renderPartPicker() {
  const l = lang();
  $('#partPick').innerHTML = car.components
    .map((c, i) => `<option value="${c.id}">${String(i + 1).padStart(2, '0')} · ${c[l].name}</option>`).join('');
}

function renderFocus(id) {
  const l = lang(), panel = $('#focusPanel');
  if (!id) { panel.innerHTML = `<p class="ex-summary">${t('none')}</p>`; return; }
  const i = car.components.findIndex(c => c.id === id);
  const c = car.components[i];
  if (!c) { panel.innerHTML = `<p class="ex-summary">${t('none')}</p>`; return; }
  const copy = c[l], total = car.components.length;
  panel.innerHTML = `
    <div class="ex-focus-head">
      <span class="ex-index">${String(i + 1).padStart(2, '0')} / ${total}</span>
      <span class="ex-chip">${CATEGORIES[c.cat][l]}</span>
    </div>
    <h3>${copy.name}</h3>
    <p class="ex-summary">${copy.summary}</p>
    <div class="ex-sec"><h4>${t('does')}</h4><p>${copy.does}</p></div>
    <div class="ex-sec"><h4>${t('connects')}</h4><p>${copy.connects}</p></div>
    <details class="ex-parts ex-sec">
      <summary>${t('parts')}: ${copy.parts.length}</summary>
      <ul>${copy.parts.map(p => `<li>${p}</li>`).join('')}</ul>
    </details>`;
  $('#partPick').value = id;
}

/* ── explosion ────────────────────────────────────────────── */
function setPct(p) {
  const v = Math.round(p * 100);
  $('#pctOut').innerHTML = `${v}<small>%</small>`;
  $('#cinePct').textContent = `${v}% ${t('exploded')}`;
  const r = $('#explodeRange');
  if (Number(r.value) !== v) r.value = v;
  r.style.setProperty('--p', `${v}%`);
  document.querySelectorAll('[data-preset]').forEach(b =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.preset) === v)));
}

/* ── step by step ─────────────────────────────────────────── */
function buildSteps() {
  const ids = new Set(car.components.map(c => c.id));
  steps = STEP_ORDER.filter(id => ids.has(id));
  stepIndex = 0;
  $('#stepTrack').innerHTML = steps.map(() => '<i></i>').join('');
}

function showStep(i) {
  stepIndex = Math.max(0, Math.min(steps.length - 1, i));
  const id = steps[stepIndex];
  // Each step opens the assembly a little further, so the lesson reads as a
  // progressive teardown rather than jumping between unrelated poses.
  const p = steps.length <= 1 ? 1 : (stepIndex / (steps.length - 1)) * 0.92 + 0.08;
  viewer.animateTo(p, 620);
  viewer.setSelected(id, { focus: true });
  renderFocus(id);
  $('#stepCount').textContent = `${stepIndex + 1} ${t('of')} ${steps.length}`;
  $('#stepTrack').querySelectorAll('i').forEach((el, n) => el.classList.toggle('on', n <= stepIndex));
  $('#stepPrev').disabled = stepIndex === 0;
  $('#stepNext').disabled = stepIndex === steps.length - 1;
}

function setMode(next) {
  mode = next;
  const onSteps = mode === 'steps';
  $('#tabExplode').setAttribute('aria-selected', String(!onSteps));
  $('#tabSteps').setAttribute('aria-selected', String(onSteps));
  $('#paneExplode').hidden = onSteps;
  $('#paneSteps').classList.toggle('on', onSteps);
  if (onSteps) { $('#stepHelp').textContent = t('stepHelp'); showStep(0); }
}

/* ── labels ───────────────────────────────────────────────── */
function ensureLabelLayer() {
  if (labelLayer) return labelLayer;
  labelLayer = document.createElement('div');
  Object.assign(labelLayer.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '2', overflow: 'hidden',
  });
  $('#stage').appendChild(labelLayer);
  return labelLayer;
}
function tickLabels() {
  if (!viewer?.labels) { labelLayer && (labelLayer.innerHTML = ''); labelRaf = 0; return; }
  const l = lang();
  const pts = viewer.componentScreenPositions();
  const layer = ensureLabelLayer();
  if (layer.childElementCount !== pts.length) {
    layer.innerHTML = pts.map(() =>
      '<span style="position:absolute;transform:translate(-50%,-50%);font:500 10px/1.2 Inter,sans-serif;' +
      'background:#ffffffe8;border:1px solid #d2d7dd;border-radius:5px;padding:3px 6px;white-space:nowrap;' +
      'color:#111316"></span>').join('');
  }
  const kids = layer.children;
  pts.forEach((p, i) => {
    const el = kids[i];
    if (!el) return;
    const c = car.components.find(x => x.id === p.id);
    el.textContent = c ? c[l].name : p.id;
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.style.display = p.visible ? 'block' : 'none';
  });
  labelRaf = requestAnimationFrame(tickLabels);
}

/* ── cinematic ────────────────────────────────────────────── */
function enterCine() {
  const canvas = $('#stage').querySelector('canvas');
  if (!canvas) return;
  $('#cineStage').appendChild(canvas);
  $('#cine').classList.add('on');
  $('#cine').setAttribute('aria-hidden', 'false');
  document.body.classList.add('cine-on');
  $('#cineCar').textContent = `${car.brand === 'PORSCHE' ? '' : ''}${car.model[lang()]} · ${car.code}`;
  viewer.enterCinematic();
  $('#cineExit').focus();
}
function exitCine() {
  if (!$('#cine').classList.contains('on')) return;
  viewer.exitCinematic();
  $('#stage').appendChild($('#cineStage').querySelector('canvas'));
  $('#cine').classList.remove('on');
  $('#cine').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cine-on');
  $('#cineBtn').focus();
}
function cinePauseIcon() {
  const paused = viewer.cinePaused;
  $('#cinePause').innerHTML = paused
    ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  $('#cinePause').setAttribute('aria-label', paused ? t('play') : t('pause'));
}

/* ── errors ───────────────────────────────────────────────── */
function showError(kind) {
  const box = $('#errorBox');
  if (!kind) { box.hidden = true; return; }
  $('#errMsg').textContent = kind === 'webgl' ? t('webgl') : t('lost');
  $('#errSub').textContent = kind === 'webgl' ? t('webglSub') : t('lostSub');
  $('#loading').hidden = true;
  box.hidden = false;
}

/* ── load a car ───────────────────────────────────────────── */
async function loadCar(id, pushUrl = true) {
  car = CARS[id] || CARS[CAR_ORDER[0]];
  $('#carPick').value = car.id;
  if (pushUrl) {
    const u = new URL(location.href);
    u.searchParams.set('car', car.id);
    history.replaceState({}, '', u);
  }
  renderIdentity();
  renderPartPicker();
  renderFocus(null);
  buildSteps();
  $('#loading').hidden = false;
  const ok = await viewer.setCar(car);
  if (!ok) return;                       // a newer selection superseded this one
  $('#loading').hidden = true;
  setPct(viewer.progress);
  if (mode === 'steps') showStep(0);
}

function renderAll() {
  if (!car) return;
  renderIdentity();
  renderPartPicker();
  renderFocus(viewer?.selected ?? null);
  setPct(viewer?.progress ?? 0);
  if (mode === 'steps') {
    $('#stepHelp').textContent = t('stepHelp');
    $('#stepCount').textContent = `${stepIndex + 1} ${t('of')} ${steps.length}`;
  }
  if ($('#cine').classList.contains('on')) {
    $('#cineCar').textContent = `${car.model[lang()]} · ${car.code}`;
    cinePauseIcon();
  }
}

/* ── boot ─────────────────────────────────────────────────── */
(function boot() {
  $('#year').textContent = new Date().getFullYear();

  // language first so the first paint is already correct
  let stored = null;
  try { stored = localStorage.getItem('fs-lang'); } catch (e) {}
  html.setAttribute('data-lang', stored === 'bm' ? 'bm' : 'en');

  const BRAND_LABEL = { VOLKSWAGEN: 'Volkswagen', BMW: 'BMW', PORSCHE: 'Porsche' };
  $('#carPick').innerHTML = CAR_ORDER.map(id => {
    const c = CARS[id];
    return `<option value="${id}">${BRAND_LABEL[c.brand] ?? c.brand} ${c.model.en} · ${c.code}</option>`;
  }).join('');

  viewer = createEngineViewer($('#stage'), {
    onProgress: setPct,
    onSelect: id => { renderFocus(id); if (id) $('#partPick').value = id; },
    onError: showError,
    onCinematicTime: t2 => { const s = $('#cineScrub'); if (document.activeElement !== s) s.value = Math.round(t2 * 1000); },
    canvasLabel: c => `Interactive 3D model of the ${c.model.en} ${c.code} engine. Drag to rotate, scroll to zoom, click a part to inspect it.`,
  });

  if (!viewer) { showError('webgl'); return; }
  // mirrors the whole-car studio, which exposes window.gt3Studio for debugging
  window.engineExplorer = viewer;

  const params = new URLSearchParams(location.search);
  const want = params.get('car');
  loadCar(CARS[want] ? want : CAR_ORDER[0], false);

  // language toggle
  $('#langToggle').addEventListener('click', () => applyLang(lang() === 'en' ? 'bm' : 'en'));
  applyLang(lang());

  // model + component selectors
  $('#carPick').addEventListener('change', e => loadCar(e.target.value));
  $('#partPick').addEventListener('change', e => viewer.setSelected(e.target.value, { focus: true }));

  // explosion
  $('#explodeRange').addEventListener('input', e => viewer.scrubTo(Number(e.target.value) / 100));
  document.querySelectorAll('[data-preset]').forEach(b =>
    b.addEventListener('click', () => viewer.animateTo(Number(b.dataset.preset) / 100)));

  // modes
  $('#tabExplode').addEventListener('click', () => setMode('explode'));
  $('#tabSteps').addEventListener('click', () => setMode('steps'));
  $('#stepPrev').addEventListener('click', () => showStep(stepIndex - 1));
  $('#stepNext').addEventListener('click', () => showStep(stepIndex + 1));

  // tools
  $('#focusBtn').addEventListener('click', () => viewer.resetView());
  $('#focusTool').addEventListener('click', () =>
    viewer.selected ? viewer.focusComponent(viewer.selected) : viewer.resetView());
  $('#resetTool').addEventListener('click', () => { viewer.setSelected(null); viewer.resetView(); });
  $('#labelTool').addEventListener('click', e => {
    const on = !viewer.labels;
    viewer.setLabels(on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
    if (on && !labelRaf) labelRaf = requestAnimationFrame(tickLabels);
  });
  $('#rotateTool').addEventListener('click', e => {
    const on = !viewer.autoRotate;
    viewer.setAutoRotate(on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
  });
  $('#fullTool').addEventListener('click', () => {
    const el = $('#stage');
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  });
  $('#retryBtn').addEventListener('click', () => { showError(null); loadCar(car.id, false); });

  // cinematic
  $('#cineBtn').addEventListener('click', () => { enterCine(); cinePauseIcon(); });
  $('#cineExit').addEventListener('click', exitCine);
  $('#cinePause').addEventListener('click', () => { viewer.toggleCinePause(); cinePauseIcon(); });
  $('#cineScrub').addEventListener('input', e => viewer.setCineTime(Number(e.target.value) / 1000));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#cine').classList.contains('on')) { e.preventDefault(); exitCine(); }
  });
})();

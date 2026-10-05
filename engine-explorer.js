/* ==========================================================================
   PETROLHEAD TECHNICA — engine explorer controller
   Wires the catalogue and the viewer to the page: selection, explosion,
   step-by-step, numbered callouts, component copy, cinematic mode and the
   EN/BM toggle.
   ========================================================================== */
import { CARS, CAR_ORDER, CATEGORIES, STATUS, NOTE_GEOMETRY, componentCount } from './engine-catalog.js';
import { createEngineViewer } from './engine-viewer.js';

const $ = s => document.querySelector(s);
const html = document.documentElement;
const SVGNS = 'http://www.w3.org/2000/svg';

/* ── language ─────────────────────────────────────────────── */
function lang() { return html.getAttribute('data-lang') === 'bm' ? 'bm' : 'en'; }
function applyLang(l) {
  html.setAttribute('data-lang', l);
  html.lang = l === 'bm' ? 'ms' : 'en';
  document.querySelectorAll('[data-en][data-bm]').forEach(el => {
    el.innerHTML = l === 'bm' ? el.dataset.bm : el.dataset.en;
  });
  document.querySelectorAll('[data-en-label][data-bm-label]').forEach(el => {
    el.setAttribute('aria-label', l === 'bm' ? el.dataset.bmLabel : el.dataset.enLabel);
    if (el.hasAttribute('title')) el.setAttribute('title', el.getAttribute('aria-label'));
  });
  const lb = $('#langToggle');
  lb.querySelector('.lang-en').classList.toggle('on', l === 'en');
  lb.querySelector('.lang-bm').classList.toggle('on', l === 'bm');
  try { localStorage.setItem('fs-lang', l); } catch (e) {}
  renderAll();
}

/* ── state ────────────────────────────────────────────────── */
let car = null;
let viewer = null;
let mode = 'explode';        // 'explode' | 'steps'
let stepIndex = 0;
let steps = [];              // [[id, progress], …]
let overlay = null, overlayRaf = 0;
let cineReturnFocus = null;

const T = {
  does:    { en: 'What it does',      bm: 'Apa fungsinya' },
  connects:{ en: 'Where it connects', bm: 'Di mana ia bersambung' },
  parts:   { en: 'Included parts',    bm: 'Bahagian termasuk' },
  none:    { en: 'Pick a component, or click a part on the model.',
             bm: 'Pilih komponen, atau klik bahagian pada model.' },
  stepHelp:{ en: 'Walk the assembly one layer at a time and read what each part does. This is an anatomy study, not a workshop removal procedure.',
             bm: 'Telusuri pemasangan satu lapisan pada satu masa dan baca fungsi setiap bahagian. Ini kajian anatomi, bukan prosedur penanggalan bengkel.' },
  of:      { en: 'of', bm: 'drpd' },
  webgl:   { en: 'This browser cannot display WebGL, so the engine explorer cannot start.',
             bm: 'Pelayar ini tidak boleh memaparkan WebGL, jadi penjelajah enjin tidak boleh bermula.' },
  webglSub:{ en: 'Try a current desktop or mobile browser with hardware acceleration enabled, or open the whole-car studio and four-stroke lab instead.',
             bm: 'Cuba pelayar desktop atau mudah alih terkini dengan pecutan perkakasan dihidupkan, atau buka studio kereta penuh dan makmal empat lejang.' },
  loadFail:{ en: 'The engine could not be loaded.', bm: 'Enjin tidak dapat dimuatkan.' },
  loadFailSub:{ en: 'Check your connection and try again.', bm: 'Semak sambungan anda dan cuba lagi.' },
  lost:    { en: 'The 3D context was lost.', bm: 'Konteks 3D terputus.' },
  lostSub: { en: 'This usually means the graphics driver restarted.',
             bm: 'Ini biasanya bermakna pemacu grafik dimulakan semula.' },
  pause:   { en: 'Pause', bm: 'Jeda' },
  play:    { en: 'Play', bm: 'Main' },
  exploded:{ en: 'exploded', bm: 'terurai' },
  inspectable:{ en: 'inspectable components', bm: 'komponen boleh diperiksa' },
  guideNote:{ en: 'Dashed lines show assembly separation paths — not coolant flow and not a service procedure.',
              bm: 'Garisan putus-putus menunjukkan laluan pemisahan pemasangan — bukan aliran penyejuk dan bukan prosedur servis.' },
  numberNote:{ en: 'Numbers are viewer identifiers that match the selector — not OEM part numbers.',
               bm: 'Nombor ialah pengenal paparan yang sepadan dengan pemilih — bukan nombor bahagian OEM.' },
  fidelity:{ en: 'Visual fidelity: incomplete', bm: 'Kesetiaan visual: belum lengkap' },
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
  $('#carNote').innerHTML = `${car.note[l]} <span class="ex-count">·
    ${componentCount(car.id)} ${t('inspectable')}.</span>
    <span class="ex-prov">${NOTE_GEOMETRY[l]}${car.asset.fidelity === 'incomplete' ? ` <b>${t('fidelity')}.</b> ${car.asset.fidelityNote}` : ''}</span>`;
  const links = [
    car.fourStroke && { href: car.fourStroke, en: 'Four-stroke lab', bm: 'Makmal empat lejang' },
    car.gearbox && { href: car.gearbox, en: 'Gearbox lab', bm: 'Makmal kotak gear' },
    { href: car.studio, en: 'Whole-car studio', bm: 'Studio kereta penuh' },
  ].filter(Boolean);
  $('#carLinks').innerHTML =
    links.map(x => `<a class="ex-btn" href="${x.href}">${x[l]} <span aria-hidden="true">↗</span></a>`).join('') +
    car.sources.map(s => `<a class="ex-btn" href="${s.href}" target="_blank" rel="noreferrer noopener">${s.text} <span aria-hidden="true">↗</span></a>`).join('');
  document.title = `${car.code} · ${car.model[l]} · Engine Explorer`;
}

/* ── component panel ──────────────────────────────────────── */
const pad = n => String(n).padStart(2, '0');
function renderPartPicker() {
  const l = lang();
  $('#partPick').innerHTML = car.components
    .map((c, i) => `<option value="${c.id}">${pad(i + 1)} · ${c[l].name}</option>`).join('');
  if (viewer?.selected) $('#partPick').value = viewer.selected;
}

function renderFocus(id) {
  const l = lang(), panel = $('#focusPanel');
  const i = id ? car.components.findIndex(c => c.id === id) : -1;
  if (i < 0) { panel.innerHTML = `<p class="ex-summary">${t('none')}</p>`; return; }
  const c = car.components[i], copy = c[l], total = car.components.length;
  const parent = c.parent && car.components.find(x => x.id === c.parent);
  panel.innerHTML = `
    <div class="ex-focus-head">
      <span class="ex-index">${pad(i + 1)} / ${pad(total)}</span>
      <span class="ex-chip">${CATEGORIES[c.cat][l]}</span>
    </div>
    <h3>${copy.name}</h3>
    <p class="ex-summary">${copy.summary}</p>
    <div class="ex-sec"><h4>${t('does')}</h4><p>${copy.does}</p></div>
    <div class="ex-sec"><h4>${t('connects')}</h4><p>${copy.connects}${parent ? ` <em>(${l === 'bm' ? 'Bahagian dalam' : 'Part of'} ${pad(car.components.indexOf(parent) + 1)} · ${parent[l].name})</em>` : ''}</p></div>
    <details class="ex-parts ex-sec">
      <summary>${t('parts')}: ${copy.parts.length}</summary>
      <ul>${copy.parts.map(p => `<li>${p}</li>`).join('')}</ul>
    </details>
    <p class="ex-evidence"><span class="ex-dot ex-dot-${c.status}" aria-hidden="true"></span>${STATUS[c.status][l]}.${copy.note ? ` ${copy.note}` : ''}</p>`;
  $('#partPick').value = c.id;
}

/* ── explosion ────────────────────────────────────────────── */
function setPct(p) {
  const v = Math.round(p * 100);
  $('#pctOut').innerHTML = `${v}<small>%</small>`;
  $('#cinePct').textContent = `${v}% ${t('exploded')}`;
  const r = $('#explodeRange');
  if (Number(r.value) !== v) r.value = v;
  r.style.setProperty('--p', `${v}%`);
  r.setAttribute('aria-valuetext', `${v}%`);
  document.querySelectorAll('[data-preset]').forEach(b =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.preset) === v)));
}

/* ── step by step ─────────────────────────────────────────── */
function buildSteps() {
  const ids = new Set(car.components.map(c => c.id));
  steps = (car.steps || []).filter(([id]) => ids.has(id));
  stepIndex = 0;
  $('#stepTrack').innerHTML = steps.map(() => '<i></i>').join('');
}

function showStep(i) {
  stepIndex = Math.max(0, Math.min(steps.length - 1, i));
  const [id, p] = steps[stepIndex];
  viewer.animateTo(p, 720);
  viewer.setSelected(id);                    // highlight; framing stays on the whole assembly
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
  $('#tabExplode').tabIndex = onSteps ? -1 : 0;
  $('#tabSteps').tabIndex = onSteps ? 0 : -1;
  $('#paneExplode').hidden = onSteps;
  $('#paneSteps').classList.toggle('on', onSteps);
  if (onSteps) { $('#stepHelp').textContent = t('stepHelp'); showStep(stepIndex); }
}

/* ── numbered callouts + separation guides ────────────────── */
function ensureOverlay() {
  if (overlay) return overlay;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'ex-callouts');
  svg.setAttribute('aria-hidden', 'false');
  $('#stage').appendChild(svg);
  overlay = svg;
  return svg;
}

const R = 11;                       // callout radius in px
function layoutMarkers(items, w, h) {
  // gentle relaxation so numbers never sit on top of each other
  const pts = items.map(it => ({ it, x: it.x, y: it.y }));
  for (let iter = 0; iter < 14; iter++) {
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[b].x - pts[a].x, dy = pts[b].y - pts[a].y;
      const d = Math.hypot(dx, dy) || 0.01, min = R * 2.15;
      if (d < min) {
        const push = (min - d) / 2, ux = dx / d, uy = dy / d;
        pts[a].x -= ux * push; pts[a].y -= uy * push;
        pts[b].x += ux * push; pts[b].y += uy * push;
      }
    }
    for (const p of pts) { p.x = Math.min(w - R - 2, Math.max(R + 2, p.x)); p.y = Math.min(h - R - 2, Math.max(R + 2, p.y)); }
  }
  return pts;
}

function tickOverlay() {
  overlayRaf = 0;
  const svg = overlay;
  if (!svg || !viewer?.labels || !car) { if (svg) svg.replaceChildren(); return; }
  const w = $('#stage').clientWidth, h = $('#stage').clientHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const data = viewer.callouts();
  const sel = viewer.selected;
  const shown = data.filter(d => d.visible || (d.id === sel && d.inView));
  const placed = layoutMarkers(shown, w, h);
  const guides = viewer.progress > 0.015;
  const l = lang();
  const frag = document.createDocumentFragment();

  if (guides) {
    for (const d of data) {
      if (!d.inView || d.moved < 0.02) continue;
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', d.hx); line.setAttribute('y1', d.hy);
      line.setAttribute('x2', d.x); line.setAttribute('y2', d.y);
      line.setAttribute('class', 'ex-guide');
      frag.appendChild(line);
    }
  }
  for (const p of placed) {
    const d = p.it, comp = car.components[d.n - 1];
    if (Math.hypot(p.x - d.x, p.y - d.y) > 5) {
      const lead = document.createElementNS(SVGNS, 'line');
      lead.setAttribute('x1', d.x); lead.setAttribute('y1', d.y); lead.setAttribute('x2', p.x); lead.setAttribute('y2', p.y);
      lead.setAttribute('class', 'ex-lead');
      frag.appendChild(lead);
    }
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'ex-marker' + (d.id === sel ? ' on' : ''));
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', `${pad(d.n)} ${comp[l].name}`);
    g.dataset.id = d.id;
    const c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('r', R);
    const tx = document.createElementNS(SVGNS, 'text'); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('dy', '3.6');
    tx.textContent = d.n;
    const title = document.createElementNS(SVGNS, 'title'); title.textContent = `${pad(d.n)} · ${comp[l].name}`;
    g.append(title, c, tx);
    frag.appendChild(g);
  }
  svg.replaceChildren(frag);
  overlayRaf = requestAnimationFrame(tickOverlay);
}
function startOverlay() { ensureOverlay(); if (!overlayRaf) overlayRaf = requestAnimationFrame(tickOverlay); }

function bindOverlayClicks() {
  const stage = $('#stage');
  const pick = e => {
    const g = e.target.closest?.('.ex-marker');
    if (!g) return;
    e.preventDefault(); e.stopPropagation();
    viewer.setSelected(g.dataset.id === viewer.selected ? null : g.dataset.id);
  };
  stage.addEventListener('click', pick);
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(e); });
}

/* ── cinematic ────────────────────────────────────────────── */
/* The stage itself becomes the full-viewport scene, so the renderer, camera
   aspect and framing all follow the real size. Nothing is re-parented. */
function enterCine() {
  if ($('#cine').classList.contains('on')) return;
  const row = $('.ex-stage-row');
  row.style.minHeight = `${row.offsetHeight}px`;       // hold the layout while the stage leaves it
  cineReturnFocus = document.activeElement;
  document.body.classList.add('cine-on');
  $('#cine').classList.add('on');
  $('#cine').setAttribute('aria-hidden', 'false');
  $('#cineCar').textContent = `${car.model[lang()]} · ${car.code}`;
  viewer.enterCinematic();
  $('#cineExit').focus();
}
function exitCine() {
  if (!$('#cine').classList.contains('on')) return;
  viewer.exitCinematic();
  $('#cine').classList.remove('on');
  $('#cine').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cine-on');
  $('.ex-stage-row').style.minHeight = '';
  (cineReturnFocus && document.contains(cineReturnFocus) ? cineReturnFocus : $('#cineBtn')).focus?.();
}
function cinePauseIcon() {
  const paused = viewer.cinePaused;
  $('#cinePause').innerHTML = paused
    ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  $('#cinePause').setAttribute('aria-label', paused ? t('play') : t('pause'));
}

/* ── errors / loading ─────────────────────────────────────── */
function showError(kind) {
  const box = $('#errorBox');
  if (!kind) { box.hidden = true; return; }
  const k = kind === 'webgl' ? ['webgl', 'webglSub'] : kind === 'load' ? ['loadFail', 'loadFailSub'] : ['lost', 'lostSub'];
  $('#errMsg').textContent = t(k[0]);
  $('#errSub').textContent = t(k[1]);
  $('#loading').hidden = true;
  $('#retryBtn').hidden = kind === 'webgl';
  box.hidden = false;
  if (kind === 'webgl') {
    // keep the page useful without WebGL: the component copy still renders
    $('#focusPanel').closest('.ex-card')?.classList.add('ex-nogl');
  }
}
function onLoading(on, f) {
  $('#loading').hidden = !on;
  $('#loadBar').style.width = `${Math.round((f ?? 0) * 100)}%`;
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
  showError(null);
  renderIdentity();
  renderPartPicker();
  renderFocus(null);
  buildSteps();
  const ok = await viewer.setCar(car);
  if (!ok) return;                       // superseded by a newer selection, or failed
  $('#loading').hidden = true;
  setPct(viewer.progress);
  if (mode === 'steps') showStep(0);
  const want = new URLSearchParams(location.search);
  if (want.has('p')) viewer.scrubTo(Math.min(100, Math.max(0, Number(want.get('p')))) / 100);
  if (want.has('sel') && car.components.some(c => c.id === want.get('sel'))) viewer.setSelected(want.get('sel'));
  if (want.get('labels') === '1' && !viewer.labels) $('#labelTool').click();
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
  $('#guideNote').textContent = `${t('numberNote')} ${t('guideNote')}`;
  if ($('#cine').classList.contains('on')) {
    $('#cineCar').textContent = `${car.model[lang()]} · ${car.code}`;
    cinePauseIcon();
  }
}

/* ── boot ─────────────────────────────────────────────────── */
(function boot() {
  $('#year').textContent = new Date().getFullYear();

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
    onLoading,
    onCinematicTime: t2 => { const s = $('#cineScrub'); if (document.activeElement !== s) s.value = Math.round(t2 * 1000); },
    canvasLabel: c => `Interactive 3D model of the ${c.model.en} ${c.code} engine. Drag to rotate, scroll to zoom, click a part to inspect it.`,
  });

  if (!viewer) { applyLang(lang()); showError('webgl'); return; }
  window.engineExplorer = viewer;          // mirrors window.gt3Studio, for debugging

  const params = new URLSearchParams(location.search);
  const want = params.get('car');
  loadCar(CARS[want] ? want : CAR_ORDER[0], false);

  $('#langToggle').addEventListener('click', () => applyLang(lang() === 'en' ? 'bm' : 'en'));
  applyLang(lang());

  $('#carPick').addEventListener('change', e => loadCar(e.target.value));
  $('#partPick').addEventListener('change', e => viewer.setSelected(e.target.value, { focus: true }));

  $('#explodeRange').addEventListener('input', e => viewer.scrubTo(Number(e.target.value) / 100));
  document.querySelectorAll('[data-preset]').forEach(b =>
    b.addEventListener('click', () => viewer.animateTo(Number(b.dataset.preset) / 100)));

  $('#tabExplode').addEventListener('click', () => setMode('explode'));
  $('#tabSteps').addEventListener('click', () => setMode('steps'));
  $('.ex-tabs').addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      setMode(mode === 'explode' ? 'steps' : 'explode');
      $(mode === 'steps' ? '#tabSteps' : '#tabExplode').focus();
    }
  });
  $('#stepPrev').addEventListener('click', () => showStep(stepIndex - 1));
  $('#stepNext').addEventListener('click', () => showStep(stepIndex + 1));

  $('#focusBtn').addEventListener('click', () => viewer.resetView());
  $('#focusTool').addEventListener('click', () =>
    viewer.selected ? viewer.focusComponent(viewer.selected) : viewer.resetView());
  $('#resetTool').addEventListener('click', () => { viewer.setSelected(null); viewer.resetView(); });
  $('#labelTool').addEventListener('click', e => {
    const on = !viewer.labels;
    viewer.setLabels(on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
    $('#guideNote').hidden = !on;
    if (on) startOverlay(); else overlay?.replaceChildren();
  });
  $('#rotateTool').addEventListener('click', e => {
    const on = !viewer.autoRotate;
    viewer.setAutoRotate(on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
  });
  $('#fullTool').addEventListener('click', () => {
    const el = $('.ex-stage-row');
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  });
  $('#retryBtn').addEventListener('click', () => { showError(null); loadCar(car.id, false); });
  bindOverlayClicks();

  $('#cineBtn').addEventListener('click', () => { enterCine(); cinePauseIcon(); });
  $('#cineExit').addEventListener('click', exitCine);
  $('#cinePause').addEventListener('click', () => { viewer.toggleCinePause(); cinePauseIcon(); });
  $('#cineScrub').addEventListener('input', e => viewer.setCineTime(Number(e.target.value) / 1000));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#cine').classList.contains('on')) { e.preventDefault(); exitCine(); }
    // keep focus inside the cinematic dialog
    if (e.key === 'Tab' && $('#cine').classList.contains('on')) {
      const f = [...$('#cine').querySelectorAll('button, input')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $('#guideNote').hidden = true;
})();

/* ==========================================================================
   PETROLHEAD TECHNICA — engine lab controller
   Ported to vanilla ES modules from the transmission-lab study project.
   Replaces the React state, effects and shadcn controls with plain DOM.
   ========================================================================== */
import {
  engines,
  strokes,
  cylinderPhase,
  strokeAt,
  relativePressure,
  mod,
} from './engine-mechanics.js';
import { createEngine } from './engine3d.js';
import {
  createLinkageChart,
  createCylinderLayout,
  createValveChart,
  createPressureChart,
} from './engine-charts.js';

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const bm = () => root.getAttribute('data-lang') === 'bm';

const transmissionPages = {
  r32: 'r32-dsg-lab.html',
  sharan: 'sharan-dsg-lab.html',
  bmw: 'bmw-x4-lab.html',
};

const state = {
  car: 'r32',
  playing: true,
  rpm: 700,
  speed: 0.025,
  angle: 0,
  seek: 0,
  selected: 1,
  view: 'cutaway',
  explode: 0,
  labels: false,
  block: true,
  valves: true,
  combustion: true,
  autoRotate: false,
  camera: 0,
};

let angle = 0;
let model = null;
let linkage = null;
let layout = null;
let valveChart = null;
let pressureChart = null;

const query = new URLSearchParams(location.search).get('car');
if (query === 'bmw' || query === 'x4') state.car = 'bmw';
else if (query === 'sharan') state.car = 'sharan';
if (matchMedia('(prefers-reduced-motion: reduce)').matches) state.playing = false;

/* ---------- scene lifecycle ---------- */
function buildScene() {
  if (model) {
    model.destroy();
    model = null;
  }
  $('engineCanvas').textContent = '';
  $('engineLoading').hidden = false;
  $('engineError').hidden = true;
  try {
    model = createEngine($('engineCanvas'), { ...state }, onFrame, (selected) => {
      state.selected = selected;
      sync();
    });
    $('engineLoading').hidden = true;
  } catch (e) {
    $('engineLoading').hidden = true;
    const err = $('engineError');
    err.hidden = false;
    err.textContent = bm()
      ? 'Enjin 3D memerlukan WebGL. Hidupkan pecutan grafik atau buka halaman ini dalam pelayar terkini. Rajah kitaran masih tersedia.'
      : 'The 3D engine needs WebGL. Enable graphics acceleration or open this page in a recent browser. The cycle diagrams remain available.';
  }
}

function onFrame(next) {
  angle = next;
  paint();
}

/* ---------- per-car rebuilds ---------- */
function buildForCar() {
  const config = engines[state.car];

  $('backLink').href = transmissionPages[state.car];
  $('idMaker').textContent = `${config.manufacturer} / ${config.name.toUpperCase()}`;
  $('idFamily').textContent = config.family;
  $('layoutKind').textContent = config.bankAngle ? `${config.bankAngle}° VR6` : 'INLINE 4';
  $('firingOrder').textContent = config.firingOrder.join('–');

  document.querySelectorAll('[data-car]').forEach((b) => {
    const on = b.dataset.car === state.car;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const strip = $('firingButtons');
  strip.textContent = '';
  config.firingOrder.forEach((n) => {
    const b = document.createElement('button');
    b.textContent = String(n);
    b.dataset.cyl = String(n);
    b.setAttribute('aria-label', `Select cylinder ${n}`);
    b.addEventListener('click', () => {
      state.selected = n;
      sync();
    });
    strip.appendChild(b);
  });

  layout = createCylinderLayout($('layoutChart'), state.car, (n) => {
    state.selected = n;
    sync();
  });
  layout.setLang(bm());
  buildScene();
}

/* ---------- static, language-dependent chrome ---------- */
function buildLegend() {
  const legend = $('strokeLegend');
  legend.textContent = '';
  strokes.forEach((s) => {
    const span = document.createElement('span');
    const i = document.createElement('i');
    i.style.background = s.color;
    span.append(i, document.createTextNode((bm() ? s.nameBm : s.name).toUpperCase()));
    legend.appendChild(span);
  });
  const bars = $('strokeBars');
  if (!bars.children.length) strokes.forEach(() => bars.appendChild(document.createElement('i')));
}

/* ---------- state → model + chrome ---------- */
function sync() {
  if (model) model.update({ ...state });

  $('rpmValue').textContent = state.rpm.toLocaleString('en-US');
  $('speedValue').textContent = String(Math.round(state.speed * 1000) / 10);
  const explodePct = Math.round((state.view === 'exploded' ? state.explode : 0) * 100);
  $('explodeValue').textContent = `${explodePct}%`;
  $('explodeSlider').value = String(explodePct);
  fill($('explodeSlider'));

  $('playLabel').textContent = state.playing ? (bm() ? 'JEDA' : 'PAUSE') : (bm() ? 'MAIN' : 'PLAY');
  $('playIcon').innerHTML = state.playing
    ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
    : '<path d="M7 4l12 8-12 8z"/>';

  document.querySelectorAll('[data-view]').forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.view === state.view)),
  );
  document.querySelectorAll('[data-toggle]').forEach((c) => (c.checked = state[c.dataset.toggle]));

  const captions = {
    cylinder: bm() ? `SILINDER ${state.selected} / DIASINGKAN` : `CYLINDER ${state.selected} / ISOLATED`,
    crankshaft: bm() ? `ACI ENGKOL / SILINDER ${state.selected}` : `CRANKSHAFT / CYLINDER ${state.selected}`,
    exploded: bm() ? 'TERURAI / PEMASANGAN DIPISAHKAN' : 'EXPLODED / ASSEMBLIES SEPARATED',
    cutaway: bm() ? 'KERATAN / PEMASANGAN PUTAR LENGKAP' : 'CUTAWAY / COMPLETE ROTATING ASSEMBLY',
  };
  $('viewCaption').textContent = captions[state.view];

  $('linkageCyl').textContent = String(state.selected);
  $('phaseCyl').textContent = String(state.selected);
  paint();
}

/* ---------- angle → live readouts ---------- */
function paint() {
  const phase = cylinderPhase(state.car, state.selected, angle);
  const index = strokeAt(phase);
  const stroke = strokes[index];

  if (linkage) linkage.update(phase);
  if (layout) layout.update(state.selected, angle);
  if (valveChart) valveChart.update(phase);
  if (pressureChart) pressureChart.update(phase);

  $('linkageAngle').textContent = `${Math.round(phase % 360)}°`;
  $('phaseDeg').textContent = String(Math.round(phase));
  $('strokeName').textContent = bm() ? stroke.nameBm : stroke.name;
  $('strokeName').style.color = stroke.color;
  $('strokeDesc').textContent = bm() ? stroke.descriptionBm : stroke.description;

  [...$('strokeBars').children].forEach((bar, i) => {
    bar.style.background = i === index ? strokes[i].color : '#e6e9eb';
  });

  const open = bm() ? 'TERBUKA' : 'OPEN';
  const closed = bm() ? 'TERTUTUP' : 'CLOSED';
  $('intakeDot').style.background = index === 0 ? '#329bc8' : '#c9d0d4';
  $('intakeState').textContent = index === 0 ? open : closed;
  $('exhaustDot').style.background = index === 3 ? '#737785' : '#c9d0d4';
  $('exhaustState').textContent = index === 3 ? open : closed;
  $('pressureValue').textContent = String(Math.round(relativePressure(phase) * 100));

  $('crankAngle').textContent = `${Math.round(angle)}°`;
  const timeline = $('timelineSlider');
  if (document.activeElement !== timeline) {
    timeline.value = String(Math.min(719, Math.round(angle)));
    fill(timeline);
  }

  document.querySelectorAll('#firingButtons button').forEach((b) => {
    const n = Number(b.dataset.cyl);
    b.classList.toggle('firing', strokeAt(cylinderPhase(state.car, n, angle)) === 2);
    b.classList.toggle('selected', state.selected === n);
    b.setAttribute('aria-pressed', String(state.selected === n));
  });
}

/* ---------- range fill, so WebKit tracks show progress ---------- */
function fill(input) {
  const min = Number(input.min), max = Number(input.max);
  input.style.setProperty('--fill', `${((Number(input.value) - min) / (max - min)) * 100}%`);
}

function scrub(next) {
  angle = mod(next, 720);
  state.angle = angle;
  state.seek += 1;
  state.playing = false;
  sync();
}

/* ---------- controls ---------- */
$('rpmSlider').addEventListener('input', (e) => {
  state.rpm = Number(e.target.value);
  fill(e.target);
  sync();
});
$('speedSlider').addEventListener('input', (e) => {
  state.speed = Number(e.target.value) / 1000;
  fill(e.target);
  sync();
});
$('explodeSlider').addEventListener('input', (e) => {
  const value = Number(e.target.value) / 100;
  state.explode = value;
  state.view = value > 0 ? 'exploded' : 'cutaway';
  sync();
});
$('timelineSlider').addEventListener('input', (e) => {
  fill(e.target);
  scrub(Number(e.target.value));
});
$('playBtn').addEventListener('click', () => {
  state.playing = !state.playing;
  sync();
});
$('stepBtn').addEventListener('click', () => scrub(angle + 30));
$('resetCycleBtn').addEventListener('click', () => scrub(0));
$('zoomIn').addEventListener('click', () => model && model.zoom(0.85));
$('zoomOut').addEventListener('click', () => model && model.zoom(1.17));
$('resetCam').addEventListener('click', () => {
  state.camera += 1;
  sync();
});

document.querySelectorAll('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    state.view = b.dataset.view;
    if (state.view === 'exploded' && state.explode === 0) state.explode = 0.6;
    sync();
  }),
);
document.querySelectorAll('[data-toggle]').forEach((c) =>
  c.addEventListener('change', () => {
    state[c.dataset.toggle] = c.checked;
    sync();
  }),
);
document.querySelectorAll('[data-car]').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.car === state.car) return;
    state.car = b.dataset.car;
    state.selected = 1;
    state.angle = 0;
    state.seek += 1;
    state.view = 'cutaway';
    state.explode = 0;
    state.camera += 1;
    angle = 0;
    const url = new URL(location.href);
    url.searchParams.set('car', state.car);
    history.replaceState(null, '', url);
    buildForCar();
    renderNotes();
    sync();
  }),
);

/* ---------- notes panel ---------- */
function renderNotes() {
  const config = engines[state.car];
  $('notesTitle').textContent = `${config.name} · ${config.family}`;
  $('notesDescription').textContent = bm() ? config.descriptionBm : config.description;
  $('notesBore').textContent = `${config.bore.toFixed(1)} × ${config.stroke.toFixed(1)} mm`;
  $('notesHead').textContent = bm() ? config.headBm : config.head;
  $('notesInduction').textContent = bm() ? config.inductionBm : config.induction;
  const links = $('notesLinks');
  links.textContent = '';
  config.links.forEach((l) => {
    const a = document.createElement('a');
    a.href = l.href;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = l.text;
    links.appendChild(a);
  });
  $('idSubtitle').textContent = bm() ? config.subtitleBm : config.subtitle;
}
$('notesBtn').addEventListener('click', () => {
  $('engineNotes').hidden = !$('engineNotes').hidden;
});
$('closeNotes').addEventListener('click', () => ($('engineNotes').hidden = true));

/* ---------- language ---------- */
const langBtn = $('langToggle');
function applyLang(lang) {
  root.setAttribute('data-lang', lang);
  document.querySelectorAll('[data-en][data-bm]').forEach((el) => {
    el.innerHTML = lang === 'bm' ? el.dataset.bm : el.dataset.en;
  });
  langBtn.querySelector('.lang-en').classList.toggle('active', lang === 'en');
  langBtn.querySelector('.lang-bm').classList.toggle('active', lang === 'bm');
  try { localStorage.setItem('fs-lang', lang); } catch (e) {}
  buildLegend();
  if (layout) layout.setLang(lang === 'bm');
  if (linkage) linkage.setLang(lang === 'bm');
  if (pressureChart) pressureChart.setLang(lang === 'bm');
  renderNotes();
  sync();
}
langBtn.addEventListener('click', () =>
  applyLang(root.getAttribute('data-lang') === 'en' ? 'bm' : 'en'),
);

/* ---------- boot ---------- */
linkage = createLinkageChart($('linkageChart'));
valveChart = createValveChart($('valveChart'));
pressureChart = createPressureChart($('pressureChart'));
linkage.setLang(false);
pressureChart.setLang(false);
buildLegend();
buildForCar();
renderNotes();
[$('rpmSlider'), $('speedSlider'), $('explodeSlider'), $('timelineSlider')].forEach(fill);
sync();

try {
  const saved = localStorage.getItem('fs-lang');
  if (saved === 'bm') applyLang('bm');
} catch (e) {}

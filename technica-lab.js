/* ==========================================================================
   PETROLHEAD TECHNICA — lab controller
   Drives the 3D gearbox scene, the component list, the inspector and the
   simulation console. Bilingual EN / BM.
   ========================================================================== */
import { createGearbox } from './technica3d.js';

const CAR = document.body.dataset.car === 'sharan' ? 'sharan' : 'r32';

/* ---------- vehicle data ------------------------------------------------ */
const CARS = {
  r32: {
    badge: 'R32',
    name: { en: 'Golf Mk5 R32', bm: 'Golf Mk5 R32' },
    year: '2006',
    crumb: { en: 'GOLF MK5 R32', bm: 'GOLF MK5 R32' },
    eyebrow: { en: '01 / GOLF MK5 R32 · 2006', bm: '01 / GOLF MK5 R32 · 2006' },
    line: { en: '3.2 VR6 · 4MOTION', bm: '3.2 VR6 · 4MOTION' },
    arch: '02E / DQ250', archSub: { en: '6-SPEED WET DSG', bm: 'DSG BASAH 6 KELAJUAN' },
    tyre: 1.93,                       // 225/40 R18 rolling circumference, m
    idle: 800, redline: 6800,
    /* 02E four-wheel-drive DSG, 3.2 V6 (code letters GYC / HUW / HXZ) */
    ratios: { 1: 2.933, 2: 1.792, 3: 1.267, 4: 0.975, 5: 1.030, 6: 0.825, R: 3.352 },
    finals: { 1: 4.800, 2: 4.800, 3: 4.800, 4: 4.800, 5: 3.600, 6: 3.600, R: 3.600 },
    ratioNote: {
      en: 'Ratios from the Audi/VW workshop table for the 02E four-wheel-drive DSG behind the 3.2 V6. Gears 1–4 run on final drive I, gears 5, 6 and reverse on final drive II.',
      bm: 'Nisbah daripada jadual bengkel Audi/VW untuk DSG 02E pacuan empat roda di belakang 3.2 V6. Gear 1–4 menggunakan pemacu akhir I, gear 5, 6 dan undur menggunakan pemacu akhir II.'
    }
  },
  sharan: {
    badge: '7N',
    name: { en: 'Sharan 7N', bm: 'Sharan 7N' },
    year: '2012',
    crumb: { en: 'SHARAN 7N', bm: 'SHARAN 7N' },
    eyebrow: { en: '02 / SHARAN 7N · 2012', bm: '02 / SHARAN 7N · 2012' },
    line: { en: 'Sharan 7N · Front-wheel drive', bm: 'Sharan 7N · Pacuan roda hadapan' },
    arch: '02E / DQ250', archSub: { en: '6-SPEED WET DSG', bm: 'DSG BASAH 6 KELAJUAN' },
    tyre: 2.02,                       // 215/60 R16 rolling circumference, m
    idle: 750, redline: 6200,
    /* typical DQ250 transverse set — this car's gearbox code is unconfirmed */
    ratios: { 1: 3.462, 2: 2.050, 3: 1.300, 4: 0.902, 5: 0.914, 6: 0.756, R: 3.987 },
    finals: { 1: 4.118, 2: 4.118, 3: 4.118, 4: 4.118, 5: 3.043, 6: 3.043, R: 4.118 },
    ratioNote: {
      en: 'A published DQ250 transverse ratio set, shown for scale. This car’s gearbox code has not been confirmed, so treat the numbers as indicative rather than as your gearbox.',
      bm: 'Set nisbah DQ250 melintang yang diterbitkan, ditunjukkan sebagai gambaran. Kod gearbox kereta ini belum disahkan, jadi anggap angka ini sebagai panduan, bukan gearbox anda.'
    }
  }
};

/* ---------- components -------------------------------------------------- */
const COMPONENTS = [
  { id: 'overview', tag: '02E', color: '#9bb2bc',
    title: { en: 'Complete transmission', bm: 'Transmisi lengkap' },
    text: { en: 'Two clutches. Six forward gears. One continuous conversation between mechanics and control. Select a component to look inside.', bm: 'Dua kopling. Enam gear hadapan. Satu perbualan berterusan antara mekanik dan kawalan. Pilih komponen untuk melihat ke dalam.' },
    detail: { en: 'The 02E uses two concentric input shafts and two output shafts. One clutch transmits power while the other side prepares the next gear.', bm: '02E menggunakan dua aci masuk sepusat dan dua aci keluar. Satu kopling menghantar kuasa manakala sebelah lagi menyiapkan gear seterusnya.' } },
  { id: 'flywheel', tag: '01', color: '#aab9c1',
    title: { en: 'Dual-mass flywheel', bm: 'Roda tenaga dwi-jisim' },
    text: { en: 'The connection to the engine.', bm: 'Sambungan kepada enjin.' },
    detail: { en: 'The dual-mass flywheel smooths torsional vibration from the engine before it reaches the clutch assembly. It continues turning when the engine runs, even when neither clutch is driving the wheels.', bm: 'Roda tenaga dwi-jisim meratakan getaran kilasan daripada enjin sebelum ia sampai ke pemasangan kopling. Ia terus berputar ketika enjin hidup, walaupun tiada kopling yang memacu roda.' } },
  { id: 'k1', tag: '02', color: '#74edc9',
    title: { en: 'K1 · outer wet clutch', bm: 'K1 · kopling basah luar' },
    text: { en: 'First, third, fifth — and reverse.', bm: 'Pertama, ketiga, kelima — dan undur.' },
    detail: { en: 'The outer multi-plate clutch connects the engine to input shaft 1, the inner solid shaft. Its alternating friction and steel plates run in oil. Hydraulic pressure brings the plates together to transmit torque.', bm: 'Kopling berbilang plat di sebelah luar menyambungkan enjin ke aci masuk 1, iaitu aci pejal di dalam. Plat geseran dan plat keluli berselang-seli berendam dalam minyak. Tekanan hidraulik merapatkan plat untuk menghantar tork.' } },
  { id: 'k2', tag: '03', color: '#f6bd68',
    title: { en: 'K2 · inner wet clutch', bm: 'K2 · kopling basah dalam' },
    text: { en: 'Second, fourth, and sixth.', bm: 'Kedua, keempat, dan keenam.' },
    detail: { en: 'The inner multi-plate clutch connects the engine to hollow input shaft 2. During an upshift, the controller reduces pressure on one clutch as it applies pressure to the other.', bm: 'Kopling berbilang plat di sebelah dalam menyambungkan enjin ke aci masuk 2 yang berongga. Ketika naik gear, pengawal mengurangkan tekanan pada satu kopling sambil menambah tekanan pada satu lagi.' } },
  { id: 'input1', tag: '04', color: '#74edc9',
    title: { en: 'Input shaft 1', bm: 'Aci masuk 1' },
    text: { en: 'The solid shaft inside the hollow shaft.', bm: 'Aci pejal di dalam aci berongga.' },
    detail: { en: 'Driven by K1, input shaft 1 supplies gears 1, 3, 5 and reverse. First and reverse share an input gear wheel. Both input shafts share the same centre line.', bm: 'Dipacu oleh K1, aci masuk 1 membekalkan gear 1, 3, 5 dan undur. Gear pertama dan undur berkongsi satu roda gear masukan. Kedua-dua aci masuk berkongsi garis pusat yang sama.' } },
  { id: 'input2', tag: '05', color: '#f6bd68',
    title: { en: 'Input shaft 2', bm: 'Aci masuk 2' },
    text: { en: 'A hollow shaft around input shaft 1.', bm: 'Aci berongga di sekeliling aci masuk 1.' },
    detail: { en: 'Driven by K2, this shaft supplies gears 2, 4 and 6. Fourth and sixth share one input gear wheel, driving gears on different output shafts.', bm: 'Dipacu oleh K2, aci ini membekalkan gear 2, 4 dan 6. Gear keempat dan keenam berkongsi satu roda gear masukan, memacu gear pada aci keluar yang berbeza.' } },
  { id: 'output1', tag: '06', color: '#aab9c1',
    title: { en: 'Output shaft 1', bm: 'Aci keluar 1' },
    text: { en: 'The output route for gears 1–4.', bm: 'Laluan keluaran untuk gear 1–4.' },
    detail: { en: 'The selector sleeves lock the required free-running gear to this shaft. Its final-drive pinion meshes with the differential ring gear. Both output shafts remain mechanically connected through that ring gear.', bm: 'Sarung pemilih mengunci gear bebas yang diperlukan pada aci ini. Pinion pemacu akhirnya bersentuh dengan roda gelang pembeza. Kedua-dua aci keluar kekal bersambung secara mekanikal melalui roda gelang itu.' } },
  { id: 'output2', tag: '07', color: '#aab9c1',
    title: { en: 'Output shaft 2', bm: 'Aci keluar 2' },
    text: { en: 'The output route for fifth, sixth and reverse.', bm: 'Laluan keluaran untuk gear kelima, keenam dan undur.' },
    detail: { en: 'The second output shaft makes this transverse gearbox compact. Like output shaft 1, its pinion drives the same front differential ring gear.', bm: 'Aci keluar kedua menjadikan kotak gear melintang ini padat. Seperti aci keluar 1, pinionnya memacu roda gelang pembeza hadapan yang sama.' } },
  { id: 'reverse', tag: '08', color: '#aab9c1',
    title: { en: 'Reverse idler shaft', bm: 'Aci pelahu undur' },
    text: { en: 'One extra mesh changes the direction.', bm: 'Satu sentuhan gear tambahan menukar arah.' },
    detail: { en: 'Reverse uses K1 and input shaft 1. An intermediate reverse shaft adds a gear mesh before the reverse gear on output shaft 2, reversing the direction at the differential.', bm: 'Gear undur menggunakan K1 dan aci masuk 1. Aci undur perantara menambah satu sentuhan gear sebelum gear undur pada aci keluar 2, membalikkan arah di pembeza.' } },
  { id: 'differential', tag: '09', color: '#aab9c1',
    title: { en: 'Front differential', bm: 'Pembeza hadapan' },
    text: { en: 'The final drive to the front wheels.', bm: 'Pemacu akhir ke roda hadapan.' },
    detail: { en: 'The final-drive ring gear receives torque from either output shaft. The differential allows the left and right front wheels to turn at different speeds in a corner.', bm: 'Roda gelang pemacu akhir menerima tork daripada mana-mana aci keluar. Pembeza membenarkan roda hadapan kiri dan kanan berputar pada kelajuan berbeza ketika membelok.' } },
  { id: 'mechatronics', tag: '10', color: '#c8b278',
    title: { en: 'Mechatronics', bm: 'Mekatronik' },
    text: { en: 'The gearbox’s electronic and hydraulic control.', bm: 'Kawalan elektronik dan hidraulik kotak gear.' },
    detail: { en: 'An integrated controller, sensors and hydraulic valves coordinate gear selection and clutch pressure. Its solenoid valves route oil to the clutches and selector mechanisms.', bm: 'Pengawal bersepadu, penderia dan injap hidraulik menyelaraskan pemilihan gear dan tekanan kopling. Injap solenoidnya menyalurkan minyak ke kopling dan mekanisme pemilih.' } },
  { id: 'awd', tag: '11', color: '#81a5e0', r32Only: true,
    title: { en: '4MOTION bevel box', bm: 'Kotak serong 4MOTION' },
    text: { en: 'A second path towards the rear wheels.', bm: 'Laluan kedua ke arah roda belakang.' },
    detail: { en: 'On the R32, a bevel box sends drive through the propshaft to the Haldex coupling and rear differential. The rear axle is represented here by the outgoing connection; its coupling is outside the DSG.', bm: 'Pada R32, kotak gear serong menghantar pacuan melalui aci pemacu ke gandingan Haldex dan pembeza belakang. Gandar belakang di sini diwakili oleh sambungan keluar; gandingannya berada di luar DSG.' } }
];

/* ---------- static strings ---------------------------------------------- */
const UI = {
  loading: { en: 'Assembling your DSG…', bm: 'Memasang DSG anda…' },
  webglError: {
    en: 'The 3D view needs WebGL. Try opening this page in a recent version of Chrome, Edge or Safari with graphics acceleration enabled. The component guide is still available below.',
    bm: 'Paparan 3D memerlukan WebGL. Cuba buka halaman ini dalam Chrome, Edge atau Safari terkini dengan pecutan grafik dihidupkan. Panduan komponen di bawah masih boleh digunakan.'
  },
  loadError: { en: 'The 3D view could not load. Reload the page to try again.', bm: 'Paparan 3D gagal dimuatkan. Muat semula halaman untuk mencuba lagi.' },
  theSystem: { en: 'THE SYSTEM', bm: 'SISTEM' },
  component: { en: 'COMPONENT', bm: 'KOMPONEN' },
  isolate: { en: 'Isolate this part', bm: 'Asingkan bahagian ini' },
  showAll: { en: 'Show complete assembly', bm: 'Tunjuk pemasangan penuh' },
  park: { en: 'Park is engaged.', bm: 'Gear letak dimasukkan.' },
  neutral: { en: 'Engine disconnected.', bm: 'Enjin diputuskan.' },
  reverse: { en: 'Reverse through K1.', bm: 'Undur melalui K1.' },
  gearLine: { en: 'Gear %g, clutch %k.', bm: 'Gear %g, kopling %k.' },
  engineFly: { en: 'Engine / flywheel', bm: 'Enjin / roda tenaga' },
  clutchTo: { en: '%k → input shaft %n', bm: '%k → aci masuk %n' },
  bothOpen: { en: 'Both clutches open', bm: 'Kedua-dua kopling terbuka' },
  revIdler: { en: 'Reverse idler shaft', bm: 'Aci pelahu undur' },
  outShaft: { en: 'Output shaft %n', bm: 'Aci keluar %n' },
  noGear: { en: 'No driven gear', bm: 'Tiada gear dipacu' },
  frontDiff: { en: 'Front differential', bm: 'Pembeza hadapan' },
  noteP: { en: 'The parking lock holds the drivetrain. The engine can keep turning with both clutches open.', bm: 'Kunci letak menahan pemacu. Enjin boleh terus berputar dengan kedua-dua kopling terbuka.' },
  noteN: { en: 'Both clutches are open, so the engine does not drive the input shafts in this simplified view.', bm: 'Kedua-dua kopling terbuka, jadi enjin tidak memacu aci masuk dalam paparan ringkas ini.' },
  noteR: { en: 'The extra gear mesh reverses the output direction. Reverse belongs to the K1 side.', bm: 'Sentuhan gear tambahan membalikkan arah keluaran. Gear undur milik sebelah K1.' },
  noteD: { en: 'The next gear can be selected on the other shaft before its clutch takes over.', bm: 'Gear seterusnya boleh dipilih pada aci yang satu lagi sebelum koplingnya mengambil alih.' },
  overall: { en: 'Overall ratio', bm: 'Nisbah keseluruhan' },
  roadSpeed: { en: 'Road speed at this rpm', bm: 'Kelajuan jalan pada rpm ini' },
  inBox: { en: 'In gearbox', bm: 'Dalam kotak gear' },
  finalDrive: { en: 'Final drive', bm: 'Pemacu akhir' },
  parkLock: { en: 'PARK LOCK', bm: 'KUNCI LETAK' },
  neutralTag: { en: 'NEUTRAL', bm: 'NEUTRAL' },
  clutchTag: { en: '%k CLUTCH', bm: 'KOPLING %k' },
  pause: { en: 'Pause', bm: 'Jeda' },
  play: { en: 'Play', bm: 'Main' }
};

/* ---------- state ------------------------------------------------------- */
const car = CARS[CAR];
const parts = COMPONENTS.filter(c => CAR === 'r32' || !c.r32Only);

let lang = 'en';
let model = null;
let autoShift = false, autoTimer = null;
let view = 'cutaway';

const S = {
  car: CAR, gear: 1, mode: 'D', playing: true, rpm: 1800, speed: 0.35, explode: 0,
  housing: false, labels: false, flow: true, selected: 'overview', isolated: false,
  camera: 0, autoRotate: false, ratio: 1, final: 1
};

const t = o => (o && (o[lang] || o.en)) || '';
const $ = s => document.querySelector(s);

/* ---------- physics ----------------------------------------------------- */
function gearKey() { return S.mode === 'R' ? 'R' : String(S.gear); }
function ratio() { return car.ratios[gearKey()] || 1; }
function finalDrive() { return car.finals[gearKey()] || 1; }
function overall() { return ratio() * finalDrive(); }
function roadSpeed() { return S.rpm / overall() * car.tyre * 60 / 1000; }
function engaged() { return S.mode === 'D' || S.mode === 'R'; }

/* ---------- render ------------------------------------------------------ */
function renderStatic() {
  $('#carBadge').textContent = car.badge;
  $('#crumbCar').textContent = t(car.crumb);
  $('#archCode').firstChild.nodeValue = car.arch + ' ';
  $('#archSub').textContent = t(car.archSub);
  $('#viewerEyebrow').textContent = t(car.eyebrow);
  $('#viewerLine').innerHTML = t(car.line) + ' <span>/</span> ' +
    (lang === 'bm' ? 'DSG kopling basah enam kelajuan' : 'Six-speed wet-clutch DSG');
  $('#partCount').textContent = parts.length;
  $('#rpmRange').min = car.idle;
  $('#rpmRange').max = car.redline;
  $('#rpmTicks').innerHTML = '<span>' + car.idle.toLocaleString() + '</span><span>' + car.redline.toLocaleString() + '</span>';
  document.querySelectorAll('[data-en][data-bm]').forEach(n => {
    n.innerHTML = lang === 'bm' ? n.dataset.bm : n.dataset.en;
  });
  const lb = $('#langToggle');
  lb.querySelector('.lang-en').classList.toggle('active', lang === 'en');
  lb.querySelector('.lang-bm').classList.toggle('active', lang === 'bm');
}

function renderParts() {
  const list = $('#partList');
  list.innerHTML = '';
  parts.forEach(c => {
    const b = document.createElement('button');
    b.className = 'part' + (S.selected === c.id ? ' selected' : '');
    b.innerHTML = '<span class="part-dot" style="background:' + c.color + '"></span><span>' +
      t(c.title) + '</span><small>' + c.tag + '</small>';
    b.addEventListener('click', () => { S.selected = c.id; S.isolated = false; sync(); });
    list.appendChild(b);
  });
}

function renderInspector() {
  const c = parts.find(p => p.id === S.selected) || parts[0];
  const active = S.mode === 'R' ? -1 : S.gear;
  const odd = active % 2 !== 0;
  $('#inspEyebrow').textContent = c.id === 'overview' ? t(UI.theSystem) : t(UI.component) + ' / ' + c.tag;
  $('#inspTitle').textContent = t(c.title);
  $('#inspLead').textContent = t(c.text);
  $('#inspDetail').textContent = t(c.detail);
  const iso = $('#btnIsolate');
  iso.style.display = c.id === 'overview' ? 'none' : '';
  iso.textContent = '◎ ' + (S.isolated ? t(UI.showAll) : t(UI.isolate));

  $('#pathTitle').textContent =
    S.mode === 'P' ? t(UI.park) :
    S.mode === 'N' ? t(UI.neutral) :
    S.mode === 'R' ? t(UI.reverse) :
    t(UI.gearLine).replace('%g', S.gear).replace('%k', odd ? 'K1' : 'K2');

  const outNo = (active === 5 || active === 6 || active === -1) ? '2' : '1';
  const steps = [
    { txt: t(UI.engineFly), lit: true },
    { txt: engaged() ? t(UI.clutchTo).replace('%k', odd ? 'K1' : 'K2').replace('%n', odd ? '1' : '2') : t(UI.bothOpen), lit: engaged() }
  ];
  if (S.mode === 'R') steps.push({ txt: t(UI.revIdler), lit: true });
  steps.push({ txt: engaged() ? t(UI.outShaft).replace('%n', outNo) : t(UI.noGear), lit: engaged() });
  steps.push({ txt: t(UI.frontDiff) + (CAR === 'r32' ? ' + 4MOTION' : ''), lit: engaged() });
  $('#powerPath').innerHTML = steps.map(s => '<li class="' + (s.lit ? 'lit' : '') + '">' + s.txt + '</li>').join('');

  $('#factNote').textContent =
    S.mode === 'P' ? t(UI.noteP) : S.mode === 'N' ? t(UI.noteN) : S.mode === 'R' ? t(UI.noteR) : t(UI.noteD);

  $('#ratioDetail').innerHTML = engaged()
    ? '<span>' + t(UI.overall) + '</span><strong>' + overall().toFixed(2) + ' : 1</strong>' +
      '<span>' + t(UI.inBox) + ' · ' + t(UI.finalDrive) + '</span><strong>' + ratio().toFixed(3) + ' × ' + finalDrive().toFixed(3) + '</strong>' +
      '<span>' + t(UI.roadSpeed) + '</span><strong>' + Math.round(roadSpeed()) + ' km/h</strong>' +
      '<small>' + t(car.ratioNote) + '</small>'
    : '<small>' + t(car.ratioNote) + '</small>';
}

function renderConsole() {
  const active = S.mode === 'R' ? -1 : S.gear;
  const odd = active % 2 !== 0;
  $('#rpmOut').innerHTML = S.rpm.toLocaleString() + ' <small>rpm</small>';
  $('#rpmRange').value = S.rpm;
  $('#gearBig').textContent = engaged() ? (S.mode === 'R' ? 'R' : S.gear) : S.mode;
  $('#gearTag').textContent = engaged() ? t(UI.clutchTag).replace('%k', odd ? 'K1' : 'K2')
    : (S.mode === 'P' ? t(UI.parkLock) : t(UI.neutralTag));
  $('#speedOut').innerHTML = engaged() ? Math.round(roadSpeed()) + ' <small>km/h</small>' : '— <small>km/h</small>';
  document.querySelectorAll('#driveButtons button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  document.querySelectorAll('#gearButtons button').forEach(b => b.classList.toggle('on', S.mode === 'D' && +b.dataset.gear === S.gear));
  document.querySelectorAll('.playback-speed button').forEach(b => b.classList.toggle('on', +b.dataset.speed === S.speed));
  document.querySelectorAll('.view-tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  $('#playButton').textContent = (S.playing ? '❚❚  ' : '▶  ') + (S.playing ? t(UI.pause) : t(UI.play));
  $('#explodeRange').value = Math.round(S.explode * 100);
  $('#explodeOut').textContent = Math.round(S.explode * 100) + '%';
}

function sync() {
  S.ratio = ratio();
  S.final = finalDrive();
  renderParts();
  renderInspector();
  renderConsole();
  if (model) model.update({ ...S });
}

/* ---------- events ------------------------------------------------------ */
function wire() {
  $('#langToggle').addEventListener('click', () => {
    lang = lang === 'en' ? 'bm' : 'en';
    try { localStorage.setItem('fs-lang', lang); } catch (e) {}
    document.documentElement.setAttribute('data-lang', lang);
    renderStatic(); sync();
  });

  document.querySelectorAll('#driveButtons button').forEach(b => {
    b.addEventListener('click', () => { S.mode = b.dataset.mode; S.isolated = false; sync(); });
  });
  document.querySelectorAll('#gearButtons button').forEach(b => {
    b.addEventListener('click', () => { stopAuto(); S.gear = +b.dataset.gear; S.mode = 'D'; sync(); });
  });
  $('#rpmRange').addEventListener('input', function () { S.rpm = +this.value; sync(); });
  $('#explodeRange').addEventListener('input', function () {
    S.explode = +this.value / 100;
    view = S.explode > 0 ? 'exploded' : (S.housing ? 'housing' : 'cutaway');
    sync();
  });
  document.querySelectorAll('.playback-speed button').forEach(b => {
    b.addEventListener('click', () => { S.speed = +b.dataset.speed; sync(); });
  });
  $('#playButton').addEventListener('click', () => { S.playing = !S.playing; sync(); });
  document.querySelectorAll('.view-tabs button').forEach(b => {
    b.addEventListener('click', () => {
      view = b.dataset.view;
      S.explode = view === 'exploded' ? 0.7 : 0;
      S.housing = view === 'housing';
      sync();
    });
  });
  $('#btnIsolate').addEventListener('click', () => { S.isolated = !S.isolated; sync(); });
  $('#swLabels').addEventListener('change', function () { S.labels = this.checked; sync(); });
  $('#swFlow').addEventListener('change', function () { S.flow = this.checked; sync(); });
  $('#swRotate').addEventListener('change', function () { S.autoRotate = this.checked; sync(); });
  $('#swAuto').addEventListener('change', function () { this.checked ? startAuto() : stopAuto(); });
  $('#zoomIn').addEventListener('click', () => model && model.zoom(0.85));
  $('#zoomOut').addEventListener('click', () => model && model.zoom(1.18));
  $('#zoomHome').addEventListener('click', () => { S.camera++; sync(); });
}

function startAuto() {
  autoShift = true;
  $('#swAuto').checked = true;
  stopTimer();
  autoTimer = setInterval(() => {
    if (!S.playing || S.mode !== 'D') return;
    S.gear = S.gear === 6 ? 1 : S.gear + 1;
    sync();
  }, 5500);
}
function stopTimer() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
function stopAuto() { autoShift = false; $('#swAuto').checked = false; stopTimer(); }

/* ---------- boot -------------------------------------------------------- */
try { const v = localStorage.getItem('fs-lang'); if (v === 'bm' || v === 'en') lang = v; } catch (e) {}
document.documentElement.setAttribute('data-lang', lang);

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.playing = false;

renderStatic();
wire();
sync();

try {
  model = createGearbox($('#canvasHost'), id => { S.selected = id; sync(); });
  model.update({ ...S });
  $('#modelLoading').remove();
} catch (err) {
  const box = $('#modelLoading');
  box.className = 'model-error';
  box.textContent = t(UI.webglError);
  console.error(err);
}

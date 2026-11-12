// MTR DRILLTECH · HWU Level 2 simulator
// Applies the Level 1 technical course through seven practice stations.
// Illustrative training aid: all wells, numbers and limits are generated for practice.

let lang = 0;
const t = (en, bm) => (lang ? bm : en);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b, step = 1) => Math.round(rnd(a, b) / step) * step;
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const KEY = 'mtr-hwu-l2-v1';
let scores = {};
try { scores = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { scores = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(scores)); } catch { /* storage unavailable */ } };
const PASS = 70;
let current = 'ident', cleanup = null;

function setScore(id, pct) { scores[id] = Math.max(0, Math.min(100, Math.round(pct))); save(); nav(); }
const head = (ref, title, lead) => `<span class="ref">${ref}</span><h1>${title}</h1><p class="lead">${lead}</p>`;
const note = () => `<p class="note">${t('Training aid only. Wells, pressures and limits are generated for practice and do not describe a real unit or well. On site, the approved well programme, the equipment manual and your supervisor come first. This simulator does not replace certified well control training.', 'Alat bantu latihan sahaja. Telaga, tekanan dan had dijana untuk latihan dan tidak menggambarkan unit atau telaga sebenar. Di lokasi, program telaga yang diluluskan, manual peralatan dan penyelia anda diutamakan. Simulator ini tidak menggantikan latihan kawalan telaga bertauliah.')}</p>`;

/* ---------------------------------------------------------------- 1. Equipment identification (3D) */
const PARTS = {
  'hwu-base': ['Base and substructure', 'Tapak dan substruktur', 'Carries the unit and spreads its load around the well centre.', 'Menanggung unit dan mengagih bebannya di sekeliling pusat telaga.'],
  'hwu-jack': ['Hydraulic jack', 'Jek hidraulik', 'Cylinders that push and pull the pipe one stroke at a time.', 'Silinder yang menolak dan menarik paip satu lejang pada satu masa.'],
  'hwu-travelling-slips': ['Travelling slips', 'Slip bergerak', 'Grip the pipe on the moving jack head.', 'Mencengkam paip pada kepala jek yang bergerak.'],
  'hwu-stationary-slips': ['Stationary slips', 'Slip pegun', 'Hold the pipe while the jack is repositioned.', 'Menahan paip ketika jek diposisikan semula.'],
  'hwu-workbasket': ['Work basket', 'Bakul kerja', 'Elevated platform for the crew and controls.', 'Pelantar tinggi untuk krew dan kawalan.'],
  'hwu-guide': ['Pipe guide', 'Pemandu paip', 'Keeps the exposed pipe aligned so it does not buckle.', 'Mengekalkan paip terdedah sejajar supaya tidak melengkok.'],
  'hwu-bop': ['BOP stack', 'Susunan BOP', 'Pressure-control barrier on the wellhead.', 'Halangan kawalan tekanan di atas kepala telaga.'],
  'hwu-hpu': ['Hydraulic power unit', 'Unit kuasa hidraulik', 'Engine and pumps that supply hydraulic power.', 'Enjin dan pam yang membekal kuasa hidraulik.'],
  'hwu-controls': ['Control consoles', 'Konsol kawalan', 'Where the jack, slips and well control functions are operated.', 'Tempat jek, slip dan fungsi kawalan telaga dikendalikan.'],
  'hwu-pipe': ['Workstring and pipe rack', 'Rentetan kerja dan rak paip', 'Jointed pipe run into the well and stored on deck.', 'Paip bersambung yang dimasukkan ke telaga dan disimpan di dek.'],
  'hwu-handling': ['Gin pole and winches', 'Gin pole dan win', 'Lift single joints between deck and work basket.', 'Mengangkat paip tunggal antara dek dan bakul kerja.'],
  'hwu-manifold': ['Flow-control manifold', 'Manifold kawalan aliran', 'Valves and chokes that control returns from the well.', 'Injap dan choke yang mengawal aliran balik dari telaga.'],
  'hwu-tank': ['Fluid tank', 'Tangki bendalir', 'Stores kill and completion fluid.', 'Menyimpan bendalir kill dan completion.'],
  'hwu-access': ['Stairs and guardrails', 'Tangga dan susur tangan', 'Access and escape route to the work basket.', 'Laluan akses dan kecemasan ke bakul kerja.'],
};

async function ident(root) {
  root.innerHTML = head(t('Applies Level 1 · Module 6', 'Aplikasi Tahap 1 · Modul 6'), t('Station 1: Find the equipment', 'Stesen 1: Cari peralatan'),
    t('You are named a part of the unit. Orbit the model and click that part. One attempt for each of eight parts.', 'Satu bahagian unit dinamakan. Pusing model dan klik bahagian itu. Satu percubaan bagi setiap lapan bahagian.')) +
    `<div class="row"><div class="grow" style="flex:2"><div id="view3d" aria-label="${t('3D model of a hydraulic workover unit', 'Model 3D unit workover hidraulik')}"></div></div>
     <div class="grow card"><div class="meter"><label>${t('Find', 'Cari')}</label><div class="prompt" id="q"></div></div><div class="msg" id="m" aria-live="polite">${t('Loading the 3D model…', 'Memuatkan model 3D…')}</div>
     <dl class="kv" style="margin-top:14px"><dt>${t('Question', 'Soalan')}</dt><dd id="qn">–</dd><dt>${t('Correct', 'Betul')}</dt><dd id="ok">0</dd></dl>
     <div class="btns"><button id="again">${t('Restart station', 'Mula semula stesen')}</button></div>
     <p class="note" style="margin-top:14px">${t('Drag to orbit · scroll to zoom · right-drag to pan', 'Seret untuk pusing · tatal untuk zum · seret kanan untuk anjak')}</p></div></div>` + note();
  $('#again').onclick = () => go('ident');
  let alive = true, raf = 0, renderer = null, ro = null;
  try {
    const THREE = await import('../vendor/three.module.min.js');
    const { OrbitControls } = await import('../vendor/OrbitControls.js');
    const { buildHWU } = await import('../assets/hwu-model.js');
    if (!alive) return;
    const box = $('#view3d');
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dbe8ed');
    const camera = new THREE.PerspectiveCamera(38, 1, 0.2, 1500);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    box.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight('#dceef8', '#62878c', 2.3));
    const sun = new THREE.DirectionalLight('#fff1d5', 3.2); sun.position.set(-100, 160, 100); scene.add(sun);
    const model = buildHWU(); scene.add(model.group); model.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(model.group), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.y, s.z);
    camera.position.set(c.x + r * 0.9, c.y + r * 0.55, c.z + r * 1.05);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(c); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;
    const size = () => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); ro = new ResizeObserver(size); ro.observe(box);
    const loop = () => { if (!alive) return; controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); }; loop();

    const hi = new THREE.MeshStandardMaterial({ color: '#f4a03a', emissive: '#f4a03a', emissiveIntensity: 0.55, roughness: 0.5 });
    let restore = [];
    const flash = (id) => { const p = model.parts.get(id); if (!p) return; p.traverse((n) => { if (n.isMesh && n.visible) { restore.push([n, n.material]); n.material = hi; } }); };
    const unflash = () => { restore.forEach(([n, m]) => { n.material = m; }); restore = []; };

    const ids = shuffle(Object.keys(PARTS).filter((id) => model.parts.has(id))).slice(0, 8);
    let i = 0, ok = 0, locked = false;
    const ask = () => { $('#q').textContent = t(PARTS[ids[i]][0], PARTS[ids[i]][1]); $('#qn').textContent = `${i + 1} / ${ids.length}`; };
    ask(); $('#m').textContent = t('Click the part on the model.', 'Klik bahagian itu pada model.');
    const ray = new THREE.Raycaster(), v = new THREE.Vector2(); let down = null;
    renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down || locked || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      v.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(v, camera);
      const hit = ray.intersectObjects(model.group.children, true).find((h) => h.object.visible && h.object.userData.componentId);
      if (!hit) return;
      const picked = hit.object.userData.componentId, want = ids[i], right = picked === want;
      if (right) ok++;
      locked = true; flash(want);
      const m = $('#m'); m.className = 'msg ' + (right ? 'ok' : 'bad');
      m.innerHTML = `<b>${right ? t('Correct.', 'Betul.') : t('Not quite. You clicked: ', 'Kurang tepat. Anda klik: ') + (right ? '' : t(PARTS[picked]?.[0] || picked, PARTS[picked]?.[1] || picked) + '.')}</b> ${t(PARTS[want][0], PARTS[want][1])}: ${t(PARTS[want][2], PARTS[want][3])} ${t('It is highlighted now.', 'Ia sedang diserlahkan.')}`;
      $('#ok').textContent = ok;
      setTimeout(() => {
        if (!alive) return; unflash(); locked = false; i++;
        if (i >= ids.length) { setScore('ident', (ok / ids.length) * 100); $('#q').textContent = t('Station complete', 'Stesen selesai'); m.className = 'msg ok'; m.textContent = t(`Score ${ok} of ${ids.length}.`, `Markah ${ok} daripada ${ids.length}.`); locked = true; } else ask();
      }, 2600);
    });
  } catch (err) {
    console.error(err); if (alive) { const m = $('#m'); m.className = 'msg bad'; m.textContent = t('The 3D model could not start on this device. Use a browser with WebGL enabled.', 'Model 3D tidak dapat dimulakan pada peranti ini. Guna pelayar dengan WebGL diaktifkan.'); }
  }
  return () => { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); renderer?.dispose(); };
}

/* ---------------------------------------------------------------- 2. Jack and slips */
function jack(root) {
  const TARGET = 30, STROKE = 10;
  const S = { jack: STROKE, ts: true, ss: true, run: 0, viol: 0, strokes: 0, dropped: false, done: false, busy: false };
  root.innerHTML = head(t('Applies Level 1 · Modules 6 and 10', 'Aplikasi Tahap 1 · Modul 6 dan 10'), t('Station 2: Run pipe with the jack and slips', 'Stesen 2: Turunkan paip dengan jek dan slip'),
    t(`Run ${TARGET} ft of pipe into a dead well, one ${STROKE} ft stroke at a time. At least one set of slips must grip the pipe at every moment. Finish with both sets closed.`, `Turunkan ${TARGET} kaki paip ke dalam telaga mati, satu lejang ${STROKE} kaki pada satu masa. Sekurang-kurangnya satu set slip mesti mencengkam paip pada setiap masa. Tamatkan dengan kedua-dua set tertutup.`)) +
    `<div class="row"><div class="card" style="flex:1;min-width:280px"><svg class="sch" id="sv" viewBox="0 0 430 420" role="img" aria-label="${t('Jack schematic', 'Skematik jek')}"></svg></div>
     <div class="grow card">
       <div class="row"><div class="meter"><label>${t('Pipe run', 'Paip diturunkan')}</label><div class="big"><span id="run">0</span> <span class="unit">/ ${TARGET} ft</span></div></div>
       <div class="meter"><label>${t('Load carried by', 'Beban ditanggung oleh')}</label><div class="big" id="load" style="font-size:20px"></div></div></div>
       <h2>${t('Jack operator console', 'Konsol operator jek')}</h2>
       <div class="btns"><button id="ts"></button><button id="ss"></button></div>
       <div class="btns"><button id="dn" class="primary">${t('Jack down one stroke', 'Jek turun satu lejang')}</button><button id="up">${t('Jack up one stroke', 'Jek naik satu lejang')}</button><button id="rs">${t('Reset', 'Set semula')}</button></div>
       <div class="msg" id="m" aria-live="polite"></div>
       <dl class="kv" style="margin-top:12px"><dt>${t('Strokes', 'Lejang')}</dt><dd id="st">0</dd><dt>${t('Errors', 'Kesilapan')}</dt><dd id="vi">0</dd></dl>
     </div></div>` + note();
  const say = (cls, txt) => { const m = $('#m'); m.className = 'msg ' + cls; m.textContent = txt; };
  const draw = () => {
    const headY = 300 - 40 - S.jack * 16, drop = S.dropped ? 60 : 0;
    const slip = (y, closed, label) => `<rect x="${closed ? 128 : 108}" y="${y}" width="34" height="22" rx="3" fill="${closed ? '#00b18c' : '#f4a03a'}"/><rect x="${closed ? 178 : 198}" y="${y}" width="34" height="22" rx="3" fill="${closed ? '#00b18c' : '#f4a03a'}"/><text x="238" y="${y + 16}">${label}: ${closed ? t('CLOSED', 'TUTUP') : t('OPEN', 'BUKA')}</text>`;
    let ticks = '';
    for (let k = -2; k < 6; k++) { const y = 20 + (((S.run * 16 + k * 160) % 480) + 480) % 480 + drop; if (y < 410) ticks += `<rect x="158" y="${y}" width="24" height="10" fill="#9bb4bb"/>`; }
    $('#sv').innerHTML = `<rect x="60" y="322" width="220" height="16" fill="#5b6770"/><rect x="120" y="338" width="100" height="70" fill="#23404a" stroke="#9bb4bb"/><text x="170" y="378" text-anchor="middle">BOP</text>
      <rect x="92" y="${headY + 22}" width="14" height="${300 - headY - 22}" fill="#b9bec5"/><rect x="234" y="${headY + 22}" width="14" height="${300 - headY - 22}" fill="#b9bec5"/>
      <rect x="84" y="${headY + 22}" width="172" height="8" fill="#eaf4f3"/>
      <rect x="163" y="${drop}" width="14" height="420" fill="#eaf4f3" stroke="#0b2027"/>${ticks}
      ${slip(headY, S.ts, t('Travelling', 'Bergerak'))}${slip(300, S.ss, t('Stationary', 'Pegun'))}
      <text x="10" y="${headY + 14}">${t('Jack head', 'Kepala jek')}</text>`;
    $('#run').textContent = fmt(S.run); $('#st').textContent = S.strokes; $('#vi').textContent = S.viol;
    $('#ts').textContent = S.ts ? t('Open travelling slips', 'Buka slip bergerak') : t('Close travelling slips', 'Tutup slip bergerak');
    $('#ss').textContent = S.ss ? t('Open stationary slips', 'Buka slip pegun') : t('Close stationary slips', 'Tutup slip pegun');
    $('#load').textContent = S.dropped ? t('Nothing', 'Tiada') : S.ts && S.ss ? t('Both slips', 'Kedua-dua slip') : S.ts ? t('Travelling slips', 'Slip bergerak') : t('Stationary slips', 'Slip pegun');
    $$('#ts,#ss,#dn,#up').forEach((b) => { b.disabled = S.dropped || S.done || S.busy; });
  };
  const finish = () => {
    if (S.run >= TARGET && S.ts && S.ss && !S.done) { S.done = true; const sc = Math.max(40, 100 - 20 * S.viol); setScore('jack', sc); say('ok', t(`Pipe landed at ${TARGET} ft with both slips set. Score ${sc}%.`, `Paip sampai ${TARGET} kaki dengan kedua-dua slip dicengkam. Markah ${sc}%.`)); }
  };
  const toggle = (k) => {
    const other = k === 'ts' ? 'ss' : 'ts';
    if (S[k] && !S[other]) { S[k] = false; S.dropped = true; setScore('jack', 0); draw(); return say('bad', t('Both sets of slips are open. The string has dropped into the well. Never open both sets at once. Reset and try again.', 'Kedua-dua set slip terbuka. Rentetan telah jatuh ke dalam telaga. Jangan sekali-kali membuka kedua-dua set serentak. Set semula dan cuba lagi.')); }
    S[k] = !S[k]; say('', S[k] ? t('Slips closed and gripping.', 'Slip ditutup dan mencengkam.') : t('Slips open. The other set is carrying the load.', 'Slip dibuka. Set satu lagi menanggung beban.')); draw(); finish();
  };
  const move = (dir) => {
    const to = S.jack + dir * STROKE;
    if (to < 0 || to > STROKE) return say('warnm', dir < 0 ? t('The jack is already fully retracted. Raise it first.', 'Jek sudah ditarik balik sepenuhnya. Naikkan dahulu.') : t('The jack is already fully extended.', 'Jek sudah dipanjangkan sepenuhnya.'));
    if (S.ts && S.ss) { S.viol++; draw(); return say('bad', t('Both slips are gripping, so the jack is pushing against the stationary slips. Open one set before moving the jack.', 'Kedua-dua slip mencengkam, maka jek menolak melawan slip pegun. Buka satu set sebelum menggerakkan jek.')); }
    const carries = S.ts; if (carries && dir > 0 && S.run < TARGET) { S.viol++; say('warnm', t('You are pulling pipe back out. The task is to run in.', 'Anda sedang menarik paip keluar. Tugasnya ialah menurunkan paip.')); } else say('', carries ? t('Pipe moving with the jack.', 'Paip bergerak bersama jek.') : t('Jack repositioning without the pipe.', 'Jek diposisikan semula tanpa paip.'));
    S.busy = true; S.strokes++; const j0 = S.jack, r0 = S.run, t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 700;
    const step = (now) => { const p = Math.min(1, (now - t0) / dur); S.jack = j0 + dir * STROKE * p; if (carries) S.run = Math.max(0, r0 - dir * STROKE * p); draw(); if (p < 1) anim = requestAnimationFrame(step); else { S.jack = to; if (carries) S.run = Math.max(0, r0 - dir * STROKE); S.busy = false; draw(); } };
    anim = requestAnimationFrame(step);
  };
  let anim = 0;
  $('#ts').onclick = () => toggle('ts'); $('#ss').onclick = () => toggle('ss'); $('#dn').onclick = () => move(-1); $('#up').onclick = () => move(1); $('#rs').onclick = () => go('jack');
  draw(); say('', t('Start: jack extended, both slips closed. Decide which set to open first.', 'Mula: jek dipanjangkan, kedua-dua slip tertutup. Tentukan set mana dibuka dahulu.'));
  return () => cancelAnimationFrame(anim);
}

/* ---------------------------------------------------------------- 3. Pre-shift inspection */
function inspect(root) {
  const defs = [
    [t('Accumulator pressure', 'Tekanan akumulator'), '3,000 psi', '2,350 psi', t('Should be about 3,000 psi when charged.', 'Sepatutnya kira-kira 3,000 psi apabila dicas.')],
    [t('Manifold pressure', 'Tekanan manifold'), '1,500 psi', '900 psi', t('Rams and valves need about 1,500 psi.', 'Ram dan injap memerlukan kira-kira 1,500 psi.')],
    [t('Annular pressure', 'Tekanan annular'), '900 psi', '2,200 psi', t('Regulated between 500 and 1,500 psi.', 'Dilaras antara 500 dan 1,500 psi.')],
    [t('Bottle nitrogen pre-charge (last check)', 'Pra-cas nitrogen botol (semakan terakhir)'), '1,000 psi', '550 psi', t('Pre-charge should be about 1,000 psi.', 'Pra-cas sepatutnya kira-kira 1,000 psi.')],
    [t('Reservoir fluid level', 'Paras bendalir takungan'), t('In the normal band', 'Dalam julat normal'), t('Below the minimum mark', 'Di bawah tanda minimum'), t('Low fluid means the bottles cannot be recharged.', 'Bendalir rendah bermakna botol tidak dapat dicas semula.')],
    [t('Electric pump selector', 'Pemilih pam elektrik'), 'AUTO', 'OFF', t('Pumps must be left on automatic.', 'Pam mesti dibiarkan pada automatik.')],
    [t('Air supply to pneumatic pump', 'Bekalan udara ke pam pneumatik'), t('Open, 110 psi', 'Terbuka, 110 psi'), t('Isolated', 'Diasingkan'), t('The second pump has no power source.', 'Pam kedua tiada sumber kuasa.')],
    [t('Pipe ram control valve handle', 'Pemegang injap kawalan pipe ram'), t('OPEN position', 'Kedudukan BUKA'), t('Centre (neutral)', 'Tengah (neutral)'), t('Handles are open or closed, never in the centre.', 'Pemegang terbuka atau tertutup, bukan di tengah.')],
    [t('Remote BOP panel lamps', 'Lampu panel BOP jauh'), t('All lit and matching', 'Semua menyala dan sepadan'), t('No lamps lit', 'Tiada lampu menyala'), t('A dead remote panel cannot close the well from the basket.', 'Panel jauh yang mati tidak dapat menutup telaga dari bakul.')],
    [t('Hand tools in the work basket', 'Perkakas tangan di bakul kerja'), t('All on lanyards', 'Semua bertali keselamatan'), t('Hammer loose on the handrail', 'Tukul terbiar di susur tangan'), t('DROPS: tools at height are tethered.', 'DROPS: perkakas di tempat tinggi ditambat.')],
    [t('BOP pressure test chart', 'Carta ujian tekanan BOP'), t('Signed by tester and company rep', 'Ditandatangani penguji dan wakil syarikat'), t('Not signed by the witness', 'Tidak ditandatangani saksi'), t('An unsigned chart is not an accepted test.', 'Carta tanpa tandatangan bukan ujian yang diterima.')],
    [t('Lifting sub certificate', 'Sijil lifting sub'), t('Valid, colour code current', 'Sah, kod warna terkini'), t('Expired last month', 'Tamat tempoh bulan lepas'), t('No valid certificate, no lift.', 'Tiada sijil sah, tiada angkatan.')],
    [t('Hydraulic hose at the jack', 'Hos hidraulik di jek'), t('Dry, no chafing', 'Kering, tiada geseran'), t('Weeping oil at the fitting', 'Minyak meleleh di penyambung'), t('A weeping hose can fail under pressure.', 'Hos yang meleleh boleh gagal di bawah tekanan.')],
    [t('Escape route from the basket', 'Laluan kecemasan dari bakul'), t('Clear', 'Tiada halangan'), t('Blocked by a pipe bundle', 'Dihalang oleh ikatan paip'), t('Escape routes are kept clear at all times.', 'Laluan kecemasan dikekalkan tanpa halangan pada setiap masa.')],
  ];
  const nFault = ri(4, 6), faulty = new Set(shuffle(defs.map((_, i) => i)).slice(0, nFault));
  const items = shuffle(defs.map((d, i) => ({ label: d[0], val: faulty.has(i) ? d[2] : d[1], fault: faulty.has(i), why: d[3], pick: null }))).slice(0, 12);
  root.innerHTML = head(t('Applies Level 1 · Modules 7, 8 and 10', 'Aplikasi Tahap 1 · Modul 7, 8 dan 10'), t('Station 3: Pre-shift inspection', 'Stesen 3: Pemeriksaan pra-syif'),
    t('Walk the checklist before taking over the shift. Mark each reading as acceptable or as a defect to report, then submit.', 'Semak senarai sebelum mengambil alih syif. Tandakan setiap bacaan sebagai boleh diterima atau sebagai kecacatan untuk dilaporkan, kemudian hantar.')) +
    `<div class="grid" id="g"></div><div class="btns"><button class="primary" id="sub">${t('Submit inspection', 'Hantar pemeriksaan')}</button><button id="rs">${t('New inspection', 'Pemeriksaan baharu')}</button></div><div class="msg" id="m" aria-live="polite"></div>` + note();
  $('#g').innerHTML = items.map((it, i) => `<div class="card item" data-i="${i}"><b>${it.label}</b><span class="val">${it.val}</span><div class="seg"><button data-p="ok">${t('Acceptable', 'Boleh diterima')}</button><button data-p="def" class="def">${t('Defect', 'Kecacatan')}</button></div><small class="why" hidden>${it.why}</small></div>`).join('');
  $('#g').onclick = (e) => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; const card = b.closest('.item'); items[+card.dataset.i].pick = b.dataset.p; $$('button', card).forEach((x) => x.classList.toggle('on', x === b)); };
  $('#rs').onclick = () => go('inspect');
  $('#sub').onclick = () => {
    if (items.some((x) => !x.pick)) { const m = $('#m'); m.className = 'msg warnm'; return void (m.textContent = t('Mark every item before submitting.', 'Tandakan setiap item sebelum menghantar.')); }
    let ok = 0, missed = 0;
    items.forEach((it, i) => { const right = (it.pick === 'def') === it.fault; if (right) ok++; else if (it.fault) missed++; const card = $(`.item[data-i="${i}"]`); card.classList.add(right ? 'right' : 'wrong'); $('.why', card).hidden = false; $$('button', card).forEach((b) => { b.disabled = true; }); });
    $('#sub').disabled = true; const sc = (ok / items.length) * 100; setScore('inspect', sc);
    const m = $('#m'); m.className = 'msg ' + (missed ? 'bad' : 'ok'); m.textContent = t(`${ok} of ${items.length} correct. Defects missed: ${missed}. A missed defect matters more than a false alarm.`, `${ok} daripada ${items.length} betul. Kecacatan terlepas: ${missed}. Kecacatan yang terlepas lebih serius daripada amaran palsu.`);
  };
}

/* ---------------------------------------------------------------- 4. Pressure calculations */
function calc(root) {
  const q = [];
  { const d = ri(8.6, 11.5, 0.1), tvd = ri(5000, 11000, 500), md = tvd + ri(300, 1500, 100); const a = 0.052 * d * tvd;
    q.push({ text: t(`Brine of ${d.toFixed(1)} ppg fills a well. TVD is ${fmt(tvd)} ft and MD is ${fmt(md)} ft. What is the hydrostatic pressure at bottom?`, `Air garam ${d.toFixed(1)} ppg memenuhi telaga. TVD ialah ${fmt(tvd)} kaki dan MD ialah ${fmt(md)} kaki. Berapakah tekanan hidrostatik di dasar?`), a, unit: 'psi', tol: a * 0.01, work: `0.052 x ${d.toFixed(1)} x ${fmt(tvd)} = ${fmt(a)} psi (${t('TVD, not MD', 'TVD, bukan MD')})` }); }
  { const d = ri(8.4, 12.5, 0.1), a = 0.052 * d;
    q.push({ text: t(`What is the pressure gradient of a ${d.toFixed(1)} ppg fluid?`, `Berapakah kecerunan tekanan bendalir ${d.toFixed(1)} ppg?`), a, unit: 'psi/ft', tol: 0.004, dp: 3, work: `0.052 x ${d.toFixed(1)} = ${a.toFixed(3)} psi/ft` }); }
  { const h1 = ri(2000, 4000, 500), h2 = ri(2000, 4000, 500), d1 = ri(6.8, 7.4, 0.1), d2 = ri(8.5, 9.6, 0.1), s = ri(600, 1800, 100); const p1 = 0.052 * d1 * h1, p2 = 0.052 * d2 * h2, a = s + p1 + p2;
    q.push({ text: t(`A shut-in tubing holds ${fmt(h1)} ft of ${d1.toFixed(1)} ppg oil above ${fmt(h2)} ft of ${d2.toFixed(1)} ppg brine. The surface gauge reads ${fmt(s)} psi. What is the bottom hole pressure?`, `Tubing tertutup mengandungi ${fmt(h1)} kaki minyak ${d1.toFixed(1)} ppg di atas ${fmt(h2)} kaki air garam ${d2.toFixed(1)} ppg. Tolok permukaan menunjukkan ${fmt(s)} psi. Berapakah tekanan dasar lubang?`), a, unit: 'psi', tol: a * 0.01, work: `${fmt(s)} + ${fmt(p1)} + ${fmt(p2)} = ${fmt(a)} psi` }); }
  { const g = ri(0.45, 0.6, 0.01), tvd = ri(8000, 12000, 1000), a = (g - 0.1) * tvd;
    q.push({ text: t(`A gas well is shut in. Formation gradient is ${g.toFixed(2)} psi/ft at ${fmt(tvd)} ft TVD and the well is full of gas at 0.10 psi/ft. What pressure reaches the surface?`, `Sebuah telaga gas ditutup. Kecerunan formasi ialah ${g.toFixed(2)} psi/kaki pada TVD ${fmt(tvd)} kaki dan telaga penuh gas pada 0.10 psi/kaki. Berapakah tekanan yang sampai ke permukaan?`), a, unit: 'psi', tol: a * 0.01, work: `${fmt(g * tvd)} - ${fmt(0.1 * tvd)} = ${fmt(a)} psi` }); }
  { const pf = ri(3500, 6000, 50), tvd = ri(7000, 11000, 500), exact = (pf + 200) / (0.052 * tvd), a = Math.ceil(exact * 10 - 1e-9) / 10;
    q.push({ text: t(`Formation pressure is ${fmt(pf)} psi at ${fmt(tvd)} ft TVD. What kill fluid density gives 200 psi overbalance? Round as you would on site, to 0.1 ppg.`, `Tekanan formasi ialah ${fmt(pf)} psi pada TVD ${fmt(tvd)} kaki. Berapakah ketumpatan bendalir kill yang memberi lebih imbang 200 psi? Bundarkan seperti di lokasi, kepada 0.1 ppg.`), a, unit: 'ppg', tol: 0.051, dp: 1, lo: exact, work: `${fmt(pf + 200)} / (0.052 x ${fmt(tvd)}) = ${exact.toFixed(2)}, ${t('round up to', 'bundar ke atas kepada')} ${a.toFixed(1)} ppg` }); }
  root.innerHTML = head(t('Applies Level 1 · Module 12', 'Aplikasi Tahap 1 · Modul 12'), t('Station 4: Pressure calculations', 'Stesen 4: Pengiraan tekanan'),
    t('Five problems with fresh numbers each time. One attempt per problem. A calculator is allowed; the formula sheet is in your Level 1 manual.', 'Lima masalah dengan angka baharu setiap kali. Satu percubaan bagi setiap masalah. Kalkulator dibenarkan; helaian formula ada dalam manual Tahap 1 anda.')) +
    q.map((x, i) => `<div class="card" style="margin-bottom:12px"><label for="a${i}"><b>${i + 1}.</b> ${x.text}</label><div class="btns" style="align-items:center"><input id="a${i}" type="number" step="any" inputmode="decimal" /> <span class="unit">${x.unit}</span><button data-i="${i}" class="primary">${t('Check', 'Semak')}</button></div><div class="msg" id="m${i}" aria-live="polite" hidden></div></div>`).join('') +
    `<div class="btns"><button id="rs">${t('New set of problems', 'Set masalah baharu')}</button></div>` + note();
  let ok = 0, done = 0;
  root.onclick = (e) => {
    const b = e.target.closest('button[data-i]'); if (!b) return; const i = +b.dataset.i, x = q[i], v = parseFloat($(`#a${i}`).value); if (Number.isNaN(v)) return;
    const right = x.lo !== undefined ? v >= x.lo - 1e-6 && v <= x.a + 0.0501 : Math.abs(v - x.a) <= x.tol;
    b.disabled = true; $(`#a${i}`).disabled = true; done++; if (right) ok++;
    const m = $(`#m${i}`); m.hidden = false; m.className = 'msg ' + (right ? 'ok' : 'bad'); m.textContent = (right ? t('Correct. ', 'Betul. ') : t('Not correct. ', 'Tidak betul. ')) + t('Working: ', 'Jalan kerja: ') + x.work;
    if (done === q.length) setScore('calc', (ok / q.length) * 100);
  };
  $('#rs').onclick = () => go('calc');
}

/* ---------------------------------------------------------------- 5. Well kill */
function kill(root) {
  const A = [
    [t('The sliding sleeve above the packer has been opened by slickline. Well data is complete.', 'Sliding sleeve di atas packer telah dibuka oleh slickline. Data telaga lengkap.'), 0, t('A circulation path exists, so circulate.', 'Laluan edaran wujud, maka edarkan.')],
    [t('The sleeve is stuck closed. The tubing is clear and the reservoir takes fluid readily.', 'Sleeve tersekat tertutup. Tubing tidak tersumbat dan reservoir mudah menerima bendalir.'), 1, t('No path to circulate, but fluid can be pushed back into the rock.', 'Tiada laluan edaran, tetapi bendalir boleh ditolak kembali ke batuan.')],
    [t('Sand has covered the perforations. Gas sits at the top of the tubing and nothing can be pumped into the formation.', 'Pasir menutupi perforasi. Gas berada di bahagian atas tubing dan tiada apa boleh dipam ke dalam formasi.'), 2, t('Neither circulating nor injecting is possible, so swap gas for fluid in small steps.', 'Edaran dan suntikan tidak dapat dibuat, maka gantikan gas dengan bendalir sedikit demi sedikit.')],
  ];
  const M = [t('Reverse circulation', 'Edaran songsang'), t('Bullheading', 'Bullheading'), t('Lubricate and bleed', 'Lubricate and bleed')];
  const D = ri(7000, 10000, 500), hg = ri(1500, 3000, 500), og = 0.32, sitp = ri(1800, 2600, 100), cap = 0.0087;
  const pf = sitp + 0.1 * hg + og * (D - hg), exact = (pf + 200) / (0.052 * D), rho = Math.ceil(exact * 10 - 1e-9) / 10, vt = cap * D, limit = sitp + 800;
  root.innerHTML = head(t('Applies Level 1 · Module 13', 'Aplikasi Tahap 1 · Modul 13'), t('Station 5: Kill the well', 'Stesen 5: Matikan telaga'),
    t('Part A: choose the kill method for three wells. Part B: plan and pump a bullhead kill without breaking the pressure limit.', 'Bahagian A: pilih kaedah kill bagi tiga telaga. Bahagian B: rancang dan pam kill bullhead tanpa melanggar had tekanan.')) +
    `<h2>${t('Part A: which method?', 'Bahagian A: kaedah mana?')}</h2><div class="grid">${A.map((a, i) => `<div class="card" data-a="${i}"><span>${a[0]}</span>${M.map((m, k) => `<button class="opt" data-k="${k}">${m}</button>`).join('')}<small class="why" hidden>${a[2]}</small></div>`).join('')}</div>
     <h2>${t('Part B: bullhead kill', 'Bahagian B: kill bullhead')}</h2>
     <div class="row"><div class="card grow"><dl class="kv">
       <dt>${t('Shut-in tubing pressure', 'Tekanan tubing tertutup')}</dt><dd>${fmt(sitp)} psi</dd>
       <dt>${t('Gas column', 'Turus gas')}</dt><dd>0 – ${fmt(hg)} ft, 0.10 psi/ft</dd>
       <dt>${t('Oil column', 'Turus minyak')}</dt><dd>${fmt(hg)} – ${fmt(D)} ft, ${og} psi/ft</dd>
       <dt>${t('Depth of tubing end (TVD = MD)', 'Kedalaman hujung tubing (TVD = MD)')}</dt><dd>${fmt(D)} ft</dd>
       <dt>${t('Tubing capacity', 'Kapasiti tubing')}</dt><dd>${cap} bbl/ft</dd>
       <dt>${t('Overbalance wanted', 'Lebih imbang dikehendaki')}</dt><dd>200 psi</dd>
       <dt>${t('Maximum allowed surface pressure', 'Tekanan permukaan maksimum dibenarkan')}</dt><dd>${fmt(limit)} psi</dd>
       <dt>${t('Minimum rate to stop gas slipping', 'Kadar minimum untuk menghalang gas menyelinap')}</dt><dd>1.5 bbl/min</dd></dl>
       <div class="btns" style="align-items:center"><label for="rho">${t('Your kill fluid density', 'Ketumpatan bendalir kill anda')}</label><input id="rho" type="number" step="0.1" inputmode="decimal" /> <span class="unit">ppg</span><button id="start" class="primary">${t('Mix fluid and line up', 'Bancuh bendalir dan sedia')}</button></div>
       <div class="msg" id="m" aria-live="polite">${t('Work out formation pressure, then the kill density. Enter it to start.', 'Kira tekanan formasi, kemudian ketumpatan kill. Masukkan untuk bermula.')}</div></div>
     <div class="card grow" id="pump" hidden>
       <div class="row"><div class="meter"><label>${t('Pump pressure', 'Tekanan pam')}</label><div class="big"><span id="pp">0</span> <span class="unit">psi</span></div></div>
       <div class="meter"><label>${t('Volume pumped', 'Isipadu dipam')}</label><div class="big"><span id="vol">0.0</span> <span class="unit">bbl</span></div></div>
       <div class="meter"><label>${t('Limit', 'Had')}</label><div class="big">${fmt(limit)} <span class="unit">psi</span></div></div></div>
       <canvas class="plot" id="plot" width="600" height="220" role="img" aria-label="${t('Pump pressure against volume pumped', 'Tekanan pam berbanding isipadu dipam')}"></canvas>
       <label for="rate">${t('Pump rate', 'Kadar pam')}: <b id="rv">0.0</b> bbl/min</label><input id="rate" type="range" min="0" max="5" step="0.5" value="0" />
       <div class="btns"><button id="dead" class="warn">${t('Stop pump and declare the well dead', 'Henti pam dan isytihar telaga mati')}</button><button id="rs">${t('New well', 'Telaga baharu')}</button></div>
     </div></div>` + note();
  let aOk = 0, aDone = 0, bScore = null;
  const total = () => { if (aDone === 3 && bScore !== null) setScore('kill', (aOk / 3) * 40 + bScore * 0.6); };
  $$('[data-a]').forEach((card) => { card.onclick = (e) => { const b = e.target.closest('.opt'); if (!b || card.dataset.done) return; card.dataset.done = 1; const a = A[+card.dataset.a], k = +b.dataset.k; if (k === a[1]) aOk++; aDone++; $$('.opt', card).forEach((o, i) => { o.disabled = true; if (i === a[1]) o.classList.add('right'); else if (o === b) o.classList.add('wrong'); }); $('.why', card).hidden = false; total(); }; });
  let V = 0, user = 0, over = false, slipped = false, timer = 0; const pts = [];
  const hp = (z) => { const zz = Math.min(z, D), g = Math.min(hg, D - zz), o = Math.max(0, D - zz - hg); return 0.052 * user * zz + 0.1 * g + og * o; };
  const plot = (p) => { const c = $('#plot'), x = c.getContext('2d'), W = c.width, H = c.height, vmax = vt * 1.4, pmax = limit * 1.25; x.clearRect(0, 0, W, H); x.strokeStyle = '#ff6b5e'; x.setLineDash([6, 5]); x.beginPath(); const ly = H - (limit / pmax) * H; x.moveTo(0, ly); x.lineTo(W, ly); x.stroke(); x.setLineDash([]); x.strokeStyle = '#35525a'; x.beginPath(); const vx = (vt / vmax) * W; x.moveTo(vx, 0); x.lineTo(vx, H); x.stroke(); x.fillStyle = '#9bb4bb'; x.font = '12px sans-serif'; x.fillText(t('limit', 'had'), 6, ly - 5); x.fillText(t('tubing volume', 'isipadu tubing'), vx + 5, 14); x.strokeStyle = '#5fe0a8'; x.lineWidth = 2; x.beginPath(); pts.forEach(([v, q], i) => { const px = (v / vmax) * W, py = H - (Math.min(q, pmax) / pmax) * H; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.lineWidth = 1; if (p !== undefined) pts.push(p); };
  const tick = () => {
    const rate = +$('#rate').value; $('#rv').textContent = rate.toFixed(1);
    const eff = rate > 0 && rate < 1.5 ? 0.45 : 1; if (rate > 0 && rate < 1.5) slipped = true;
    V += rate * 0.4 * eff; const stat = pf - hp(V / cap), p = Math.max(0, stat) + 250 * rate;
    $('#pp').textContent = fmt(p); $('#vol').textContent = V.toFixed(1); plot([V, p]);
    const m = $('#m');
    if (p > limit) { over = true; clearInterval(timer); bScore = 0; total(); $('#rate').disabled = true; $('#dead').disabled = true; m.className = 'msg bad'; m.textContent = t('Pressure limit exceeded. On a real well this could burst the tubing or fracture the formation. Start again with a new well.', 'Had tekanan dilanggar. Pada telaga sebenar ini boleh memecahkan tubing atau merekahkan formasi. Mula semula dengan telaga baharu.'); }
    else if (rate > 0 && rate < 1.5) { m.className = 'msg warnm'; m.textContent = t('Rate too low: gas is slipping up past the kill fluid.', 'Kadar terlalu rendah: gas menyelinap naik melepasi bendalir kill.'); }
    else if (rate > 0) { m.className = 'msg'; m.textContent = t('Pumping. Watch the pressure fall as heavy fluid fills the tubing; you can raise the rate as it falls.', 'Sedang mengepam. Perhatikan tekanan menurun apabila bendalir berat memenuhi tubing; kadar boleh dinaikkan apabila tekanan menurun.'); }
  };
  $('#start').onclick = () => { user = parseFloat($('#rho').value); if (Number.isNaN(user) || user < 6 || user > 20) return; $('#rho').disabled = true; $('#start').disabled = true; $('#pump').hidden = false; plot(); timer = setInterval(tick, 200); const m = $('#m'); m.className = 'msg'; m.textContent = t('Fluid mixed. Open the pump slowly: pump pressure adds to shut-in pressure.', 'Bendalir dibancuh. Buka pam perlahan-lahan: tekanan pam ditambah kepada tekanan tertutup.'); };
  $('#rs').onclick = () => go('kill');
  $('#dead').onclick = () => {
    if (over) return; clearInterval(timer); $('#rate').value = 0; $('#rate').disabled = true; $('#dead').disabled = true;
    const stat = pf - hp(V / cap), densOk = user >= exact - 1e-6 && user <= rho + 0.0501, tooHeavy = user > rho + 0.0501, dead = stat <= 0, full = V >= vt;
    let sc = 0; const why = [];
    if (densOk) sc += 30; else why.push(tooHeavy ? t(`Density too high: ${rho.toFixed(1)} ppg was enough. Extra weight risks losses.`, `Ketumpatan terlalu tinggi: ${rho.toFixed(1)} ppg sudah memadai. Berat berlebihan berisiko kehilangan bendalir.`) : t(`Density too low: ${rho.toFixed(1)} ppg was needed (${fmt(pf)} psi formation pressure + 200 psi).`, `Ketumpatan terlalu rendah: ${rho.toFixed(1)} ppg diperlukan (tekanan formasi ${fmt(pf)} psi + 200 psi).`));
    sc += 30;
    if (dead && full) sc += 40; else why.push(!full ? t(`Only ${V.toFixed(0)} of ${vt.toFixed(0)} bbl tubing volume pumped.`, `Hanya ${V.toFixed(0)} daripada ${vt.toFixed(0)} bbl isipadu tubing dipam.`) : t(`The well still shows ${fmt(Math.max(0, stat))} psi at surface.`, `Telaga masih menunjukkan ${fmt(Math.max(0, stat))} psi di permukaan.`));
    if (slipped) { sc -= 10; why.push(t('Gas slipped while the rate was below 1.5 bbl/min.', 'Gas menyelinap ketika kadar di bawah 1.5 bbl/min.')); }
    if (dead && full && V < vt * 1.1) why.push(t('Tip: pump 10 to 20 percent more than the tubing volume.', 'Petua: pam 10 hingga 20 peratus lebih daripada isipadu tubing.'));
    bScore = Math.max(0, sc); total(); $('#pp').textContent = fmt(Math.max(0, stat));
    const m = $('#m'); m.className = 'msg ' + (dead && full && densOk ? 'ok' : 'bad'); m.textContent = (dead && full ? t('Pump stopped: surface pressure is zero. Keep monitoring. ', 'Pam dihentikan: tekanan permukaan sifar. Terus memantau. ') : t('The well is not dead. ', 'Telaga belum mati. ')) + why.join(' ') + ' ' + t(`Part B score ${bScore}%.`, `Markah Bahagian B ${bScore}%.`) + (aDone < 3 ? ' ' + t('Answer Part A to record the station score.', 'Jawab Bahagian A untuk merekod markah stesen.') : '');
  };
  return () => clearInterval(timer);
}

/* ---------------------------------------------------------------- 6. Shut-in drill */
function shutin(root) {
  const steps = [
    ['stop', t('Stop the jack', 'Hentikan jek')], ['slips', t('Set both slips', 'Cengkam kedua-dua slip')], ['valve', t('Stab and close the safety valve on the string', 'Pasang dan tutup injap keselamatan pada rentetan')], ['bop', t('Close the annular BOP', 'Tutup BOP annular')],
    ['record', t('Record shut-in pressure and pit gain', 'Rekod tekanan tertutup dan tambahan pit')], ['tell', t('Inform the supervisor and company representative', 'Maklumkan penyelia dan wakil syarikat')],
  ];
  const wrong = [['pull', t('Keep pulling to finish the joint', 'Terus menarik untuk menghabiskan batang paip')], ['choke', t('Open the choke fully to relieve the well', 'Buka choke sepenuhnya untuk melegakan telaga')]];
  root.innerHTML = head(t('Applies Level 1 · Modules 8 and 13', 'Aplikasi Tahap 1 · Modul 8 dan 13'), t('Station 6: Shut-in drill', 'Stesen 6: Latih amal menutup telaga'),
    t('You are pulling pipe from a dead well. Watch the indicators. If the well starts to flow, shut it in with the right actions in the right order, as fast as you can.', 'Anda sedang mencabut paip dari telaga mati. Perhatikan penunjuk. Jika telaga mula mengalir, tutup telaga dengan tindakan yang betul mengikut urutan yang betul, secepat mungkin.')) +
    `<div class="row"><div class="card grow">
       <div class="row"><div class="meter"><label>${t('Pit gain', 'Tambahan pit')}</label><div class="big"><span id="gain">0.0</span> <span class="unit">bbl</span></div></div>
       <div class="meter"><label>${t('Shut-in pressure', 'Tekanan tertutup')}</label><div class="big"><span id="sip">0</span> <span class="unit">psi</span></div></div></div>
       <p><span class="lamp" id="l1"></span>${t('Flow from the well with pumps off', 'Aliran dari telaga ketika pam dimatikan')}</p>
       <p><span class="lamp" id="l2"></span>${t('Hole taking less fluid than the steel pulled', 'Lubang menerima kurang bendalir berbanding keluli dicabut')}</p>
       <p><span class="lamp g" id="l3"></span><span id="status">${t('Jack running: pulling out of hole', 'Jek berjalan: mencabut paip')}</span></p>
       <div class="btns"><button id="go" class="primary">${t('Start the drill', 'Mulakan latih amal')}</button><button id="fc" disabled>${t('Flow check', 'Semakan aliran')}</button><button id="rs">${t('Reset', 'Set semula')}</button></div>
       <div class="msg" id="m" aria-live="assertive">${t('Press start, then stay alert.', 'Tekan mula, kemudian kekal berwaspada.')}</div></div>
     <div class="card grow"><h2 style="margin-top:0">${t('Actions', 'Tindakan')}</h2><div id="acts">${shuffle([...steps, ...wrong]).map(([k, l]) => `<button class="opt" data-k="${k}" disabled>${l}</button>`).join('')}</div></div></div>` + note();
  let timer = 0, tSec = 0, influxAt = rnd(6, 16), influx = false, gain = 0, next = 0, errs = 0, closedAt = null, over = false; const did = new Set();
  const say = (cls, txt) => { const m = $('#m'); m.className = 'msg ' + cls; m.textContent = txt; };
  const end = () => { over = true; clearInterval(timer); $$('#acts button,#fc').forEach((b) => { b.disabled = true; }); let sc = 100 - errs * 15; if (closedAt > 20) sc -= 25; else if (closedAt > 10) sc -= 10; sc = Math.max(0, sc); setScore('shutin', sc); say(sc >= PASS ? 'ok' : 'bad', t(`Well shut in with ${closedAt.toFixed(1)} bbl gained and ${errs} wrong action(s). Score ${sc}%. A smaller gain means lower pressures to handle later.`, `Telaga ditutup dengan tambahan ${closedAt.toFixed(1)} bbl dan ${errs} tindakan salah. Markah ${sc}%. Tambahan yang kecil bermakna tekanan lebih rendah untuk dikendalikan kemudian.`)); };
  $('#go').onclick = () => { $('#go').disabled = true; $$('#acts button,#fc').forEach((b) => { b.disabled = false; }); say('', t('Pulling pipe. Indicators normal.', 'Mencabut paip. Penunjuk normal.'));
    timer = setInterval(() => { tSec += 0.25; if (!influx && tSec >= influxAt) { influx = true; $('#l1').classList.add('on'); $('#l2').classList.add('on'); }
      if (influx && closedAt === null) { gain += 0.25 * 0.9; $('#gain').textContent = gain.toFixed(1); if (gain > 45) { clearInterval(timer); over = true; setScore('shutin', 0); $$('#acts button,#fc').forEach((b) => { b.disabled = true; }); say('bad', t('The gain was not controlled in time. Reset and watch the indicators more closely.', 'Tambahan tidak dikawal tepat pada masanya. Set semula dan perhatikan penunjuk dengan lebih teliti.')); } }
      if (closedAt !== null) { const target = 250 + closedAt * 22, cur = +$('#sip').dataset.v || 0, nv = cur + (target - cur) * 0.2; $('#sip').dataset.v = nv; $('#sip').textContent = fmt(nv); }
    }, 250); };
  $('#fc').onclick = () => say(influx ? 'bad' : '', influx ? t('The well is flowing with the pumps off. Shut in now.', 'Telaga mengalir ketika pam dimatikan. Tutup telaga sekarang.') : t('No flow. Continue, and keep watching.', 'Tiada aliran. Teruskan, dan terus memerhati.'));
  $('#acts').onclick = (e) => { const b = e.target.closest('button'); if (!b || b.disabled || over) return; const k = b.dataset.k;
    if (!influx) return say('warnm', t('No warning sign yet. A precautionary shut-in is never wrong on site, but in this drill wait for the indicators or do a flow check.', 'Belum ada tanda amaran. Menutup telaga sebagai langkah berjaga-jaga tidak pernah salah di lokasi, tetapi dalam latih amal ini tunggu penunjuk atau buat semakan aliran.'));
    if (k === 'pull' || k === 'choke') { errs++; b.classList.add('wrong'); b.disabled = true; return say('bad', k === 'pull' ? t('Wrong. Every second of pulling lets more influx in.', 'Salah. Setiap saat menarik membenarkan lebih banyak aliran masuk.') : t('Wrong. Opening the choke lets the well flow harder.', 'Salah. Membuka choke membuatkan telaga mengalir lebih kuat.')); }
    const idx = steps.findIndex((s) => s[0] === k), inOrder = idx < 4 ? idx === next : next >= 4;
    if (!inOrder) { errs++; return say('bad', t('Not yet. Think about what must be secured first.', 'Belum lagi. Fikirkan apa yang mesti diamankan dahulu.')); }
    b.classList.add('right'); b.disabled = true; did.add(k); if (idx < 4) next++;
    if (k === 'stop') { $('#l3').classList.remove('g'); $('#status').textContent = t('Jack stopped', 'Jek dihentikan'); }
    if (k === 'bop') { closedAt = gain; $('#status').textContent = t('Well shut in', 'Telaga ditutup'); }
    say('ok', t('Done.', 'Selesai.')); if (did.size === steps.length) end(); };
  $('#rs').onclick = () => go('shutin');
  return () => clearInterval(timer);
}

/* ---------------------------------------------------------------- 7. Unit selection */
function select(root) {
  const U = [150, 225, 340, 460, 600], B = [5000, 10000, 15000];
  const sc = [0, 1, 2].map(() => { const w = ri(90, 440, 10), masp = ri(1500, 9000, 500), need = w * 1.25; return { w, masp, need, u: U.find((x) => x >= need), b: B.find((x) => x > masp) }; });
  root.innerHTML = head(t('Applies Level 1 · Modules 5 and 15', 'Aplikasi Tahap 1 · Modul 5 dan 15'), t('Station 7: Select the unit', 'Stesen 7: Pilih unit'),
    t('For each job choose the smallest unit class and BOP rating that are still safe. Allow a 25 percent pull margin over the heaviest string weight. The BOP rating must be higher than the maximum expected surface pressure.', 'Bagi setiap kerja, pilih kelas unit dan kadar BOP terkecil yang masih selamat. Benarkan margin tarikan 25 peratus melebihi berat rentetan terberat. Kadar BOP mesti lebih tinggi daripada tekanan permukaan maksimum dijangka.')) +
    `<div class="grid">${sc.map((s, i) => `<div class="card" data-s="${i}"><b>${t('Job', 'Kerja')} ${i + 1}</b><dl class="kv" style="margin:10px 0"><dt>${t('Heaviest string', 'Rentetan terberat')}</dt><dd>${fmt(s.w * 1000)} lb</dd><dt>${t('Max surface pressure', 'Tekanan permukaan maks')}</dt><dd>${fmt(s.masp)} psi</dd></dl>
      <label>${t('Unit class', 'Kelas unit')}<br><select class="u"><option value="">–</option>${U.map((x) => `<option value="${x}">${x}K</option>`).join('')}</select></label><br><br>
      <label>${t('BOP rating', 'Kadar BOP')}<br><select class="b"><option value="">–</option>${B.map((x) => `<option value="${x}">${fmt(x)} psi</option>`).join('')}</select></label><small class="why" hidden></small></div>`).join('')}</div>
     <div class="btns"><button class="primary" id="sub">${t('Submit selections', 'Hantar pilihan')}</button><button id="rs">${t('New jobs', 'Kerja baharu')}</button></div><div class="msg" id="m" aria-live="polite"></div>` + note();
  $('#rs').onclick = () => go('select');
  $('#sub').onclick = () => {
    const cards = $$('[data-s]'); if (cards.some((c) => !$('.u', c).value || !$('.b', c).value)) { const m = $('#m'); m.className = 'msg warnm'; return void (m.textContent = t('Choose a unit and a BOP rating for every job.', 'Pilih unit dan kadar BOP bagi setiap kerja.')); }
    let pts = 0, unsafe = 0;
    cards.forEach((c, i) => { const s = sc[i], u = +$('.u', c).value, b = +$('.b', c).value; if (u === s.u) pts++; if (b === s.b) pts++; if (u < s.need || b <= s.masp) unsafe++; c.classList.add('item', u === s.u && b === s.b ? 'right' : 'wrong'); $$('select', c).forEach((x) => { x.disabled = true; });
      const w = $('.why', c); w.hidden = false; w.textContent = t(`Needed pull ${fmt(s.need * 1000)} lb: ${s.u}K. BOP above ${fmt(s.masp)} psi: ${fmt(s.b)} psi.`, `Tarikan diperlukan ${fmt(s.need * 1000)} lb: ${s.u}K. BOP melebihi ${fmt(s.masp)} psi: ${fmt(s.b)} psi.`) + (u > s.u || b > s.b ? ' ' + t('Bigger than needed costs more and loads the platform more.', 'Lebih besar daripada perlu menelan kos lebih dan membebankan pelantar.') : ''); });
    $('#sub').disabled = true; const pct = (pts / 6) * 100 - unsafe * 10; setScore('select', pct);
    const m = $('#m'); m.className = 'msg ' + (unsafe ? 'bad' : 'ok'); m.textContent = t(`${pts} of 6 choices correct. Unsafe selections: ${unsafe}.`, `${pts} daripada 6 pilihan betul. Pilihan tidak selamat: ${unsafe}.`);
  };
}

/* ---------------------------------------------------------------- Results */
function results(root) {
  const rows = STATIONS.filter((s) => s.id !== 'results');
  const tot = rows.reduce((a, s) => a + (scores[s.id] ?? 0), 0) / rows.length, done = rows.filter((s) => scores[s.id] !== undefined).length, pass = done === rows.length && tot >= PASS;
  let name = ''; try { name = localStorage.getItem(KEY + '-name') || ''; } catch { /* ignore */ }
  root.innerHTML = head(t('Level 2 record', 'Rekod Tahap 2'), t('Results', 'Keputusan'), t(`Complete all seven stations. The pass mark is ${PASS} percent overall. Print this page for the assessor to sign.`, `Lengkapkan ketujuh-tujuh stesen. Markah lulus keseluruhan ialah ${PASS} peratus. Cetak halaman ini untuk ditandatangani penilai.`)) +
    `<div class="card"><div class="btns noprint" style="margin:0 0 12px;align-items:center"><label for="nm">${t('Participant name', 'Nama peserta')}</label><input id="nm" type="text" autocomplete="name" /></div>
     <p><b>${t('Participant', 'Peserta')}:</b> <span id="nmv"></span> &nbsp; <b>${t('Date', 'Tarikh')}:</b> ${new Date().toLocaleDateString('en-GB')}</p>
     <table><thead><tr><th>${t('Station', 'Stesen')}</th><th>${t('Level 1 link', 'Kaitan Tahap 1')}</th><th>${t('Score', 'Markah')}</th></tr></thead><tbody>
     ${rows.map((s, i) => `<tr><td>${i + 1}. ${s.title()}</td><td>${s.ref()}</td><td class="n">${scores[s.id] === undefined ? t('Not attempted', 'Belum dicuba') : scores[s.id] + '%'}</td></tr>`).join('')}
     <tr><td><b>${t('Overall', 'Keseluruhan')}</b></td><td>${done} / ${rows.length} ${t('stations', 'stesen')}</td><td class="n">${Math.round(tot)}%</td></tr></tbody></table>
     <div class="msg ${pass ? 'ok' : done === rows.length ? 'bad' : ''}">${pass ? t('PASS. Ready for equipment practice and assessor sign-off.', 'LULUS. Sedia untuk latihan peralatan dan pengesahan penilai.') : done === rows.length ? t('Not yet at the pass mark. Repeat the weakest stations; your latest score is kept.', 'Belum mencapai markah lulus. Ulang stesen paling lemah; markah terkini disimpan.') : t('Stations still to do. Unattempted stations count as zero.', 'Masih ada stesen belum dibuat. Stesen yang belum dicuba dikira sifar.')}</div>
     <p style="margin-top:28px">${t('Assessor name and signature', 'Nama dan tandatangan penilai')}: ______________________________</p>
     <div class="btns"><button class="primary" id="pr">${t('Print record', 'Cetak rekod')}</button><button class="danger" id="cl">${t('Clear all scores', 'Padam semua markah')}</button></div></div>` + note();
  const nm = $('#nm'); nm.value = name; $('#nmv').textContent = name || '________________';
  nm.oninput = () => { $('#nmv').textContent = nm.value || '________________'; try { localStorage.setItem(KEY + '-name', nm.value); } catch { /* ignore */ } };
  $('#pr').onclick = () => window.print();
  let armed = false; $('#cl').onclick = () => { if (!armed) { armed = true; $('#cl').textContent = t('Press again to confirm', 'Tekan sekali lagi untuk sahkan'); return; } scores = {}; save(); nav(); go('results'); };
}

/* ---------------------------------------------------------------- Shell */
const STATIONS = [
  { id: 'ident', title: () => t('Find the equipment', 'Cari peralatan'), ref: () => t('Module 6', 'Modul 6'), mount: ident },
  { id: 'jack', title: () => t('Jack and slips', 'Jek dan slip'), ref: () => t('Modules 6, 10', 'Modul 6, 10'), mount: jack },
  { id: 'inspect', title: () => t('Pre-shift inspection', 'Pemeriksaan pra-syif'), ref: () => t('Modules 7, 8, 10', 'Modul 7, 8, 10'), mount: inspect },
  { id: 'calc', title: () => t('Pressure calculations', 'Pengiraan tekanan'), ref: () => t('Module 12', 'Modul 12'), mount: calc },
  { id: 'kill', title: () => t('Kill the well', 'Matikan telaga'), ref: () => t('Module 13', 'Modul 13'), mount: kill },
  { id: 'shutin', title: () => t('Shut-in drill', 'Latih amal menutup telaga'), ref: () => t('Modules 8, 13', 'Modul 8, 13'), mount: shutin },
  { id: 'select', title: () => t('Select the unit', 'Pilih unit'), ref: () => t('Modules 5, 15', 'Modul 5, 15'), mount: select },
  { id: 'results', title: () => t('Results', 'Keputusan'), ref: () => t('Record', 'Rekod'), mount: results },
];
function nav() {
  $('#stations').innerHTML = STATIONS.map((s, i) => { const sc = scores[s.id], res = s.id === 'results'; return `<button data-id="${s.id}" class="${s.id === current ? 'active' : ''} ${sc !== undefined ? 'done' : ''}" ${s.id === current ? 'aria-current="page"' : ''}><span class="num">${res ? '✓' : i + 1}</span><span>${s.title()}<small>${s.ref()}</small></span><span class="pct ${sc < PASS ? 'low' : ''}">${sc !== undefined ? sc + '%' : ''}</span></button>`; }).join('');
  const rows = STATIONS.filter((s) => s.id !== 'results'), done = rows.filter((s) => scores[s.id] !== undefined).length;
  $('#total').textContent = done ? `${t('Overall', 'Keseluruhan')} ${Math.round(rows.reduce((a, s) => a + (scores[s.id] ?? 0), 0) / rows.length)}%` : '';
}
async function go(id) {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  current = id; nav(); const root = $('#stage'); root.innerHTML = ''; root.onclick = null;
  const c = await STATIONS.find((s) => s.id === id).mount(root); if (current === id) cleanup = typeof c === 'function' ? c : null; else if (typeof c === 'function') c();
  root.scrollTop = 0;
}
$('#stations').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) go(b.dataset.id); });
$$('.lang button').forEach((b) => { b.onclick = () => { lang = +b.dataset.lang; document.documentElement.lang = lang ? 'ms' : 'en'; $$('.lang button').forEach((x) => x.classList.toggle('active', x === b)); $('#brand-sub').textContent = t('HWU LEVEL 2 SIMULATOR', 'SIMULATOR HWU TAHAP 2'); $('#explorer-link').textContent = t('3D Explorer', 'Peneroka 3D'); go(current); }; });
go('ident');

/* ===== ANALITIKA MALAYA — sample political-intelligence dashboard =====
   Marketing showcase. ALL DATA IS ILLUSTRATIVE / SAMPLE. No live sources,
   no real profiling — the ethics line in the footer is the actual product
   stance. Interactions: signal/pin select, region presets, view tabs,
   BM/EN toggle, and a Web3Forms lead-capture on the CTA. */
(function () {
  'use strict';
  var html = document.documentElement;
  function lang() { return html.getAttribute('data-lang') === 'en' ? 'en' : 'bm'; }
  function T(o) { return o[lang()] != null ? o[lang()] : o.bm; }

  // ---- sample narratives (order matches the signal-layer list) ----
  var NARR = [
    { id:'kos', code:'MY·POLICY·0231', dot:'neg', count:24, reach:'24%', mom:'▲ 22%', net:-14, seats:'6',
      against:58, support:42, region:'National',
      title:{en:'Cost of living', bm:'Kos sara hidup'},
      why:{en:'The dominant, sticky narrative — high reach, high persistence, and it moves real votes. Cuts across every coalition and age group.',
           bm:'Naratif dominan dan melekat — jangkauan tinggi, kekal lama, dan ia benar-benar menukar undi. Merentas setiap gabungan dan kumpulan umur.'},
      syor:{en:'ENGAGE with concrete, costed relief. Empathy first, policy second; never dismiss lived cost pressure.',
            bm:'LIBAT dengan bantuan konkrit dan berkos. Empati dahulu, dasar kemudian; jangan sekali-kali menolak tekanan kos yang dirasai.'},
      pin:{x:22.3,y:85,s:22} },
    { id:'pengundi', code:'MY·YOUTH·0188', dot:'neg', count:15, reach:'15%', mom:'▲ 22%', net:-6, seats:'4',
      against:52, support:48, region:'Urban',
      title:{en:'New & young voters', bm:'Pengundi baharu & belia'},
      why:{en:'Fast-rising on TikTok; low party loyalty, high volatility. Turnout — not persuasion — is the deciding variable here.',
           bm:'Meningkat pantas di TikTok; kesetiaan parti rendah, sangat mudah berubah. Kehadiran mengundi — bukan pujukan — pemboleh ubah penentu di sini.'},
      syor:{en:'MOBILISE, don\'t lecture. Meet them on-platform with peers, not press statements.',
            bm:'GERAK, jangan berceramah. Temui mereka atas platform dengan rakan sebaya, bukan kenyataan akhbar.'},
      pin:{x:21.6,y:82.7,s:15} },
    { id:'kemana', code:'JH·COALITION·0142', dot:'neg', count:11, reach:'11%', mom:'▲ 9%', net:-12, seats:'23',
      against:61, support:39, region:'Johor',
      title:{en:'Where do PN votes go? (23 seats, no PN candidate)', bm:'Ke mana undi PN? (23 kerusi tanpa calon PN)'},
      why:{en:'A structural question, not an emotional one: with no PN name on 23 ballots, base votes fragment. Spread via WhatsApp & surau networks.',
           bm:'Persoalan struktur, bukan emosi: tanpa nama PN pada 23 kertas undi, undi teras berpecah. Tersebar melalui WhatsApp & rangkaian surau.'},
      syor:{en:'MODEL the split scenarios per seat; this is where marginal seats are won or lost.',
            bm:'MODELKAN senario pecahan bagi setiap kerusi; di sinilah kerusi majoriti tipis menang atau kalah.'},
      pin:{x:20.3,y:77.8,s:14} },
    { id:'ekonomi', code:'JH·ECON·0119', dot:'neg', count:8, reach:'8%', mom:'▲ 5%', net:-9, seats:'5',
      against:55, support:45, region:'Johor',
      title:{en:'FELDA economy & the second generation', bm:'Ekonomi FELDA & generasi kedua'},
      why:{en:'Deep, localised grievance among FELDA second-gen settlers — smaller reach but very high conversion in the seats it touches.',
           bm:'Rungutan mendalam dan setempat dalam kalangan generasi kedua FELDA — jangkauan kecil tetapi penukaran sangat tinggi di kerusi yang terlibat.'},
      syor:{en:'ENGAGE locally with named commitments; generic national messaging falls flat here.',
            bm:'LIBAT setempat dengan komitmen khusus; mesej nasional umum tidak berkesan di sini.'},
      pin:{x:17.8,y:71.4,s:12} },
    { id:'turnout', code:'JH·TURNOUT·0107', dot:'neg', count:9, reach:'9%', mom:'▲ 7%', net:-8, seats:'—',
      against:54, support:46, region:'Johor',
      title:{en:'Urban turnout & Singapore commuters', bm:'Turnout bandar & pengundi ulang-alik Singapura'},
      why:{en:'The quiet decider: whether commuter and urban voters return to vote. Sentiment is mild; logistics are everything.',
           bm:'Penentu senyap: sama ada pengundi ulang-alik dan bandar pulang mengundi. Sentimen sederhana; logistik segala-galanya.'},
      syor:{en:'MOBILISE #PulangMengundi; focus resources on the return-to-vote journey, not persuasion.',
            bm:'GERAK #PulangMengundi; tumpu sumber pada perjalanan pulang mengundi, bukan pujukan.'},
      pin:{x:23.1,y:81.7,s:13} },
    { id:'khidmat', code:'JH·LOCAL·0096', dot:'neg', count:5, reach:'5%', mom:'▲ 3%', net:-5, seats:'3',
      against:53, support:47, region:'Johor',
      title:{en:'Local services (floods, drainage)', bm:'Perkhidmatan tempatan (banjir, saliran)'},
      why:{en:'Hyper-local and material. Doesn\'t trend nationally, but decides individual town seats after every flood season.',
           bm:'Sangat setempat dan nyata. Tidak hangat di peringkat nasional, tetapi menentukan kerusi bandar kecil selepas setiap musim banjir.'},
      syor:{en:'ENGAGE with visible fixes; receipts beat rhetoric in these wards.',
            bm:'LIBAT dengan penyelesaian nyata; bukti mengatasi retorik di kawasan ini.'},
      pin:{x:18.4,y:80.2,s:10} },
    { id:'mic', code:'JH·SEAT·0071', dot:'mix', count:4, reach:'4%', mom:'▬ 0%', net:2, seats:'2',
      against:47, support:53, region:'Johor',
      title:{en:'Seat swap MIC → UMNO', bm:'Pertukaran kerusi MIC → UMNO'},
      why:{en:'An inside-baseball coalition realignment. Low public heat, but reshapes who owns two specific seats.',
           bm:'Penjajaran semula gabungan dalaman. Kurang hangat di mata umum, tetapi mengubah siapa memiliki dua kerusi tertentu.'},
      syor:{en:'MONITOR base reaction; manage expectations quietly within the coalition.',
            bm:'PANTAU reaksi teras; urus jangkaan secara senyap dalam gabungan.'},
      pin:{x:21.2,y:84.5,s:9} },
    { id:'pas', code:'JH·MACHINE·0063', dot:'mix', count:3, reach:'3%', mom:'▲ 2%', net:-3, seats:'—',
      against:50, support:50, region:'Johor',
      title:{en:'Machinery shift PAS → Bersatu', bm:'Pemindahan jentera PAS → Bersatu'},
      why:{en:'Ground-machine logistics rather than a public narrative. Matters for GOTV strength, not for the airwar.',
           bm:'Logistik jentera darat, bukan naratif awam. Penting untuk kekuatan gerak keluar mengundi, bukan perang udara.'},
      syor:{en:'MONITOR only; internal, low public salience.',
            bm:'PANTAU sahaja; dalaman, kurang menonjol di mata umum.'},
      pin:{x:16.9,y:77.7,s:8} },
    { id:'kontroversi', code:'JH·VIRAL·0106', dot:'low', count:6, reach:'6%', mom:'▲ 14%', net:-30, seats:'—',
      against:65, support:35, region:'Johor',
      title:{en:'Viral controversy & speculation (spoilt votes, memes)', bm:'Kontroversi viral & spekulasi (undi rosak, meme)'},
      why:{en:'High momentum but short-lived and low persuasive power — research shows it shifts few votes yet drains war-room time. Amplifying it just gives it oxygen.',
           bm:'Momentum tinggi tetapi hayat pendek dan kuasa pujukan rendah — kajian menunjukkan ia menukar sedikit undi tetapi menelan masa war-room. Membesarkannya hanya memberi oksigen.'},
      syor:{en:'IGNORE publicly. Internal protocol only: log, fact-check, respond ONLY if it reaches mainstream media or touches SPR integrity. Don\'t let it set the daily agenda.',
            bm:'ABAI secara awam. Protokol dalaman sahaja: log, semak fakta, jawab HANYA jika sampai ke media arus perdana atau melibatkan integriti SPR. Jangan biar ia menentukan agenda harian.'},
      pin:{x:22.4,y:84.2,s:24} },
    { id:'spoiler', code:'JH·SPOILER·0058', dot:'low', count:3, reach:'3%', mom:'▬ 1%', net:-2, seats:'3',
      against:49, support:51, region:'Johor',
      title:{en:'Spoiler candidates (BERSAMA / independents)', bm:'Calon spoiler (BERSAMA / bebas)'},
      why:{en:'Small third-force candidates that don\'t win but can split a margin. Only matters in the tightest 3 seats.',
           bm:'Calon kuasa ketiga kecil yang tidak menang tetapi boleh memecah majoriti. Hanya penting di 3 kerusi paling ketat.'},
      syor:{en:'MODEL vote-split risk in marginal seats; otherwise ignore.',
            bm:'MODELKAN risiko pecahan undi di kerusi majoriti tipis; selain itu abaikan.'},
      pin:{x:24.1,y:86.4,s:9} },
    { id:'isu3r', code:'MY·NATIONAL·0203', dot:'neg', count:5, reach:'5%', mom:'▲ 4%', net:-11, seats:'—',
      against:56, support:44, region:'National',
      title:{en:'National issues & 3R rhetoric', bm:'Isu nasional & retorik 3R'},
      why:{en:'Race-religion-royalty framing spikes fast and polarises. High risk, low reward — easy to inflame, hard to win on.',
           bm:'Bingkai bangsa-agama-raja melonjak pantas dan mengutubkan. Risiko tinggi, ganjaran rendah — mudah menyemarakkan, sukar untuk menang.'},
      syor:{en:'DE-ESCALATE. Redirect to material issues; do not trade blows on 3R terms.',
            bm:'REDAKAN. Alih ke isu nyata; jangan berbalas pukulan atas terma 3R.'},
      pin:{x:16.5,y:74.6,s:10} },
  ];
  var byId = {}; NARR.forEach(function (n) { byId[n.id] = n; });
  var selected = 'kontroversi';      // matches the mockup's default detail
  var viewMode = 'naratif';

  // ---------- render: signal layers ----------
  function renderSignals() {
    var host = document.getElementById('amSignals'); if (!host) return;
    host.innerHTML = NARR.map(function (n) {
      return '<div class="am-signal' + (n.id === selected ? ' on' : '') + '" data-id="' + n.id + '">' +
        '<span class="dot ' + n.dot + '"></span>' +
        '<span class="nm">' + T(n.title) + '</span>' +
        '<span class="ct">' + n.count + '</span></div>';
    }).join('');
    host.querySelectorAll('.am-signal').forEach(function (el) {
      el.addEventListener('click', function () { select(el.dataset.id); });
    });
  }

  // ---------- render: map pins ----------
  function renderPins() {
    var host = document.getElementById('amPins'); if (!host) return;
    host.innerHTML = NARR.filter(function (n) { return n.pin; }).map(function (n) {
      var p = n.pin;
      return '<span class="am-pin ' + n.dot + (n.id === selected ? ' sel' : '') + '" data-id="' + n.id + '" ' +
        'style="left:' + p.x + '%;top:' + p.y + '%;width:' + p.s + 'px;height:' + p.s + 'px" ' +
        'title="' + T(n.title) + '"></span>';
    }).join('');
    host.querySelectorAll('.am-pin').forEach(function (el) {
      el.addEventListener('click', function () { select(el.dataset.id); });
    });
  }

  // ---------- render: top narratives ----------
  function renderTopN() {
    var host = document.getElementById('amTopN'); if (!host) return;
    var top = NARR.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 5);
    host.innerHTML = top.map(function (n, i) {
      return '<div class="am-topn"><span class="rk">' + (i + 1) + '</span>' +
        '<span class="tn">' + T(n.title) + '</span>' +
        '<span class="tp">' + n.count + '% <span class="ar">▲</span></span></div>';
    }).join('');
  }

  // ---------- render: detail / simulator ----------
  function renderDetail() {
    var host = document.getElementById('amDetail'); if (!host) return;
    if (viewMode === 'simulator') {
      host.innerHTML =
        '<div class="am-detail" style="text-align:center">' +
          '<div class="dtitle" style="color:#eafff5">' + (lang() === 'bm' ? 'Simulator ayunan & kehadiran' : 'Swing & turnout simulator') + '</div>' +
          '<p class="am-why" style="margin:10px auto 16px;max-width:460px">' +
            (lang() === 'bm'
              ? 'Modelkan senario undi kerusi demi kerusi dengan vektor 2022 + daftar 2026. Tersedia untuk pelanggan.'
              : 'Model seat-by-seat vote scenarios from 2022 vectors + the 2026 roll. Available to subscribers.') + '</p>' +
          '<button class="am-req" data-scrollreq>' + (lang() === 'bm' ? 'Buka kunci — minta akses' : 'Unlock — request access') + '</button>' +
        '</div>';
      host.querySelector('[data-scrollreq]').addEventListener('click', gotoRequest);
      return;
    }
    var n = byId[selected];
    host.innerHTML =
      '<div class="am-detail">' +
        '<div class="dcode"><span class="c">' + n.code + '</span>' +
          '<button class="am-abai">' + (lang() === 'bm' ? syorVerb(n, 'bm') : syorVerb(n, 'en')) + '</button></div>' +
        '<div class="dtitle">' + T(n.title) + '</div>' +
        '<div class="dsub">' + n.region + ' · PRN-16 · ' + (lang() === 'bm' ? 'naratif pemantauan sampel' : 'sample monitoring narrative') + '</div>' +
        '<div class="am-stats">' +
          stat(lang() === 'bm' ? 'Jangkauan' : 'Reach', n.reach) +
          stat('Momentum', n.mom) +
          stat(lang() === 'bm' ? 'Sentimen' : 'Net sent.', (n.net > 0 ? '+' : '') + n.net) +
          stat(lang() === 'bm' ? 'Kerusi' : 'Seats', n.seats) +
        '</div>' +
        '<div class="am-bar-lab"><span>' + (lang() === 'bm' ? 'Tak setuju — AGAINST' : 'AGAINST — Tak setuju') + '</span>' +
          '<span>SUPPORT · ' + (lang() === 'bm' ? 'Sokong' : 'Sokong') + '</span></div>' +
        '<div class="am-bar"><span class="against" style="width:' + n.against + '%">' + n.against + '%</span>' +
          '<span class="support" style="width:' + n.support + '%">' + n.support + '%</span></div>' +
        '<p class="am-why"><b>' + (lang() === 'bm' ? '▸ Kenapa:' : '▸ Why:') + '</b> ' + T(n.why) + '</p>' +
        '<div class="am-syor"><b>◉ ' + (lang() === 'bm' ? 'Syor tindakan:' : 'Recommended action:') + '</b> ' + T(n.syor) + '</div>' +
      '</div>';
  }
  function syorVerb(n, l) {
    // first word of the recommendation, shown on the corner button (ABAI / ENGAGE / …)
    var s = n.syor[l] || n.syor.bm; return s.split(/[ .,]/)[0];
  }
  function stat(k, v) { return '<div class="am-stat"><div class="sk">' + k + '</div><div class="sv">' + v + '</div></div>'; }

  function select(id) {
    if (!byId[id]) return;
    selected = id;
    renderSignals(); renderPins(); renderDetail();
  }

  // ---------- view tabs (NARATIF / SIMULATOR) ----------
  function initTabs() {
    document.querySelectorAll('.am-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.am-tab').forEach(function (x) { x.classList.toggle('on', x === t); });
        viewMode = t.dataset.view;
        var wrap = document.querySelector('.am-map-wrap');
        if (wrap) wrap.style.filter = viewMode === 'simulator' ? 'blur(3px) grayscale(.4)' : '';
        renderDetail();
      });
    });
  }

  // ---------- region presets ----------
  function initRegions() {
    document.querySelectorAll('.am-region').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.am-region').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
  }

  // ---------- live clock ----------
  function tick() {
    var el = document.getElementById('amClock'); if (!el) return;
    var d = new Date();
    el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  // ---------- request-access scroll ----------
  function gotoRequest() {
    var el = document.getElementById('request');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- CTA lead form (Web3Forms) ----------
  function initForm() {
    var f = document.getElementById('amForm'); if (!f) return;
    var WEB3FORMS_KEY = '58222a5c-c88b-40f2-b190-b8a11f26fc40';
    var TO = 'tech@farissuhail.com';
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (document.getElementById('amName').value || '').trim();
      var email = (document.getElementById('amEmail').value || '').trim();
      var msg = (document.getElementById('amMsg').value || '').trim();
      if (!email && !msg) { document.getElementById('amEmail').focus(); return; }
      var body = 'Analitika Malaya — access request\n\nName/org: ' + (name || '—') +
        '\nEmail: ' + (email || '—') + '\n\nWhat to track:\n' + (msg || '—') +
        '\n\n— via ' + location.href;
      var done = function () { document.getElementById('amOk').style.display = 'block'; f.reset(); };
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: '[Analitika Malaya] Access request',
          from_name: name || 'Analitika lead', email: email || TO, message: body })
      }).then(done).catch(function () {
        window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent('[Analitika Malaya] Access request') +
          '&body=' + encodeURIComponent(body);
        done();
      });
    });
    var top = document.getElementById('amReqTop');
    if (top) top.addEventListener('click', gotoRequest);
  }

  // ---------- BM / EN toggle ----------
  function applyLang() {
    var l = lang();
    document.querySelectorAll('[data-en][data-bm]').forEach(function (el) {
      el.innerHTML = l === 'en' ? el.dataset.en : el.dataset.bm;
    });
    document.querySelectorAll('[data-en-ph][data-bm-ph]').forEach(function (el) {
      el.setAttribute('placeholder', l === 'en' ? el.dataset.enPh : el.dataset.bmPh);
    });
    document.querySelector('.am-lang-bm').classList.toggle('on', l === 'bm');
    document.querySelector('.am-lang-en').classList.toggle('on', l === 'en');
  }
  function setLang(l) {
    html.setAttribute('data-lang', l);
    try { localStorage.setItem('fs-lang', l); } catch (e) {}
    applyLang();
    renderSignals(); renderPins(); renderTopN(); renderDetail();
  }
  function initLang() {
    try { var s = localStorage.getItem('fs-lang'); if (s === 'en' || s === 'bm') html.setAttribute('data-lang', s); } catch (e) {}
    applyLang();
    document.querySelector('.am-lang-bm').addEventListener('click', function () { setLang('bm'); });
    document.querySelector('.am-lang-en').addEventListener('click', function () { setLang('en'); });
  }

  // ---------- boot ----------
  function boot() {
    initLang(); initTabs(); initRegions(); initForm();
    renderSignals(); renderPins(); renderTopN(); renderDetail();
    tick(); setInterval(tick, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* Shared feedback widget — injects a theme-matching "Feedback" pill on every page.
   Captures which page the feedback is about. Sends via Web3Forms if a key is set,
   otherwise falls back to opening the visitor's mail client. No backend needed. */
(function () {
  'use strict';

  // ── To collect feedback straight to your inbox (no mail-client popup):
  //    get a free key at https://web3forms.com (use tech@farissuhail.com) and
  //    replace the placeholder below. Until then, it falls back to mailto.
  var WEB3FORMS_KEY = '58222a5c-c88b-40f2-b190-b8a11f26fc40';
  var TO = 'tech@farissuhail.com';

  var html = document.documentElement;
  function bm() { return html.getAttribute('data-lang') === 'bm'; }
  function T(en, ms) { return bm() ? ms : en; }

  var REACTS = [
    { k: 'beneficial', en: 'Beneficial', ms: 'Bermanfaat', icon: '🤍' },
    { k: 'idea', en: 'Suggestion', ms: 'Cadangan', icon: '💡' },
    { k: 'issue', en: 'Issue', ms: 'Masalah', icon: '🐞' }
  ];
  var react = 'beneficial';

  // ---------- styles ----------
  var css = `
  .fb-btn{position:fixed;right:20px;bottom:20px;z-index:9000;display:inline-flex;align-items:center;gap:8px;
    font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#0a0a0f;
    background:var(--accent,#ff5e3a);border:0;border-radius:999px;padding:11px 18px;cursor:pointer;
    box-shadow:0 10px 30px -8px rgba(0,0,0,.55);transition:transform .2s, box-shadow .2s;}
  .fb-btn:hover{transform:translateY(-2px);box-shadow:0 16px 36px -10px rgba(0,0,0,.6);}
  .fb-btn .x{display:none;}
  .fb-panel{position:fixed;right:20px;bottom:80px;z-index:9001;width:340px;max-width:calc(100vw - 32px);
    background:#14141e;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:22px;
    box-shadow:0 30px 70px -20px rgba(0,0,0,.75);opacity:0;transform:translateY(10px) scale(.98);
    pointer-events:none;transition:opacity .18s, transform .18s;
    font-family:'Inter',-apple-system,'Segoe UI',sans-serif;color:#f1f1f5;}
  .fb-panel.open{opacity:1;transform:none;pointer-events:auto;}
  .fb-h{font-size:17px;font-weight:700;margin:0 0 4px;}
  .fb-sub{font-size:12.5px;color:#a4a4b5;margin:0 0 16px;line-height:1.5;}
  .fb-sub b{color:var(--accent,#ff5e3a);font-weight:600;}
  .fb-reacts{display:flex;gap:7px;margin-bottom:14px;}
  .fb-react{flex:1;font-size:12px;font-weight:600;color:#a4a4b5;background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 4px;cursor:pointer;text-align:center;
    transition:all .15s;}
  .fb-react:hover{color:#f1f1f5;}
  .fb-react.on{color:#0a0a0f;background:var(--accent,#ff5e3a);border-color:transparent;}
  .fb-panel textarea,.fb-panel input{width:100%;box-sizing:border-box;background:#0a0a0f;
    border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#f1f1f5;
    font-family:inherit;font-size:14px;margin-bottom:9px;resize:vertical;}
  .fb-panel textarea:focus,.fb-panel input:focus{outline:none;border-color:var(--accent,#ff5e3a);}
  .fb-row{display:flex;gap:9px;}
  .fb-row input{margin-bottom:9px;}
  .fb-send{width:100%;font-family:inherit;font-size:14px;font-weight:700;color:#0a0a0f;
    background:var(--accent,#ff5e3a);border:0;border-radius:10px;padding:12px;cursor:pointer;margin-top:4px;
    transition:transform .15s, opacity .2s;}
  .fb-send:hover{transform:translateY(-1px);}
  .fb-foot{font-size:11px;color:#6e6e80;margin:11px 0 0;text-align:center;}
  .fb-ok{text-align:center;padding:14px 4px;}
  .fb-ok .big{font-size:34px;}
  .fb-ok p{color:#a4a4b5;font-size:14px;margin:8px 0 0;}
  .fb-close{position:absolute;top:14px;right:16px;background:none;border:0;color:#6e6e80;font-size:20px;
    cursor:pointer;line-height:1;}
  .fb-close:hover{color:#f1f1f5;}
  @media(max-width:520px){.fb-panel{right:8px;left:8px;width:auto;bottom:78px;}}
  .fb-count{position:fixed;left:20px;bottom:20px;z-index:9000;display:none;align-items:center;gap:8px;
    font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--accent,#ff5e3a);
    background:rgba(10,10,15,.72);border:1px solid rgba(255,255,255,.12);border-radius:999px;
    padding:9px 14px;text-decoration:none;backdrop-filter:blur(12px);}
  .fb-count .fb-dot{width:7px;height:7px;border-radius:50%;background:var(--accent,#ff5e3a);
    box-shadow:0 0 0 0 currentColor;animation:fbpulse 2s infinite;}
  .fb-count b{color:#f1f1f5;font-weight:700;}
  @keyframes fbpulse{0%{box-shadow:0 0 0 0 rgba(120,200,120,.5)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
  @media(max-width:520px){.fb-count{left:8px;bottom:14px;font-size:11px;padding:7px 11px;}}
  `;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- DOM ----------
  var btn = document.createElement('button');
  btn.className = 'fb-btn';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.className = 'fb-panel';
  document.body.appendChild(panel);

  function pageLabel() {
    return (document.title || location.pathname).split('·')[0].trim();
  }

  function renderForm() {
    panel.innerHTML =
      '<button class="fb-close" aria-label="close">×</button>' +
      '<h3 class="fb-h">' + T('Help improve this', 'Bantu perbaiki ini') + '</h3>' +
      '<p class="fb-sub">' + T('Your thoughts on ', 'Pandangan anda tentang ') + '<b>' + pageLabel() + '</b>' +
        T(' go straight to Faris.', ' terus kepada Faris.') + '</p>' +
      '<div class="fb-reacts">' + REACTS.map(function (r) {
        return '<button class="fb-react' + (r.k === react ? ' on' : '') + '" data-k="' + r.k + '">' +
          r.icon + ' ' + T(r.en, r.ms) + '</button>';
      }).join('') + '</div>' +
      '<textarea rows="3" id="fb-msg" placeholder="' + T('What stood out, or what could be better?', 'Apa yang menarik, atau apa boleh diperbaiki?') + '"></textarea>' +
      '<div class="fb-row"><input id="fb-name" placeholder="' + T('Name (optional)', 'Nama (pilihan)') + '"><input id="fb-email" type="email" placeholder="' + T('Email (optional)', 'E-mel (pilihan)') + '"></div>' +
      '<button class="fb-send">' + T('Send feedback', 'Hantar maklum balas') + '</button>' +
      '<p class="fb-foot">' + T('Anonymous unless you add your details.', 'Tanpa nama melainkan anda isi butiran.') + '</p>';

    panel.querySelector('.fb-close').onclick = close;
    panel.querySelectorAll('.fb-react').forEach(function (b) {
      b.onclick = function () {
        react = b.dataset.k;
        panel.querySelectorAll('.fb-react').forEach(function (x) { x.classList.toggle('on', x === b); });
      };
    });
    panel.querySelector('.fb-send').onclick = send;
  }

  function send() {
    var msg = (panel.querySelector('#fb-msg').value || '').trim();
    var name = (panel.querySelector('#fb-name').value || '').trim();
    var email = (panel.querySelector('#fb-email').value || '').trim();
    if (!msg) { panel.querySelector('#fb-msg').focus(); return; }
    var rk = REACTS.filter(function (r) { return r.k === react; })[0];
    var subject = '[Feedback · ' + (rk ? rk.en : react) + '] ' + pageLabel();
    var body = msg + '\n\n— Reaction: ' + (rk ? rk.en : react) +
      '\n— Page: ' + pageLabel() + '\n— URL: ' + location.href +
      (name ? '\n— Name: ' + name : '') + (email ? '\n— Email: ' + email : '');

    var done = function () {
      panel.innerHTML = '<button class="fb-close" aria-label="close">×</button>' +
        '<div class="fb-ok"><div class="big">✦</div>' +
        '<h3 class="fb-h">' + T('Thank you', 'Terima kasih') + '</h3>' +
        '<p>' + T('Your feedback helps this grow. Jazakallahu khairan.', 'Maklum balas anda membantu ia berkembang. Jazakallahu khairan.') + '</p></div>';
      panel.querySelector('.fb-close').onclick = close;
      setTimeout(close, 2600);
    };

    if (WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf('YOUR_') !== 0) {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY, subject: subject,
          from_name: name || 'Site visitor', email: email || TO,
          message: body, page: location.href, reaction: react
        })
      }).then(done).catch(function () { mailto(subject, body); done(); });
    } else {
      mailto(subject, body); done();
    }
  }
  function mailto(subject, body) {
    window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function open() { renderForm(); panel.classList.add('open'); relabelBtn(true); }
  function close() { panel.classList.remove('open'); relabelBtn(false); }
  function relabelBtn(isOpen) {
    btn.innerHTML = isOpen ? ('✕ ' + T('Close', 'Tutup')) : ('✦ ' + T('Feedback', 'Maklum balas'));
  }
  btn.onclick = function () { panel.classList.contains('open') ? close() : open(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
  });
  var lb = document.getElementById('langToggle');
  if (lb) lb.addEventListener('click', function () { setTimeout(function () { relabelBtn(panel.classList.contains('open')); if (panel.classList.contains('open')) renderForm(); }, 0); });

  relabelBtn(false);

  // ---------- live cumulative visitor counter ----------
  (function () {
    var NS = 'farissuhail-com', KEY = 'visits';
    var pill = document.createElement('a');
    pill.className = 'fb-count'; pill.href = 'javascript:void(0)';
    pill.title = T('Total visits to this site', 'Jumlah kunjungan ke laman ini');
    document.body.appendChild(pill);
    var counted = false;
    try { counted = sessionStorage.getItem('fs-visited') === '1'; } catch (e) {}
    // /hit increments + returns; /get only reads — count once per browser session
    var url = 'https://abacus.jasoncameron.dev/' + (counted ? 'get' : 'hit') + '/' + NS + '/' + KEY;
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      var n = (d && (d.value != null ? d.value : d.count));
      if (typeof n !== 'number') return;
      try { sessionStorage.setItem('fs-visited', '1'); } catch (e) {}
      pill.innerHTML = '<span class="fb-dot"></span><b>' + n.toLocaleString('en-US') + '</b> ' + T('visits', 'kunjungan');
      pill.style.display = 'inline-flex';
    }).catch(function () { /* counter service unavailable — stay hidden */ });
  })();
})();

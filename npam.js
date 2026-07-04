/* ===== NPAM — Non-Partisan Analitika Malaya =====
   A live citizen-sentiment poll with NO backend.

   Votes are aggregated through the same free, anonymous public counter
   service the site already uses for its visit count (abacus). Each poll
   option is one counter:  /hit/npam-<question>/<option>  increments+reads,
   /get/... reads only. Vote-once is remembered per device in localStorage.
   No account, no personal data, no fabricated numbers — the dashboard
   starts near zero and grows as real people answer. */
(function () {
  'use strict';

  var html = document.documentElement;
  function lang() { return html.getAttribute('data-lang') === 'bm' ? 'bm' : 'en'; }
  function T(o) { return o[lang()] != null ? o[lang()] : o.en; }

  var AB = 'https://abacus.jasoncameron.dev';
  var META_NS = 'npam-meta';          // participation counter
  var svc = true;                     // flips false if the counter service is down

  // ---------- the questions (issue-focused, deliberately neutral) ----------
  var Q = [
    {
      id: 'direction',
      q: { en: 'Overall, is Malaysia heading in the right or wrong direction?',
           bm: 'Secara keseluruhan, adakah Malaysia menuju ke arah yang betul atau salah?' },
      opts: [
        { id: 'right',  s: 'pos', en: 'Right direction', bm: 'Arah yang betul' },
        { id: 'wrong',  s: 'neg', en: 'Wrong direction', bm: 'Arah yang salah' },
        { id: 'unsure', s: 'neu', en: 'Not sure',        bm: 'Tidak pasti' }
      ]
    },
    {
      id: 'issue',
      q: { en: 'Which issue matters most to you right now?',
           bm: 'Isu manakah paling penting bagi anda sekarang?' },
      opts: [
        { id: 'cost',   s: 'neu', en: 'Cost of living',           bm: 'Kos sara hidup' },
        { id: 'graft',  s: 'neu', en: 'Corruption & governance',  bm: 'Rasuah & tadbir urus' },
        { id: 'jobs',   s: 'neu', en: 'Jobs & economy',           bm: 'Pekerjaan & ekonomi' },
        { id: 'unity',  s: 'neu', en: 'Racial & religious unity', bm: 'Perpaduan kaum & agama' },
        { id: 'edu',    s: 'neu', en: 'Education',                 bm: 'Pendidikan' },
        { id: 'health', s: 'neu', en: 'Healthcare',               bm: 'Penjagaan kesihatan' },
        { id: 'env',    s: 'neu', en: 'Environment & climate',    bm: 'Alam sekitar & iklim' }
      ]
    },
    {
      id: 'economy',
      q: { en: 'How do you expect the economy to change over the next 12 months?',
           bm: 'Bagaimana anda menjangka ekonomi berubah dalam 12 bulan akan datang?' },
      opts: [
        { id: 'better', s: 'pos', en: 'Improve',       bm: 'Bertambah baik' },
        { id: 'same',   s: 'neu', en: 'Stay the same', bm: 'Kekal sama' },
        { id: 'worse',  s: 'neg', en: 'Worsen',        bm: 'Bertambah buruk' }
      ]
    },
    {
      id: 'trust',
      q: { en: 'How much do you trust the country’s political institutions overall?',
           bm: 'Sejauh mana anda mempercayai institusi politik negara secara keseluruhan?' },
      opts: [
        { id: 'high',   s: 'pos', en: 'A lot',      bm: 'Banyak' },
        { id: 'some',   s: 'pos', en: 'Somewhat',   bm: 'Sedikit sebanyak' },
        { id: 'little', s: 'neg', en: 'A little',   bm: 'Sedikit' },
        { id: 'none',   s: 'neg', en: 'Not at all', bm: 'Langsung tidak' }
      ]
    },
    {
      id: 'harmony',
      q: { en: 'How optimistic are you about racial and religious harmony in Malaysia?',
           bm: 'Sejauh mana anda optimis tentang keharmonian kaum dan agama di Malaysia?' },
      opts: [
        { id: 'very',     s: 'pos', en: 'Very optimistic', bm: 'Sangat optimis' },
        { id: 'somewhat', s: 'neu', en: 'Somewhat',        bm: 'Sederhana' },
        { id: 'notvery',  s: 'neg', en: 'Not very',        bm: 'Kurang optimis' },
        { id: 'notatall', s: 'neg', en: 'Not at all',      bm: 'Tidak sama sekali' }
      ]
    },
    {
      id: 'voice',
      q: { en: 'Do ordinary citizens’ voices get heard in decision-making?',
           bm: 'Adakah suara rakyat biasa didengari dalam pembuatan keputusan?' },
      opts: [
        { id: 'yes',       s: 'pos', en: 'Yes, heard',   bm: 'Ya, didengari' },
        { id: 'sometimes', s: 'neu', en: 'Sometimes',    bm: 'Kadang-kadang' },
        { id: 'rarely',    s: 'neg', en: 'Rarely',       bm: 'Jarang' },
        { id: 'never',     s: 'neg', en: 'Never',        bm: 'Tidak pernah' }
      ]
    }
  ];

  // categorical palette for the "top concern" issue breakdown (all non-partisan hues)
  var CAT = ['#f5b13d', '#2dd4bf', '#a78bfa', '#60a5fa', '#f472b6', '#34d399', '#fbbf24'];

  // counts[qid][oid] = number ; live tallies
  var counts = {};
  Q.forEach(function (q) { counts[q.id] = {}; q.opts.forEach(function (o) { counts[q.id][o.id] = 0; }); });
  var totalResponses = 0;

  // ---------- local (per-device) vote memory ----------
  function myVote(qid) { try { return localStorage.getItem('npam-v-' + qid); } catch (e) { return null; } }
  function setMyVote(qid, oid) { try { localStorage.setItem('npam-v-' + qid, oid); } catch (e) {} }

  // ---------- counter service helpers ----------
  function abGet(ns, key) {
    return fetch(AB + '/get/' + ns + '/' + key)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && typeof d.value === 'number' ? d.value : 0; })
      .catch(function () { svc = false; return 0; });
  }
  function abHit(ns, key) {
    return fetch(AB + '/hit/' + ns + '/' + key)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && typeof d.value === 'number' ? d.value : null; })
      .catch(function () { svc = false; return null; });
  }

  // ---------- helpers ----------
  function qTotal(qid) { var t = 0, c = counts[qid]; for (var k in c) t += c[k]; return t; }
  function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }
  function nfmt(n) { return (n || 0).toLocaleString('en-US'); }

  // ================= VOTE / RESULTS CARDS =================
  function optRow(q, o, readonly) {
    var tot = qTotal(q.id), n = counts[q.id][o.id], p = pct(n, tot);
    var voted = myVote(q.id);
    var revealed = readonly || voted;      // show bars if read-only view or user already voted here
    var lead = revealed && tot > 0 && n === Math.max.apply(null, q.opts.map(function (x) { return counts[q.id][x.id]; })) && n > 0;

    var el = document.createElement('div');
    el.className = 'np-opt ' + o.s +
      (revealed ? '' : '') +
      (voted === o.id ? ' mine' : '') +
      (lead ? ' lead-on' : '');
    el.setAttribute('role', readonly ? 'listitem' : 'button');

    var inner = '';
    if (revealed) {
      inner += '<span class="np-fill" style="width:' + p + '%"></span>';
      inner += '<span class="np-dot"></span>';
      inner += '<span class="txt">' + T(o) + '</span>';
      inner += '<span class="lead" data-en="LEADING" data-bm="TERATAS">' + (lang() === 'bm' ? 'TERATAS' : 'LEADING') + '</span>';
      inner += '<span class="pct">' + p + '%</span>';
      inner += '<span class="cnt">' + nfmt(n) + '</span>';
    } else {
      inner += '<span class="np-dot"></span>';
      inner += '<span class="txt">' + T(o) + '</span>';
    }
    el.innerHTML = inner;

    if (!readonly && !voted) {
      el.addEventListener('click', function () { castVote(q, o); });
    }
    return el;
  }

  function questionCard(q, i, readonly) {
    var card = document.createElement('div');
    var voted = myVote(q.id);
    card.className = 'np-q' + (readonly ? ' readonly' : (voted ? ' done' : ''));

    var head = document.createElement('div');
    head.className = 'np-q-top';
    head.innerHTML = '<span class="np-q-no">Q' + (i + 1) + '</span>' +
      '<h3 class="np-q-h">' + T(q.q) + '</h3>';
    card.appendChild(head);

    var meta = document.createElement('div');
    meta.className = 'np-q-meta';
    var tot = qTotal(q.id);
    var votedTxt = voted
      ? '<span class="voted">' + (lang() === 'bm' ? 'Anda telah mengundi' : 'You voted') + '</span>'
      : (readonly ? '' : '<span>' + (lang() === 'bm' ? 'Tuding untuk mengundi' : 'Tap to vote') + '</span>');
    meta.innerHTML = '<span class="n">' + nfmt(tot) + ' ' + (lang() === 'bm' ? 'jawapan' : 'responses') + '</span>' +
      (votedTxt ? ' · ' + votedTxt : '');
    card.appendChild(meta);

    var opts = document.createElement('div');
    opts.className = 'np-opts';
    q.opts.forEach(function (o) { opts.appendChild(optRow(q, o, readonly)); });
    card.appendChild(opts);
    return card;
  }

  function renderVote() {
    var host = document.getElementById('npVote');
    if (!host) return;
    host.innerHTML = '';
    Q.forEach(function (q, i) { host.appendChild(questionCard(q, i, false)); });
  }
  function renderResults() {
    var host = document.getElementById('npResults');
    if (!host) return;
    host.innerHTML = '';
    if (totalResponses === 0 && !anyCounts()) {
      host.innerHTML = '<div class="np-empty">' +
        (lang() === 'bm'
          ? 'Belum ada jawapan lagi. Jadilah yang pertama di tab “Beri undi” — keputusan muncul di sini secara langsung.'
          : 'No responses yet. Be the first over on “Cast your vote” — results appear here live.') +
        '</div>';
      return;
    }
    Q.forEach(function (q, i) { host.appendChild(questionCard(q, i, true)); });
  }
  function anyCounts() { return Q.some(function (q) { return qTotal(q.id) > 0; }); }

  // ================= PULSE OVERVIEW =================
  function statCard(num, numClass, lbl, sub) {
    return '<div class="np-stat"><div class="num ' + (numClass || '') + '">' + num + '</div>' +
      '<div class="lbl">' + lbl + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }

  function renderPulse() {
    var host = document.getElementById('npStats');
    if (!host) return;
    var bm = lang() === 'bm';
    var dash = '&mdash;';

    // total participants
    var total = totalResponses || qTotal('direction');

    // national mood = % "right direction"
    var dirTot = qTotal('direction');
    var moodPct = pct(counts.direction.right, dirTot);

    // economic outlook = net (improve% - worsen%)
    var ecoTot = qTotal('economy');
    var net = pct(counts.economy.better, ecoTot) - pct(counts.economy.worse, ecoTot);
    var netStr = ecoTot ? (net > 0 ? '+' : '') + net + '%' : dash;
    var netLabel = !ecoTot ? '' : (net > 5 ? (bm ? 'Cenderung optimis' : 'Leans optimistic')
      : net < -5 ? (bm ? 'Cenderung pesimis' : 'Leans pessimistic')
        : (bm ? 'Berpecah rata' : 'Evenly split'));

    // top concern
    var issueTot = qTotal('issue');
    var topOpt = null, topN = -1;
    Q[1].opts.forEach(function (o) { if (counts.issue[o.id] > topN) { topN = counts.issue[o.id]; topOpt = o; } });
    var topStr = (issueTot && topN > 0) ? T(topOpt) : dash;

    host.innerHTML =
      statCard(total ? nfmt(total) : dash, '', bm ? 'Jumlah peserta' : 'Total participants',
        bm ? 'peranti unik yang mengundi' : 'unique devices that voted') +
      statCard(dirTot ? moodPct + '%' : dash, 'teal', bm ? 'Rasa arah betul' : 'Feel on right track',
        bm ? 'daripada ' + nfmt(dirTot) + ' jawapan' : 'of ' + nfmt(dirTot) + ' responses') +
      statCard(netStr, '', bm ? 'Tinjauan ekonomi' : 'Economic outlook', netLabel) +
      statCard(topStr, 'teal', bm ? 'Isu paling penting' : 'Top concern',
        (issueTot && topN > 0) ? (pct(topN, issueTot) + '% ' + (bm ? 'memilihnya' : 'chose it')) : '');

    renderGauge(moodPct, dirTot);
    renderConcern(issueTot);
  }

  function renderGauge(moodPct, dirTot) {
    var host = document.getElementById('npGauge');
    if (!host) return;
    var bm = lang() === 'bm';
    var has = dirTot > 0;
    // semicircle 180deg: angle from -90 (left) to +90 (right). value 0..100
    var ang = (moodPct / 100) * 180 - 90;              // degrees
    var C = Math.PI * 120;                              // arc length (r=120)
    var offset = C * (1 - (has ? moodPct : 0) / 100);
    var col = moodPct >= 55 ? '#2dd4bf' : moodPct >= 45 ? '#f5b13d' : '#fb7a45';

    host.innerHTML =
      '<div class="np-gauge-card">' +
        '<svg class="np-gauge" viewBox="0 0 300 175" role="img" aria-label="National mood gauge">' +
          '<path class="np-gauge-arc" d="M 30 140 A 120 120 0 0 1 270 140" />' +
          '<path class="np-gauge-fill" d="M 30 140 A 120 120 0 0 1 270 140" ' +
            'stroke="' + col + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + offset + '" />' +
          '<line class="np-gauge-needle" x1="150" y1="140" x2="150" y2="46" ' +
            'style="transform:rotate(' + (has ? ang : 0) + 'deg)" />' +
          '<circle class="np-gauge-hub" cx="150" cy="140" r="7" />' +
          '<text class="np-gauge-val" x="150" y="112" style="font-size:34px">' + (has ? moodPct + '%' : '—') + '</text>' +
          '<text class="np-gauge-cap" x="30" y="162">0%</text>' +
          '<text class="np-gauge-cap" x="270" y="162">100%</text>' +
        '</svg>' +
        '<div class="np-gauge-info">' +
          '<h3>' + (bm ? 'Meter sentimen kebangsaan' : 'National mood meter') + '</h3>' +
          '<p>' + (has
            ? (bm
              ? 'Berdasarkan ' + nfmt(dirTot) + ' jawapan, <b>' + moodPct + '%</b> merasakan negara menuju ke arah yang betul. Jarum bergerak apabila lebih ramai mengundi.'
              : 'Based on ' + nfmt(dirTot) + ' responses, <b>' + moodPct + '%</b> feel the country is on the right track. The needle moves as more people vote.')
            : (bm ? 'Belum ada jawapan lagi. Beri undi anda pada soalan arah untuk menggerakkan jarum.'
                  : 'No responses yet. Cast your vote on the direction question to move the needle.')) + '</p>' +
          '<div class="np-gauge-scale">' +
            '<span><i style="background:#fb7a45"></i>' + (bm ? 'Arah salah' : 'Wrong track') + '</span>' +
            '<span><i style="background:#f5b13d"></i>' + (bm ? 'Berpecah' : 'Split') + '</span>' +
            '<span><i style="background:#2dd4bf"></i>' + (bm ? 'Arah betul' : 'Right track') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    // paint <b> highlight
    host.querySelectorAll('.np-gauge-info b').forEach(function (b) { b.style.color = col; });
  }

  function renderConcern(issueTot) {
    var host = document.getElementById('npConcern');
    if (!host) return;
    var bm = lang() === 'bm';
    var rows = Q[1].opts.map(function (o, i) { return { o: o, n: counts.issue[o.id], c: CAT[i % CAT.length] }; })
      .sort(function (a, b) { return b.n - a.n; });
    var body = rows.map(function (r) {
      var p = pct(r.n, issueTot);
      return '<div class="np-crow">' +
        '<span class="cl">' + T(r.o) + '</span>' +
        '<span class="ct"><i style="width:' + p + '%;background:' + r.c + '"></i></span>' +
        '<span class="cv">' + (issueTot ? p + '%' : '—') + '</span></div>';
    }).join('');
    host.innerHTML =
      '<div class="np-concern"><h3>' + (bm ? 'Apa yang paling membebankan rakyat' : 'What weighs on people most') + '</h3>' +
      '<p class="hint">' + (issueTot
        ? (nfmt(issueTot) + (bm ? ' jawapan · diisih mengikut keutamaan' : ' responses · sorted by priority'))
        : (bm ? 'Belum ada jawapan — beri undi untuk mengisi carta ini.' : 'No responses yet — vote to fill this chart.')) +
      '</p>' + body + '</div>';
  }

  // ================= CAST A VOTE =================
  function castVote(q, o) {
    if (myVote(q.id)) return;                 // already voted here
    setMyVote(q.id, o.id);
    counts[q.id][o.id] += 1;                  // optimistic
    // count this device as a participant the first time it votes on anything
    var firstEver = false;
    try {
      if (localStorage.getItem('npam-participated') !== '1') {
        localStorage.setItem('npam-participated', '1');
        totalResponses += 1; firstEver = true;
      }
    } catch (e) {}
    refresh();                                // instant feedback

    // persist to the shared counter, reconcile with the authoritative value
    abHit('npam-' + q.id, o.id).then(function (v) {
      if (typeof v === 'number') { counts[q.id][o.id] = v; refresh(); }
    });
    if (firstEver) abHit(META_NS, 'responses').then(function (v) {
      if (typeof v === 'number') { totalResponses = v; refresh(); }
    });
  }

  // ================= INITIAL LOAD =================
  function loadAll() {
    var jobs = [];
    Q.forEach(function (q) {
      q.opts.forEach(function (o) {
        jobs.push(abGet('npam-' + q.id, o.id).then(function (v) { counts[q.id][o.id] = v; }));
      });
    });
    jobs.push(abGet(META_NS, 'responses').then(function (v) { totalResponses = v; }));
    return Promise.all(jobs);
  }

  // ================= RENDER PIPELINE =================
  function refresh() { renderPulse(); renderVote(); renderResults(); }

  // ================= TABS =================
  function initTabs() {
    var tabs = document.querySelectorAll('.np-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        document.querySelectorAll('.np-panel').forEach(function (p) { p.classList.remove('active'); });
        var panel = document.getElementById('panel-' + t.dataset.tab);
        if (panel) panel.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ================= SHARE-YOUR-VIEW (opinion box) =================
  function initOpinion() {
    var ta = document.getElementById('npOpinion');
    var btn = document.getElementById('npOpinionSend');
    var ok = document.getElementById('npOpinionOk');
    if (!btn) return;
    // reuse feedback.js' key convention; falls back to mailto if unset
    var WEB3FORMS_KEY = '58222a5c-c88b-40f2-b190-b8a11f26fc40';
    var TO = 'tech@farissuhail.com';
    btn.addEventListener('click', function () {
      var msg = (ta.value || '').trim();
      if (!msg) { ta.focus(); return; }
      var subject = '[NPAM] Citizen view';
      var body = msg + '\n\n— Via NPAM (Non-Partisan Analitika Malaya)\n— URL: ' + location.href;
      var done = function () { ta.value = ''; ok.style.display = 'block'; setTimeout(function () { ok.style.display = 'none'; }, 4000); };
      if (WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf('YOUR_') !== 0) {
        fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: subject, from_name: 'NPAM visitor', email: TO, message: body })
        }).then(done).catch(function () {
          window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          done();
        });
      } else {
        window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        done();
      }
    });
  }

  // ================= LANGUAGE TOGGLE (shared markup) =================
  function applyLangStatic() {
    var bm = lang() === 'bm';
    document.querySelectorAll('[data-en][data-bm]').forEach(function (el) {
      el.innerHTML = bm ? el.dataset.bm : el.dataset.en;
    });
    document.querySelectorAll('[data-en-ph][data-bm-ph]').forEach(function (el) {
      el.setAttribute('placeholder', bm ? el.dataset.bmPh : el.dataset.enPh);
    });
  }
  function initLang() {
    var lb = document.getElementById('langToggle');
    try {
      if (localStorage.getItem('fs-lang') === 'bm') {
        html.setAttribute('data-lang', 'bm');
        if (lb) { lb.querySelector('.lang-en').classList.remove('active'); lb.querySelector('.lang-bm').classList.add('active'); }
      }
    } catch (e) {}
    applyLangStatic();
    if (lb) {
      lb.addEventListener('click', function () {
        var next = lang() === 'en' ? 'bm' : 'en';
        html.setAttribute('data-lang', next);
        lb.querySelector('.lang-en').classList.toggle('active', next === 'en');
        lb.querySelector('.lang-bm').classList.toggle('active', next === 'bm');
        try { localStorage.setItem('fs-lang', next); } catch (e) {}
        applyLangStatic();
        refresh();
      });
    }
  }

  // ================= BOOT =================
  function boot() {
    initTabs(); initLang(); initOpinion();
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
    refresh();                      // paint zero-state immediately
    loadAll().then(refresh);        // then hydrate with live tallies
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

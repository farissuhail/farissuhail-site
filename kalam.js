/* KALAM — renders the Qur'an data observatory from the verified dataset.
   All figures come from assets/quran-data.json (computed from source text). */
(function () {
  'use strict';
  var DATA = null;
  var html = document.documentElement;
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  function lang() { return html.getAttribute('data-lang') === 'bm' ? 'bm' : 'en'; }
  function g(item) { // pick gloss by language
    var bm = lang() === 'bm';
    return (bm ? (item.ms || item.en) : (item.en || item.ms)) || '';
  }
  function L(en, bm) { return lang() === 'bm' ? bm : en; }

  /* ---------- OVERVIEW ---------- */
  function renderOverview() {
    var t = DATA.totals;
    var stats = [
      { num: t.surahs, en: 'Surahs', bm: 'Surah', ar: '' },
      { num: t.ayahs, en: 'Ayahs', bm: 'Ayat', ar: '' },
      { num: t.words, en: 'Words', bm: 'Kalimah', ar: '' },
      { num: t.letters, en: 'Letters', bm: 'Huruf', ar: '' }
    ];
    document.getElementById('ovStats').innerHTML = stats.map(function (s) {
      return '<div class="k-stat"><div class="num">' + fmt(s.num) + '</div>' +
        '<div class="lbl">' + L(s.en, s.bm) + '</div></div>';
    }).join('');

    var sub = [
      { num: t.roots, en: 'Unique roots', bm: 'Akar kata unik' },
      { num: t.lemmas, en: 'Base words', bm: 'Kata dasar' },
      { num: t.hapax, en: 'Said once only', bm: 'Kata sekali sahaja' },
      { num: t.allah, en: '“Allah” mentioned', bm: 'Lafaz “Allah”' },
      { num: t.makki, en: 'Makki surahs', bm: 'Surah Makki' },
      { num: t.madani, en: 'Madani surahs', bm: 'Surah Madani' }
    ];
    document.getElementById('ovSub').innerHTML = sub.map(function (s) {
      return '<div class="k-mini"><div class="num">' + fmt(s.num) + '</div>' +
        '<div class="lbl">' + L(s.en, s.bm) + '</div></div>';
    }).join('');

    // surah bar chart (mushaf order, height = ayahs)
    var max = 0;
    DATA.surahs.forEach(function (s) { if (s.ayahs > max) max = s.ayahs; });
    document.getElementById('surahBars').innerHTML = DATA.surahs.map(function (s) {
      var h = Math.max(2, Math.round(s.ayahs / max * 100));
      return '<div class="bar ' + s.type + '" style="height:' + h + '%" ' +
        'data-n="' + s.n + '" data-ar="' + s.ar + '" data-en="' + s.en + '" ' +
        'data-ay="' + s.ayahs + '" data-ty="' + s.type + '"></div>';
    }).join('');
    bindBarTips(document.getElementById('surahBars'));
  }

  /* ---------- tooltip for bars ---------- */
  var tip;
  function bindBarTips(container) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'k-tip'; document.body.appendChild(tip); }
    container.classList.add('dim');
    container.addEventListener('mousemove', function (e) {
      var b = e.target.closest('.bar'); if (!b) { tip.style.opacity = 0; return; }
      var ty = b.dataset.ty === 'makki' ? L('Makki', 'Makki') : L('Madani', 'Madani');
      tip.innerHTML = '<div class="ar">' + b.dataset.ar + '</div>' +
        '<b>' + b.dataset.n + '. ' + b.dataset.en + '</b><br>' +
        b.dataset.ay + ' ' + L('ayahs', 'ayat') + ' · ' + ty;
      tip.style.opacity = 1;
      var x = Math.min(e.clientX + 14, window.innerWidth - 250);
      tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px';
    });
    container.addEventListener('mouseleave', function () { tip.style.opacity = 0; });
  }

  /* ---------- WORDS ---------- */
  function freqRow(item, rank, max) {
    var w = Math.max(3, Math.round(item.count / max * 100));
    var gl = g(item);
    return '<div class="k-row" data-search="' + (item.ar + ' ' + item.tr + ' ' + item.en + ' ' + item.ms).toLowerCase() + '">' +
      '<div class="rank">' + (rank < 10 ? '0' + rank : rank) + '</div>' +
      '<div class="term"><span class="ar">' + item.ar + '</span><span class="tr">' + item.tr + '</span></div>' +
      '<div class="gloss">' + gl + '</div>' +
      '<div class="count">' + fmt(item.count) + '</div>' +
      '<div class="barwrap"><i style="width:' + w + '%"></i></div>' +
      '</div>';
  }
  function renderWords() {
    var max = DATA.topWords[0].count;
    document.getElementById('wordList').innerHTML =
      DATA.topWords.map(function (it, i) { return freqRow(it, i + 1, max); }).join('');
  }

  /* ---------- ROOTS ---------- */
  function renderRoots() {
    var keys = Object.keys(DATA.featuredRoots);
    document.getElementById('rootChips').innerHTML = keys.map(function (k, i) {
      return '<button class="k-chip' + (i === 0 ? ' active' : '') + '" data-root="' + k + '">' + k + '</button>';
    }).join('');
    showRoot(keys[0]);
    // top roots list
    var max = DATA.topRoots[0].count;
    document.getElementById('rootList').innerHTML =
      DATA.topRoots.map(function (it, i) { return freqRow(it, i + 1, max); }).join('');
    document.getElementById('rootChips').addEventListener('click', function (e) {
      var c = e.target.closest('.k-chip'); if (!c) return;
      [].forEach.call(this.children, function (x) { x.classList.remove('active'); });
      c.classList.add('active'); showRoot(c.dataset.root);
    });
  }
  function showRoot(key) {
    var r = DATA.featuredRoots[key];
    var core = '<div class="k-root-core"><div class="big">' + r.ar + '</div>' +
      '<div class="tr">' + r.tr + '</div>' +
      '<div class="gloss">' + g(r) + '</div>' +
      '<div class="meta"><b>' + fmt(r.count) + '</b>' + L('occurrences', 'kemunculan') +
      ' · ' + r.forms + ' ' + L('derived words', 'perkataan terbitan') + '</div></div>';
    var cards = '<div class="k-derived">' + r.derived.map(function (d) {
      return '<div class="k-card"><div class="ar">' + d.ar + '</div>' +
        '<div class="tr">' + d.tr + '</div>' +
        '<div class="gloss">' + g(d) + '</div>' +
        '<div class="count">' + fmt(d.count) + '</div></div>';
    }).join('') + '</div>';
    document.getElementById('rootView').innerHTML = core + cards;
  }

  /* ---------- NAMES / CONSTELLATION ---------- */
  var GROUP = {
    divine: { c: '#e8e8ee', en: 'The Divine', ms: 'Ilahi' },
    prophet: { c: '#22d3ee', en: 'Prophets', ms: 'Para Nabi' },
    angel: { c: '#a78bfa', en: 'Angels', ms: 'Malaikat' },
    figure: { c: '#2dd4bf', en: 'Other figures', ms: 'Tokoh lain' },
    foe: { c: '#fb7185', en: 'Adversaries', ms: 'Penentang' }
  };
  function renderNames() {
    var N = DATA.names, nodes = N.nodes, edges = N.edges;
    var n = nodes.length, padX = 48, step = 30, base = 330, H = 565;
    var W = padX * 2 + (n - 1) * step;
    var maxC = nodes[0].count, maxW = edges.length ? edges[0].w : 1;
    var x = function (i) { return padX + i * step; };
    var svg = '<svg class="k-arc" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    // arcs first (behind)
    edges.forEach(function (e) {
      var xa = x(e.a), xb = x(e.b), span = Math.abs(xb - xa);
      var arcH = Math.min(290, 22 + span * 0.55);
      var op = (0.06 + e.w / maxW * 0.34).toFixed(3);
      svg += '<path class="k-arc-edge" data-a="' + e.a + '" data-b="' + e.b + '" ' +
        'style="stroke-opacity:' + op + ';stroke-width:' + (e.w >= 10 ? 1.6 : 1) + '" ' +
        'd="M ' + xa + ' ' + base + ' Q ' + ((xa + xb) / 2) + ' ' + (base - 2 * arcH) + ' ' + xb + ' ' + base + '"/>';
    });
    // nodes: dot + bar + label + count
    nodes.forEach(function (nd, i) {
      var col = (GROUP[nd.group] || GROUP.figure).c;
      var barH = 14 + Math.sqrt(nd.count) / Math.sqrt(maxC) * 198;
      var px = x(i), nm = lang() === 'bm' ? nd.ms : nd.en;
      svg += '<g class="k-node" data-i="' + i + '">' +
        '<rect class="bar" x="' + (px - 2.5) + '" y="' + base + '" width="5" height="' + barH.toFixed(1) + '" rx="2" fill="' + col + '" opacity="0.85"/>' +
        '<circle cx="' + px + '" cy="' + base + '" r="3.4" fill="' + col + '"/>' +
        '<text x="' + px + '" y="' + (base - 9) + '" fill="' + col + '" text-anchor="start" transform="rotate(-58 ' + px + ' ' + (base - 9) + ')">' + nm + '</text>' +
        '<text class="cnt" x="' + px + '" y="' + (base + barH + 12).toFixed(1) + '" text-anchor="middle">' + fmt(nd.count) + '</text>' +
        '</g>';
    });
    svg += '</svg>';
    var wrap = document.getElementById('arcMap');
    wrap.innerHTML = svg;

    // legend
    var groupsPresent = {};
    nodes.forEach(function (nd) { groupsPresent[nd.group] = 1; });
    document.getElementById('namesLegend').innerHTML = Object.keys(GROUP)
      .filter(function (k) { return groupsPresent[k]; })
      .map(function (k) {
        return '<span><i style="background:' + GROUP[k].c + '"></i>' + L(GROUP[k].en, GROUP[k].ms) + '</span>';
      }).join('');

    // adjacency for hover
    var adj = {};
    edges.forEach(function (e) { (adj[e.a] = adj[e.a] || []).push(e.b); (adj[e.b] = adj[e.b] || []).push(e.a); });
    var svgEl = wrap.querySelector('.k-arc');
    var nodeEls = svgEl.querySelectorAll('.k-node');
    var edgeEls = svgEl.querySelectorAll('.k-arc-edge');
    nodeEls.forEach(function (g) {
      g.addEventListener('mouseenter', function () {
        var i = +g.dataset.i; svgEl.classList.add('focus');
        var near = {}; (adj[i] || []).forEach(function (j) { near[j] = 1; }); near[i] = 1;
        nodeEls.forEach(function (x2) { x2.classList.toggle('on', !!near[+x2.dataset.i]); });
        edgeEls.forEach(function (ed) {
          ed.classList.toggle('on', +ed.dataset.a === i || +ed.dataset.b === i);
        });
        var nd = nodes[i], deg = (adj[i] || []).length;
        tipShow(g, '<div class="ar">' + nd.ar + '</div><b>' + (lang() === 'bm' ? nd.ms : nd.en) + '</b><br>' +
          fmt(nd.count) + ' ' + L('mentions', 'sebutan') + ' · ' + L('linked to', 'berkait dengan') + ' ' + deg + ' ' + L('others', 'tokoh'));
      });
      g.addEventListener('mousemove', function (e) { tipMove(e); });
      g.addEventListener('mouseleave', function () {
        svgEl.classList.remove('focus');
        nodeEls.forEach(function (x2) { x2.classList.remove('on'); });
        edgeEls.forEach(function (ed) { ed.classList.remove('on'); });
        if (tip) tip.style.opacity = 0;
      });
    });
  }
  function tipShow(el, htmlc) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'k-tip'; document.body.appendChild(tip); }
    tip.innerHTML = htmlc; tip.style.opacity = 1;
  }
  function tipMove(e) {
    if (!tip) return;
    var x2 = Math.min(e.clientX + 14, window.innerWidth - 250);
    tip.style.left = x2 + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  }

  /* ---------- NUMBERS ---------- */
  function renderNumbers() {
    document.getElementById('numCards').innerHTML = DATA.notable.map(function (n) {
      return '<div class="k-mini">' +
        (n.ar ? '<div style="font-family:Amiri,serif;font-size:26px;color:var(--k-violet);float:right;line-height:1">' + n.ar + '</div>' : '') +
        '<div class="num">' + fmt(n.value) + '</div>' +
        '<div class="lbl">' + L(n.label_en, n.label_ms) + '</div>' +
        '<div class="sub">' + L(n.sub_en, n.sub_ms) + '</div></div>';
    }).join('');
  }

  /* ---------- SURAHS ---------- */
  var surahFilter = 'all';
  function renderSurahs() {
    var q = (document.getElementById('surahSearch').value || '').toLowerCase().trim();
    var rows = DATA.surahs.filter(function (s) {
      if (surahFilter !== 'all' && s.type !== surahFilter) return false;
      if (!q) return true;
      return (s.en + ' ' + s.meaning + ' ' + s.n + ' ' + s.ar).toLowerCase().indexOf(q) !== -1;
    });
    document.getElementById('surahTable').innerHTML = rows.map(function (s) {
      return '<div class="k-srow"><span class="n">' + s.n + '</span>' +
        '<span class="ar">' + s.ar + '</span>' +
        '<span class="en">' + s.en + '<small>' + s.meaning + '</small></span>' +
        '<span class="ay">' + s.ayahs + ' ' + L('ayahs', 'ayat') + '</span>' +
        '<span class="ty ' + s.type + '">' + (s.type === 'makki' ? 'Makki' : 'Madani') + '</span></div>';
    }).join('');
  }

  /* ---------- tabs ---------- */
  function initTabs() {
    document.querySelectorAll('.k-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.k-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.k-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function renderAll() {
    renderOverview(); renderWords(); renderRoots(); renderNames(); renderNumbers(); renderSurahs();
  }

  function init() {
    initTabs();
    renderAll();
    // word search
    document.getElementById('wordSearch').addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      document.querySelectorAll('#wordList .k-row').forEach(function (row) {
        row.style.display = (!q || row.dataset.search.indexOf(q) !== -1) ? '' : 'none';
      });
    });
    // surah search + filters
    document.getElementById('surahSearch').addEventListener('input', renderSurahs);
    document.querySelectorAll('.k-filter').forEach(function (f) {
      f.addEventListener('click', function () {
        document.querySelectorAll('.k-filter').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active'); surahFilter = this.dataset.filter; renderSurahs();
      });
    });
    // language toggle (shared markup) — re-render data on switch
    var lb = document.getElementById('langToggle');
    if (lb) {
      lb.addEventListener('click', function () {
        var next = lang() === 'en' ? 'bm' : 'en';
        html.setAttribute('data-lang', next);
        document.querySelectorAll('[data-en][data-bm]').forEach(function (el) {
          el.innerHTML = next === 'bm' ? el.dataset.bm : el.dataset.en;
        });
        lb.querySelector('.lang-en').classList.toggle('active', next === 'en');
        lb.querySelector('.lang-bm').classList.toggle('active', next === 'bm');
        try { localStorage.setItem('fs-lang', next); } catch (e) {}
        renderAll();
      });
      try {
        if (localStorage.getItem('fs-lang') === 'bm') {
          html.setAttribute('data-lang', 'bm');
          document.querySelectorAll('[data-en][data-bm]').forEach(function (el) { el.innerHTML = el.dataset.bm; });
          lb.querySelector('.lang-en').classList.remove('active');
          lb.querySelector('.lang-bm').classList.add('active');
        }
      } catch (e) {}
    }
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  }

  fetch('assets/quran-data.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { DATA = d; init(); })
    .catch(function (e) {
      document.getElementById('panel-overview').innerHTML =
        '<p style="color:#a4a4b5">Could not load the dataset. Please refresh.</p>';
      console.error(e);
    });
})();

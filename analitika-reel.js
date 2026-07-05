/* ===== NARRATIVE GRAPH REEL — animated constellation =====
   center = the narrative that captures hearts & minds -> sub-narratives
   -> recommended actions that improve the client's position. Sample data. */
(function () {
  'use strict';
  var svg = document.getElementById('amReel'); if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var htmlEl = document.documentElement;
  function bm() { return htmlEl.getAttribute('data-lang') === 'bm'; }

  var MAIN = { id: 'm', en: 'Cost of living', bm: 'Kos sara hidup' };
  var SUBS = [
    { id: 's1', en: 'Prices & inflation', bm: 'Harga & inflasi', acts: [
      { en: 'Cap prices on essentials', bm: 'Had harga barang perlu' },
      { en: 'Lead with empathy + receipts', bm: 'Empati dulu, dengan bukti' } ] },
    { id: 's2', en: 'Subsidies & aid', bm: 'Subsidi & bantuan', acts: [
      { en: 'Fast targeted cash to B40', bm: 'Tunai bersasar B40 segera' },
      { en: 'Show aid reaching families', bm: 'Tunjuk bantuan sampai' } ] },
    { id: 's3', en: 'Wages & jobs', bm: 'Gaji & pekerjaan', acts: [
      { en: 'Wage floor + job guarantees', bm: 'Gaji minimum + jaminan kerja' },
      { en: 'Reskill young voters', bm: 'Latihan semula belia' } ] },
    { id: 's4', en: 'Housing & rent', bm: 'Perumahan & sewa', acts: [
      { en: 'Rent relief + first-home', bm: 'Bantuan sewa + rumah pertama' },
      { en: 'Curb speculative pricing', bm: 'Bendung harga spekulatif' } ] },
    { id: 's5', en: 'Fuel & energy', bm: 'Tenaga & minyak', acts: [
      { en: 'Stabilise the pump price', bm: 'Stabilkan harga minyak' },
      { en: 'Cheaper public transport', bm: 'Pengangkutan awam murah' } ] }
  ];
  var ACT_COLORS = ['#b58cff', '#5bb2ff', '#35e29a', '#e8c46a', '#37d6c0'];

  var CX = 500, CY = 330, R1 = 168, R2 = 300, DEG = Math.PI / 180;
  // deterministic pseudo-jitter so the layout is organic but stable
  function jit(i, s) { var v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; }

  var nodes = [];
  var links = [];
  nodes.push({ id: 'm', x: CX, y: CY, r: 25, color: '#e8c46a', en: MAIN.en, bm: MAIN.bm, type: 'main' });

  SUBS.forEach(function (s, i) {
    var a = (-90 + i * (360 / SUBS.length) + jit(i, 1) * 9) * DEG;
    var r1 = R1 + jit(i, 2) * 12;
    var sx = CX + Math.cos(a) * r1, sy = CY + Math.sin(a) * r1;
    nodes.push({ id: s.id, x: sx, y: sy, r: 13, color: '#35e29a', en: s.en, bm: s.bm, type: 'sub' });
    links.push({ x1: CX, y1: CY, x2: sx, y2: sy, cls: 's1', from: 'm', to: s.id });
    s.acts.forEach(function (act, k) {
      var spread = (k === 0 ? -1 : 1) * (15 + jit(i * 3 + k, 3) * 5);
      var aa = a + spread * DEG;
      var r2 = R2 + jit(i * 3 + k, 4) * 20;
      var ax = CX + Math.cos(aa) * r2, ay = CY + Math.sin(aa) * r2;
      nodes.push({ id: s.id + '-a' + k, x: ax, y: ay, r: 7.5, color: ACT_COLORS[(i + k) % ACT_COLORS.length],
        en: act.en, bm: act.bm, type: 'act', parent: s.id });
      links.push({ x1: sx, y1: sy, x2: ax, y2: ay, cls: 's2', from: s.id, to: s.id + '-a' + k });
    });
  });

  // ---- links ----
  var linkEls = {};
  links.forEach(function (l) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M' + l.x1.toFixed(1) + ' ' + l.y1.toFixed(1) + ' L' + l.x2.toFixed(1) + ' ' + l.y2.toFixed(1));
    p.setAttribute('pathLength', '1');
    p.setAttribute('class', 'am-link ' + l.cls);
    svg.appendChild(p);
    linkEls[l.from + '>' + l.to] = p;
  });

  // ---- nodes ----
  var nodeEls = {};
  nodes.forEach(function (n, idx) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'am-node'); g.dataset.id = n.id;
    var glow = n.r * (n.type === 'main' ? 1.6 : 2.2);
    var halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('cx', n.x); halo.setAttribute('cy', n.y); halo.setAttribute('r', n.r * 2.1);
    halo.setAttribute('fill', n.color); halo.setAttribute('opacity', '0.10');
    g.appendChild(halo);
    var ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'ring'); ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y);
    ring.setAttribute('r', n.r + 6); ring.setAttribute('stroke', n.color); ring.setAttribute('stroke-width', '1.4');
    g.appendChild(ring);
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('class', 'core'); c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', n.r);
    c.setAttribute('fill', n.color);
    c.style.filter = 'drop-shadow(0 0 ' + (glow * 0.4) + 'px ' + n.color + ') drop-shadow(0 0 ' + glow + 'px ' + n.color + ')';
    c.style.animationDelay = (jit(idx, 5) * 2.5) + 's';
    g.appendChild(c);
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('class', 'lab ' + n.type);
    if (n.type === 'main') {
      t.setAttribute('x', n.x); t.setAttribute('y', n.y + n.r + 24); t.setAttribute('text-anchor', 'middle');
      var st = document.createElementNS(NS, 'text');
      st.setAttribute('class', 'subt'); st.setAttribute('x', n.x); st.setAttribute('y', n.y + n.r + 38);
      st.setAttribute('text-anchor', 'middle'); st.textContent = 'MAIN NARRATIVE';
      g.appendChild(st); n._subt = st;
    } else {
      var right = n.x >= CX;
      t.setAttribute('x', n.x + (right ? n.r + 9 : -(n.r + 9)));
      t.setAttribute('y', n.y + 4);
      t.setAttribute('text-anchor', right ? 'start' : 'end');
    }
    t.textContent = bm() ? n.bm : n.en;
    g.appendChild(t); n._lab = t;
    svg.appendChild(g);
    nodeEls[n.id] = g;
    g.addEventListener('pointerenter', function () { focus(n.id); });
    g.addEventListener('click', function () { focus(n.id, true); });
  });
  svg.addEventListener('pointerleave', function () { unfocus(); });

  // ---- caption ----
  var cap = document.getElementById('amReelCap');
  function roleLabel(type) {
    if (type === 'main') return bm() ? 'Naratif utama' : 'Main narrative';
    if (type === 'sub') return bm() ? 'Sub-naratif' : 'Sub-narrative';
    return bm() ? 'Tindakan disyorkan' : 'Recommended action';
  }
  function nodeById(id) { return nodes.filter(function (x) { return x.id === id; })[0]; }
  function setCap(n) {
    if (!n) {
      cap.innerHTML = '<span class="role">' + (bm() ? 'Naratif → Sub → Tindakan' : 'Narrative → Sub → Action') + '</span>' +
        (bm() ? 'Satu naratif, dipecahkan kepada tindakan yang memenangkannya.' : 'One narrative, broken down into the actions that win it.');
      return;
    }
    var txt;
    if (n.type === 'act') {
      var par = nodeById(n.parent);
      txt = '<b>' + (bm() ? par.bm : par.en) + '</b> → ' + (bm() ? n.bm : n.en);
    } else { txt = '<b>' + (bm() ? n.bm : n.en) + '</b>'; }
    cap.innerHTML = '<span class="role">' + roleLabel(n.type) + '</span>' + txt;
  }

  // ---- focus / highlight branch ----
  function litLink(a, b) { var e = linkEls[a + '>' + b]; if (e) e.classList.add('lit'); }
  function focus(id) {
    var n = nodeById(id); if (!n) return;
    Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove('lit'); });
    svg.querySelectorAll('.am-link').forEach(function (l) { l.classList.remove('lit'); });
    if (n.type === 'main') { svg.classList.remove('dim'); setCap(n); return; }
    svg.classList.add('dim');
    var lit = {};
    if (n.type === 'sub') {
      lit[id] = 1; lit.m = 1; litLink('m', id);
      nodes.forEach(function (x) { if (x.parent === id) { lit[x.id] = 1; litLink(id, x.id); } });
    } else {
      lit[id] = 1; lit[n.parent] = 1; lit.m = 1;
      litLink('m', n.parent); litLink(n.parent, id);
    }
    Object.keys(lit).forEach(function (k) { if (nodeEls[k]) nodeEls[k].classList.add('lit'); });
    setCap(n);
  }
  function unfocus() {
    svg.classList.remove('dim');
    Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove('lit'); });
    svg.querySelectorAll('.am-link').forEach(function (l) { l.classList.remove('lit'); });
    setCap(null);
  }

  // ---- staggered reveal on scroll-in ----
  var played = false;
  function reveal(id, delay) { setTimeout(function () { if (nodeEls[id]) nodeEls[id].classList.add('show'); }, delay); }
  function showLink(a, b, delay) { setTimeout(function () { var e = linkEls[a + '>' + b]; if (e) e.classList.add('show'); }, delay); }
  function play() {
    if (played) return; played = true;
    reveal('m', 100);
    SUBS.forEach(function (s, i) {
      var t = 500 + i * 130;
      showLink('m', s.id, t); reveal(s.id, t + 120);
      s.acts.forEach(function (act, k) {
        var ta = 1150 + i * 130 + k * 90;
        showLink(s.id, s.id + '-a' + k, ta); reveal(s.id + '-a' + k, ta + 110);
      });
    });
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { play(); io.disconnect(); } });
  }, { threshold: 0.25 });
  io.observe(svg);
  setCap(null);

  // ---- relabel on language switch ----
  new MutationObserver(function () {
    nodes.forEach(function (n) { if (n._lab) n._lab.textContent = bm() ? n.bm : n.en; });
    var m = nodeById('m'); if (m && m._subt) m._subt.textContent = bm() ? 'NARATIF UTAMA' : 'MAIN NARRATIVE';
    setCap(null);
  }).observe(htmlEl, { attributes: true, attributeFilter: ['data-lang'] });

  // ---- drifting starfield ----
  (function () {
    var cv = document.getElementById('amStars'); if (!cv) return;
    var ctx = cv.getContext('2d'), stars = [], W, H, raf, reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    function size() {
      var r = cv.parentElement.getBoundingClientRect();
      W = cv.width = r.width; H = cv.height = r.height; stars = [];
      var n = Math.min(150, Math.round(W * H / 9000));
      for (var i = 0; i < n; i++) stars.push({
        x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.8 + 0.2,
        p: Math.random() * Math.PI * 2, c: Math.random() < 0.18 ? '232,196,106' : '150,230,200'
      });
    }
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += s.z * 0.12; if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        var tw = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t / 900 + s.p));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.z * 1.3, 0, 6.283);
        ctx.fillStyle = 'rgba(' + s.c + ',' + (tw * s.z).toFixed(2) + ')'; ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); size(); if (!reduce) raf = requestAnimationFrame(frame); });
    if (reduce) { frame(0); } else { raf = requestAnimationFrame(frame); }
  })();
})();

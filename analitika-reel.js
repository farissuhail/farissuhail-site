/* ===== NARRATIVE GRAPH REEL — living constellation =====
   center = the narrative that captures hearts & minds -> sub-narratives
   -> recommended actions that improve the client's position. Sample data.
   Continuously animated: gentle orbit + per-node float, links follow. */
(function () {
  'use strict';
  var svg = document.getElementById('amReel'); if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var htmlEl = document.documentElement;
  function bm() { return htmlEl.getAttribute('data-lang') === 'bm'; }
  var reduce = false; // marketing reel: motion always on (user request)

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
  function jit(i, s) { var v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; }

  var nodes = [], links = [], nodeById = {};
  function addNode(o) { nodes.push(o); nodeById[o.id] = o; return o; }

  addNode({ id: 'm', type: 'main', r: 25, color: '#e8c46a', en: MAIN.en, bm: MAIN.bm, bx: CX, by: CY });
  SUBS.forEach(function (s, i) {
    var ang0 = (-90 + i * (360 / SUBS.length) + jit(i, 1) * 9) * DEG;
    var rad0 = R1 + jit(i, 2) * 12;
    addNode({ id: s.id, type: 'sub', r: 13, color: '#35e29a', en: s.en, bm: s.bm, ang0: ang0, rad0: rad0 });
    links.push({ from: 'm', to: s.id, cls: 's1' });
    s.acts.forEach(function (act, k) {
      var spread = (k === 0 ? -1 : 1) * (15 + jit(i * 3 + k, 3) * 5);
      var aang = ang0 + spread * DEG;
      var arad = R2 + jit(i * 3 + k, 4) * 20;
      addNode({ id: s.id + '-a' + k, type: 'act', r: 7.5, color: ACT_COLORS[(i + k) % ACT_COLORS.length],
        en: act.en, bm: act.bm, ang0: aang, rad0: arad, parent: s.id });
      links.push({ from: s.id, to: s.id + '-a' + k, cls: 's2' });
    });
  });

  // motion phases
  nodes.forEach(function (n, idx) {
    n.ph = jit(idx, 7) * 6.283; n.ph2 = jit(idx, 8) * 6.283;
    n.fs = 0.5 + Math.abs(jit(idx, 9)) * 0.5;
    n.cx = n.bx != null ? n.bx : CX + Math.cos(n.ang0) * n.rad0;
    n.cy = n.by != null ? n.by : CY + Math.sin(n.ang0) * n.rad0;
  });

  // ---- links ----
  var linkEls = {};
  links.forEach(function (l) {
    var p = document.createElementNS(NS, 'path');
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
    n.halo = document.createElementNS(NS, 'circle');
    n.halo.setAttribute('r', n.r * 2.1); n.halo.setAttribute('fill', n.color); n.halo.setAttribute('opacity', '0.10');
    g.appendChild(n.halo);
    n.ring = document.createElementNS(NS, 'circle');
    n.ring.setAttribute('class', 'ring'); n.ring.setAttribute('r', n.r + 6);
    n.ring.setAttribute('stroke', n.color); n.ring.setAttribute('stroke-width', '1.4');
    g.appendChild(n.ring);
    n.core = document.createElementNS(NS, 'circle');
    n.core.setAttribute('class', 'core'); n.core.setAttribute('r', n.r); n.core.setAttribute('fill', n.color);
    n.core.style.filter = 'drop-shadow(0 0 ' + (glow * 0.4) + 'px ' + n.color + ') drop-shadow(0 0 ' + glow + 'px ' + n.color + ')';
    n.core.style.animationDelay = (jit(idx, 5) * 2.5) + 's';
    g.appendChild(n.core);
    n.lab = document.createElementNS(NS, 'text');
    n.lab.setAttribute('class', 'lab ' + n.type);
    if (n.type === 'main') {
      n.lab.setAttribute('text-anchor', 'middle'); n.labDX = 0; n.labDY = n.r + 24;
      n.subt = document.createElementNS(NS, 'text');
      n.subt.setAttribute('class', 'subt'); n.subt.setAttribute('text-anchor', 'middle');
      n.subt.textContent = 'MAIN NARRATIVE'; n.subtDY = n.r + 38;
      g.appendChild(n.subt);
    } else {
      var right = n.cx >= CX;
      n.labDX = right ? n.r + 9 : -(n.r + 9); n.labDY = 4;
      n.lab.setAttribute('text-anchor', right ? 'start' : 'end');
    }
    n.lab.textContent = bm() ? n.bm : n.en;
    g.appendChild(n.lab);
    svg.appendChild(g);
    nodeEls[n.id] = g;
    g.addEventListener('pointerenter', function () { focus(n.id); });
    g.addEventListener('click', function () { focus(n.id); });
  });
  svg.addEventListener('pointerleave', function () { unfocus(); });

  // ---- per-frame position update (the "movement") ----
  function place(t) {
    var grot = 0.12 * Math.sin(t * 0.22);            // orbital sway (~±7°)
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], x, y;
      if (n.type === 'main') {
        x = n.bx + 5 * Math.sin(t * 0.5 + n.ph);
        y = n.by + 5 * Math.cos(t * 0.42 + n.ph2);
      } else {
        var ang = n.ang0 + grot + 0.05 * Math.sin(t * 0.7 * n.fs + n.ph);
        var rad = n.rad0 + 10 * Math.sin(t * 0.55 * n.fs + n.ph2);
        x = CX + Math.cos(ang) * rad + 3 * Math.sin(t * 1.0 + n.ph);
        y = CY + Math.sin(ang) * rad + 3 * Math.cos(t * 0.9 + n.ph2);
      }
      n.cx = x; n.cy = y;
      n.core.setAttribute('cx', x.toFixed(1)); n.core.setAttribute('cy', y.toFixed(1));
      n.halo.setAttribute('cx', x.toFixed(1)); n.halo.setAttribute('cy', y.toFixed(1));
      n.ring.setAttribute('cx', x.toFixed(1)); n.ring.setAttribute('cy', y.toFixed(1));
      n.lab.setAttribute('x', (x + n.labDX).toFixed(1)); n.lab.setAttribute('y', (y + n.labDY).toFixed(1));
      if (n.subt) { n.subt.setAttribute('x', x.toFixed(1)); n.subt.setAttribute('y', (y + n.subtDY).toFixed(1)); }
    }
    for (var j = 0; j < links.length; j++) {
      var l = links[j], a = nodeById[l.from], b = nodeById[l.to];
      linkEls[l.from + '>' + l.to].setAttribute('d',
        'M' + a.cx.toFixed(1) + ' ' + a.cy.toFixed(1) + ' L' + b.cx.toFixed(1) + ' ' + b.cy.toFixed(1));
    }
  }
  var t0 = null, raf;
  function loop(ts) { if (t0 == null) t0 = ts; place((ts - t0) / 1000); raf = requestAnimationFrame(loop); }

  // ---- caption ----
  var cap = document.getElementById('amReelCap');
  function roleLabel(type) {
    if (type === 'main') return bm() ? 'Naratif utama' : 'Main narrative';
    if (type === 'sub') return bm() ? 'Sub-naratif' : 'Sub-narrative';
    return bm() ? 'Tindakan disyorkan' : 'Recommended action';
  }
  function setCap(n) {
    if (!n) {
      cap.innerHTML = '<span class="role">' + (bm() ? 'Naratif → Sub → Tindakan' : 'Narrative → Sub → Action') + '</span>' +
        (bm() ? 'Satu naratif, dipecahkan kepada tindakan yang memenangkannya.' : 'One narrative, broken down into the actions that win it.');
      return;
    }
    var txt;
    if (n.type === 'act') {
      var par = nodeById[n.parent];
      txt = '<b>' + (bm() ? par.bm : par.en) + '</b> → ' + (bm() ? n.bm : n.en);
    } else { txt = '<b>' + (bm() ? n.bm : n.en) + '</b>'; }
    cap.innerHTML = '<span class="role">' + roleLabel(n.type) + '</span>' + txt;
  }

  // ---- focus / highlight branch ----
  function litLink(a, b) { var e = linkEls[a + '>' + b]; if (e) e.classList.add('lit'); }
  function focus(id) {
    var n = nodeById[id]; if (!n) return;
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
  }, { threshold: 0.2 });
  io.observe(svg);

  // initial placement + start motion
  place(0);
  setCap(null);
  if (!reduce) raf = requestAnimationFrame(loop);

  // pause the rAF when the section is off-screen (perf)
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (reduce) return;
      if (e.isIntersecting && !raf) { t0 = null; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }, { threshold: 0 }).observe(svg);

  // ---- relabel on language switch ----
  new MutationObserver(function () {
    nodes.forEach(function (n) { if (n.lab) n.lab.textContent = bm() ? n.bm : n.en; });
    var m = nodeById.m; if (m && m.subt) m.subt.textContent = bm() ? 'NARATIF UTAMA' : 'MAIN NARRATIVE';
    setCap(null);
  }).observe(htmlEl, { attributes: true, attributeFilter: ['data-lang'] });

  // ---- drifting starfield ----
  (function () {
    var cv = document.getElementById('amStars'); if (!cv) return;
    var ctx = cv.getContext('2d'), stars = [], W, H, sraf;
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
      sraf = requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', function () { cancelAnimationFrame(sraf); size(); if (!reduce) sraf = requestAnimationFrame(frame); });
    if (reduce) { frame(0); } else { sraf = requestAnimationFrame(frame); }
  })();
})();

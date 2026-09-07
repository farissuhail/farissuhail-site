/* ==========================================================================
   PETROLHEAD TECHNICA — transmission lab engine
   Renders an interactive gearbox scene from a window.LAB dataset.
   ========================================================================== */
(function () {
  'use strict';

  var LAB = window.LAB;
  if (!LAB) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var html = document.documentElement;

  // ---------- state ----------
  var S = {
    lang: 'en',
    mode: 'D',          // P R N D M
    gearIx: 0,          // index into LAB.gears
    auto: true,
    speed: 0,           // km/h
    targetRpm: 2200,    // rpm the driver is asking for
    rpm: 0,
    running: true,
    exploded: false,
    xray: false,
    zoom: 1,
    sel: LAB.parts[0].id,
    hidden: {},
    learnIx: -1,
    angle: 0
  };

  function t(o) { return !o ? '' : (typeof o === 'string' ? o : (o[S.lang] || o.en || '')); }
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }
  function partById(id) {
    for (var i = 0; i < LAB.parts.length; i++) if (LAB.parts[i].id === id) return LAB.parts[i];
    return null;
  }

  // ---------- physics ----------
  var CIRC = LAB.tyre;                       // rolling circumference, metres
  function wheelRpm(kmh) { return (kmh * 1000 / 60) / CIRC; }
  function gearAt(i) { return S.mode === 'R' ? LAB.reverse : LAB.gears[i]; }
  function totalRatio(g) { return g.ratio * g.final; }
  function rpmFor(kmh, g) { return wheelRpm(kmh) * totalRatio(g); }
  function speedFor(rpm, g) { return rpm / totalRatio(g) * CIRC * 60 / 1000; }

  // pick the gear an automatic would hold for this speed and requested rev
  function autoGear() {
    var best = 0, bestErr = Infinity;
    for (var i = 0; i < LAB.gears.length; i++) {
      var r = rpmFor(S.speed, LAB.gears[i]);
      if (r > LAB.redline) continue;                 // would over-rev
      if (i > 0 && r < LAB.idle + 250) continue;     // would lug
      var err = Math.abs(r - S.targetRpm);
      if (err < bestErr) { bestErr = err; best = i; }
    }
    return best;
  }

  function recompute() {
    if (S.mode === 'P') { S.speed = 0; }
    if (S.mode === 'D' && S.auto) S.gearIx = autoGear();
    var g = gearAt(S.gearIx);
    if (S.mode === 'N' || S.mode === 'P') {
      S.rpm = Math.max(LAB.idle, S.targetRpm);
    } else {
      S.rpm = Math.max(LAB.idle, rpmFor(S.speed, g));
      if (S.rpm > LAB.redline) S.rpm = LAB.redline;
    }
  }

  function driven() { return S.mode === 'D' || S.mode === 'M' || S.mode === 'R'; }

  // ---------- scene ----------
  var scene, sceneRoot, spinNodes = [], partNodes = {}, calloutG;

  function drawShape(g, sh, cls) {
    var n;
    if (sh.t === 'rect') n = svg('rect', { x: sh.x, y: sh.y, width: sh.w, height: sh.h, rx: sh.rx == null ? 3 : sh.rx });
    else if (sh.t === 'circle') n = svg('circle', { cx: sh.cx, cy: sh.cy, r: sh.r });
    else if (sh.t === 'ellipse') n = svg('ellipse', { cx: sh.cx, cy: sh.cy, rx: sh.rx, ry: sh.ry });
    else if (sh.t === 'path') n = svg('path', { d: sh.d });
    else if (sh.t === 'line') {
      n = svg('line', { x1: sh.x1, y1: sh.y1, x2: sh.x2, y2: sh.y2 });
      n.setAttribute('stroke-width', sh.w || 3);
      n.setAttribute('stroke-linecap', 'round');
    } else if (sh.t === 'gear') {
      n = svg('path', { d: gearPath(sh.cx, sh.cy, sh.r, sh.teeth || 12) });
    }
    if (!n) return;
    n.setAttribute('class', 'body ' + (cls || ''));
    n.setAttribute('fill', sh.t === 'line' ? 'none' : (sh.fill || 'var(--tc-metal)'));
    n.setAttribute('fill-opacity', sh.fo == null ? 0.16 : sh.fo);
    n.setAttribute('stroke', sh.stroke || 'var(--tc-metal-2)');
    if (sh.t !== 'line') n.setAttribute('stroke-width', sh.sw || 1.1);
    g.appendChild(n);
    return n;
  }

  function gearPath(cx, cy, r, teeth) {
    var d = '', i, a, ri = r * 0.78, ro = r;
    var step = Math.PI * 2 / teeth;
    for (i = 0; i < teeth; i++) {
      a = i * step;
      var p = [
        [cx + ro * Math.cos(a - step * 0.18), cy + ro * Math.sin(a - step * 0.18)],
        [cx + ro * Math.cos(a + step * 0.18), cy + ro * Math.sin(a + step * 0.18)],
        [cx + ri * Math.cos(a + step * 0.34), cy + ri * Math.sin(a + step * 0.34)],
        [cx + ri * Math.cos(a + step * 0.66), cy + ri * Math.sin(a + step * 0.66)]
      ];
      d += (i === 0 ? 'M' : 'L') + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
      d += 'L' + p[1][0].toFixed(1) + ' ' + p[1][1].toFixed(1);
      d += 'L' + p[2][0].toFixed(1) + ' ' + p[2][1].toFixed(1);
      d += 'L' + p[3][0].toFixed(1) + ' ' + p[3][1].toFixed(1);
    }
    return d + 'Z';
  }

  function buildScene() {
    scene = svg('svg', { viewBox: '0 0 1020 520', preserveAspectRatio: 'xMidYMid meet' });
    sceneRoot = svg('g', {});
    scene.appendChild(sceneRoot);
    spinNodes = [];
    partNodes = {};

    LAB.parts.forEach(function (p) {
      var g = svg('g', { 'class': 'part', 'data-id': p.id });
      var inner = svg('g', {});
      g.appendChild(inner);
      (p.geo || []).forEach(function (sh) {
        if (sh.spin) {
          var sg = svg('g', { 'class': 'spin' });
          drawShape(sg, sh);
          inner.appendChild(sg);
          spinNodes.push({ node: sg, axis: sh.spin, dir: sh.dir || 1, cx: sh.cx, cy: sh.cy });
        } else {
          drawShape(inner, sh);
        }
      });
      g.addEventListener('click', function () { select(p.id); });
      g.addEventListener('mouseenter', function () { showCallout(p); });
      g.addEventListener('mouseleave', hideCallout);
      sceneRoot.appendChild(g);
      partNodes[p.id] = { g: g, inner: inner, part: p };
    });

    calloutG = svg('g', { 'class': 'tc-callout', opacity: 0 });
    var cr = svg('rect', { x: 0, y: 0, width: 10, height: 22, rx: 5 });
    var ct = svg('text', { x: 10, y: 15 });
    calloutG.appendChild(cr); calloutG.appendChild(ct);
    scene.appendChild(calloutG);

    $('#scene').appendChild(scene);
  }

  function showCallout(p) {
    var box;
    try { box = partNodes[p.id].g.getBBox(); } catch (e) { return; }
    var label = t(p.name);
    var w = label.length * 6.2 + 20;
    var x = Math.min(Math.max(box.x + box.width / 2 - w / 2, 8), 1012 - w);
    var y = Math.max(box.y - 30, 6);
    calloutG.firstChild.setAttribute('x', x);
    calloutG.firstChild.setAttribute('y', y);
    calloutG.firstChild.setAttribute('width', w);
    calloutG.lastChild.setAttribute('x', x + 10);
    calloutG.lastChild.setAttribute('y', y + 15);
    calloutG.lastChild.textContent = label;
    calloutG.setAttribute('opacity', 1);
  }
  function hideCallout() { if (calloutG) calloutG.setAttribute('opacity', 0); }

  // ---------- rendering the live state onto the scene ----------
  function paintScene() {
    var g = gearAt(S.gearIx);
    var liveShaft = S.mode === 'R' ? LAB.reverse.shaft : g.shaft;

    LAB.parts.forEach(function (p) {
      var n = partNodes[p.id];
      if (!n) return;
      var hidden = !!S.hidden[p.id];
      n.g.classList.toggle('off', hidden);
      n.g.classList.toggle('sel', p.id === S.sel);
      var onPath = driven() && (!p.shaft || p.shaft === liveShaft);
      n.g.classList.toggle('live', onPath && !!p.flow);
      n.g.classList.toggle('dim', S.sel && p.id !== S.sel && S.learnIx >= 0);
      var dx = S.exploded ? (p.ex ? p.ex.dx : 0) : 0;
      var dy = S.exploded ? (p.ex ? p.ex.dy : 0) : 0;
      n.inner.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');
    });
    sceneRoot.setAttribute('transform', 'translate(510,260) scale(' + S.zoom + ') translate(-510,-260)');
    document.body.classList.toggle('xray', S.xray);
  }

  // ---------- animation ----------
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
    last = ts;
    if (S.running) {
      var g = gearAt(S.gearIx);
      var engDeg = S.rpm * 6 * dt;                        // deg per second = rpm*6
      var wheelDeg = driven() ? wheelRpm(S.speed) * 6 * dt : 0;
      var outDeg = wheelDeg * (g.final || 1) / (g.final || 1);
      S.angle += engDeg;
      spinNodes.forEach(function (s) {
        var d = 0;
        if (s.axis === 'in') d = engDeg;
        else if (s.axis === 'mid') d = engDeg / (g.ratio || 1);
        else if (s.axis === 'out') d = wheelDeg * (g.final || 1);
        else if (s.axis === 'wheel') d = wheelDeg;
        s.acc = (s.acc || 0) + d * s.dir;
        s.node.setAttribute('transform', 'rotate(' + (s.acc % 360).toFixed(2) + ')');
      });
      void outDeg;
    }
    requestAnimationFrame(frame);
  }

  // ---------- left rail ----------
  function buildRail() {
    var list = $('#partList');
    list.innerHTML = '';
    var q = ($('#partSearch').value || '').toLowerCase().trim();
    LAB.groups.forEach(function (grp) {
      var items = LAB.parts.filter(function (p) {
        return p.group === grp.id && (!q || (t(p.name) + ' ' + (p.tag || '')).toLowerCase().indexOf(q) >= 0);
      });
      if (!items.length) return;
      list.appendChild(el('div', 'tc-group', t(grp.label)));
      items.forEach(function (p) {
        var row = el('div', 'tc-item' + (p.id === S.sel ? ' on' : '') + (S.hidden[p.id] ? ' hidden-part' : ''));
        var btn = el('button', 'tc-item-btn');
        btn.style.cssText = 'all:unset;flex:1;cursor:pointer;min-width:0';
        var nm = el('span', 'nm', t(p.name));
        btn.appendChild(nm);
        btn.addEventListener('click', function () { select(p.id); });
        row.appendChild(btn);
        if (p.tag) row.appendChild(el('span', 'tag', p.tag));
        var eye = el('button', 'tc-eye' + (S.hidden[p.id] ? ' off' : ''), S.hidden[p.id] ? '✕' : '◉');
        eye.title = 'Show / hide';
        eye.addEventListener('click', function (e) {
          e.stopPropagation();
          S.hidden[p.id] = !S.hidden[p.id];
          buildRail(); paintScene();
        });
        row.appendChild(eye);
        list.appendChild(row);
      });
    });
  }

  // ---------- right rail ----------
  function buildInfo() {
    var p = partById(S.sel) || LAB.parts[0];
    $('#infoName').textContent = t(p.name);
    $('#infoTag').textContent = p.tag || t(LAB.box.code);
    $('#infoFn').textContent = t(p.fn);
    $('#infoLink').textContent = t(p.link);
    $('#infoFail').textContent = t(p.fail);
    var steps = $('#learnSteps');
    steps.innerHTML = '';
    LAB.learn.forEach(function (s, i) {
      var row = el('div', 'step' + (i === S.learnIx ? ' on' : ''));
      row.appendChild(el('b', null, String(i + 1).padStart(2, '0')));
      row.appendChild(el('span', null, t(s.t) + ' — ' + t(s.d)));
      row.addEventListener('click', function () { learnTo(i); });
      row.style.cursor = 'pointer';
      steps.appendChild(row);
    });
  }

  function select(id) {
    S.sel = id;
    buildRail(); buildInfo(); paintScene();
    var p = partById(id);
    if (p) showCallout(p);
  }

  function learnTo(i) {
    S.learnIx = i;
    var step = LAB.learn[i];
    if (step && step.part) S.sel = step.part;
    buildRail(); buildInfo(); paintScene();
  }

  // ---------- console ----------
  function buildFlow() {
    var wrap = $('#flow');
    wrap.innerHTML = '';
    wrap.appendChild(el('span', 'cap', t(LAB.flowLabel)));
    LAB.flow.forEach(function (f, i) {
      if (i) wrap.appendChild(el('span', 'arr', '——'));
      var n = el('span', 'node', t(f));
      n.dataset.ix = i;
      wrap.appendChild(n);
    });
  }

  function paintConsole() {
    var g = gearAt(S.gearIx);
    $('#rpmVal').firstChild.nodeValue = Math.round(S.rpm).toLocaleString();
    $('#spdVal').firstChild.nodeValue = Math.round(S.speed);
    $('#rpmRange').value = Math.round(S.mode === 'D' ? S.targetRpm : S.rpm);
    $('#spdRange').value = Math.round(S.speed);

    var label = S.mode === 'R' ? 'R' : (S.mode === 'P' || S.mode === 'N' ? '—' : g.n);
    $('#ratioBig').innerHTML = (driven() ? totalRatio(g).toFixed(2) : '—') + ' <small>: 1</small>';
    $('#ratioMeta').innerHTML =
      t(LAB.ui.gear) + ' <b>' + label + '</b> · ' + t(LAB.ui.inBox) + ' <b>' + (driven() ? g.ratio.toFixed(3) : '—') + '</b><br>' +
      t(LAB.ui.finalDrive) + ' <b>' + (driven() ? g.final.toFixed(3) : '—') + '</b> · ' + t(LAB.ui.clutch) + ' <b>' +
      (driven() ? (g.shaft === 1 ? 'K1' : 'K2') : '—') + '</b>';

    // clutch / pre-select pill
    var nextIx = S.gearIx + 1 < LAB.gears.length ? S.gearIx + 1 : Math.max(0, S.gearIx - 1);
    var nextG = LAB.gears[nextIx];
    $('#modePill').innerHTML = driven()
      ? '<b>' + (g.shaft === 1 ? 'K1' : 'K2') + '</b> ' + t(LAB.ui.engaged) + ' · ' + label +
        ' &nbsp;|&nbsp; <b>' + (nextG.shaft === 1 ? 'K1' : 'K2') + '</b> ' + t(LAB.ui.preselect) + ' · ' + nextG.n
      : '<b>' + S.mode + '</b> ' + t(LAB.ui.noDrive);

    var flowOn = driven() ? LAB.flow.length : 1;
    [].forEach.call(document.querySelectorAll('#flow .node'), function (n, i) {
      n.classList.toggle('on', i < flowOn);
    });

    [].forEach.call(document.querySelectorAll('#modes button'), function (b) {
      b.classList.toggle('on', b.dataset.m === S.mode);
    });
    $('#btnPause').classList.toggle('on', !S.running);
    $('#btnPause').textContent = S.running ? t(LAB.ui.pause) : t(LAB.ui.play);
    $('#btnExp').classList.toggle('on', S.exploded);
    $('#btnXray').classList.toggle('on', S.xray);
    $('#gearRow').style.display = S.mode === 'M' ? 'flex' : 'none';
    [].forEach.call(document.querySelectorAll('#gearRow button'), function (b, i) {
      b.classList.toggle('on', i === S.gearIx);
    });
  }

  function update() { recompute(); paintConsole(); paintScene(); }

  // ---------- language ----------
  function applyLang(lang) {
    S.lang = lang;
    html.setAttribute('data-lang', lang);
    document.querySelectorAll('[data-en][data-bm]').forEach(function (n) {
      n.innerHTML = lang === 'bm' ? n.dataset.bm : n.dataset.en;
    });
    var lb = $('#langToggle');
    if (lb) {
      lb.querySelector('.lang-en').classList.toggle('active', lang === 'en');
      lb.querySelector('.lang-bm').classList.toggle('active', lang === 'bm');
    }
    $('#partSearch').placeholder = t(LAB.ui.search);
    $('#labTitle').innerHTML = t(LAB.title);
    $('#labDeck').textContent = t(LAB.deck);
    buildRail(); buildInfo(); buildFlow(); update();
    try { localStorage.setItem('fs-lang', lang); } catch (e) {}
  }

  // ---------- wire up ----------
  function init() {
    $('#labTitle').innerHTML = t(LAB.title);
    $('#labDeck').textContent = t(LAB.deck);
    $('#partCount').textContent = LAB.parts.length;

    buildScene();
    buildFlow();
    buildRail();
    buildInfo();

    // manual gear buttons
    var gr = $('#gearRow');
    LAB.gears.forEach(function (g, i) {
      var b = el('button', null, g.n);
      b.addEventListener('click', function () { S.gearIx = i; S.auto = false; update(); });
      gr.appendChild(b);
    });

    $('#partSearch').addEventListener('input', buildRail);

    [].forEach.call(document.querySelectorAll('#modes button'), function (b) {
      b.addEventListener('click', function () {
        S.mode = b.dataset.m;
        S.auto = (S.mode === 'D');
        if (S.mode === 'P') S.speed = 0;
        if (S.mode === 'R' ) S.speed = Math.min(S.speed, 20);
        update();
      });
    });

    $('#rpmRange').addEventListener('input', function () {
      var v = +this.value;
      if (S.mode === 'M' || S.mode === 'R') {
        S.speed = Math.min(LAB.maxSpeed, Math.max(0, speedFor(v, gearAt(S.gearIx))));
      } else {
        S.targetRpm = v;
      }
      update();
    });
    $('#spdRange').addEventListener('input', function () {
      S.speed = +this.value;
      if (S.mode === 'P') S.speed = 0;
      update();
    });

    $('#btnPause').addEventListener('click', function () { S.running = !S.running; last = 0; paintConsole(); });
    $('#btnExp').addEventListener('click', function () { S.exploded = !S.exploded; update(); });
    $('#btnXray').addEventListener('click', function () { S.xray = !S.xray; update(); });
    $('#btnReset').addEventListener('click', function () {
      S.mode = 'D'; S.auto = true; S.speed = 0; S.targetRpm = 2200; S.exploded = false;
      S.xray = false; S.zoom = 1; S.hidden = {}; S.learnIx = -1; S.running = true;
      S.sel = LAB.parts[0].id;
      buildRail(); buildInfo(); update();
    });
    $('#btnFocus').addEventListener('click', function () {
      var p = partById(S.sel);
      if (!p) return;
      S.hidden = {};
      LAB.parts.forEach(function (o) { if (o.id !== p.id && o.group !== p.group) S.hidden[o.id] = true; });
      buildRail(); paintScene();
    });
    $('#btnLearn').addEventListener('click', function () { learnTo(S.learnIx + 1 >= LAB.learn.length ? 0 : S.learnIx + 1); });
    $('#zoomIn').addEventListener('click', function () { S.zoom = Math.min(2.2, S.zoom + 0.15); paintScene(); });
    $('#zoomOut').addEventListener('click', function () { S.zoom = Math.max(0.6, S.zoom - 0.15); paintScene(); });
    $('#zoomFit').addEventListener('click', function () { S.zoom = 1; paintScene(); });

    var lb = $('#langToggle');
    if (lb) lb.addEventListener('click', function () { applyLang(S.lang === 'en' ? 'bm' : 'en'); });

    $('#rpmRange').min = LAB.idle; $('#rpmRange').max = LAB.redline;
    $('#spdRange').max = LAB.maxSpeed;
    $('#rpmEnds').innerHTML = '<span>' + LAB.idle + '</span><span>' + LAB.redline + ' rpm</span>';
    $('#spdEnds').innerHTML = '<span>0</span><span>' + LAB.maxSpeed + ' km/h</span>';

    var saved = 'en';
    try { var v = localStorage.getItem('fs-lang'); if (v === 'bm' || v === 'en') saved = v; } catch (e) {}
    applyLang(saved);
    select(LAB.parts[0].id);
    update();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

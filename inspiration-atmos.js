/* ===== Inspiration atmosphere — scroll-driven serene background =====
   Original ambient renderer: a colour field that warms from night toward
   dawn/gold as the reader scrolls, a soft "light" that rises, drifting
   parallax clouds and glowing motes. Calm by design — kept subtle so the
   text stays comfortable to read. Self-contained, no dependencies. */
(function () {
  'use strict';
  if (!document.body || document.body.className.indexOf('inspiration-story') < 0) return;

  var atmos = document.createElement('div');
  atmos.className = 'atmos'; atmos.setAttribute('aria-hidden', 'true');
  var cv = document.createElement('canvas'); cv.className = 'atmos-canvas';
  atmos.appendChild(cv);
  document.body.insertBefore(atmos, document.body.firstChild);
  document.body.classList.add('has-atmos');
  var ctx = cv.getContext('2d');

  // ---- colour helpers ----
  function hx(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }
  // night -> dawn palette
  var TOP_N = hx('#06060d'), TOP_D = hx('#1a1220');   // sky top: night -> warm dusk
  var BOT_N = hx('#0a0814'), BOT_D = hx('#3a2a15');   // sky bottom: night -> gold-earth

  var W = 0, H = 0, dpr = 1;
  var clouds = [], motes = [];
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function build() {
    clouds = [];
    for (var i = 0; i < 5; i++) clouds.push({
      x: rnd(0, 1), y: rnd(0.05, 0.95), r: rnd(0.34, 0.62), depth: rnd(0.05, 0.28),
      warm: Math.random() < 0.55, sp: rnd(0.004, 0.014) * (Math.random() < 0.5 ? -1 : 1), a: rnd(0.05, 0.11)
    });
    motes = [];
    var n = Math.min(46, Math.round(window.innerWidth / 26));
    for (var j = 0; j < n; j++) motes.push({
      x: rnd(0, 1), y: rnd(0, 1), r: rnd(0.7, 3.2), depth: rnd(0.12, 0.55),
      rise: rnd(4, 14), sway: rnd(8, 26), swp: rnd(0, 6.28), sws: rnd(0.2, 0.6),
      tw: rnd(0, 6.28), tws: rnd(0.4, 1.1), white: Math.random() < 0.4
    });
  }
  function size() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  var scrollY = 0, parY = 0, prog = 0, progT = 0;
  function onScroll() {
    scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    progT = Math.max(0, Math.min(1, scrollY / max));
  }

  function draw(t) {
    t = (t || 0) / 1000;
    parY += (scrollY - parY) * 0.08;         // smoothed parallax
    prog += (progT - prog) * 0.06;           // smoothed reading progress
    var p = prog, pe = p * p * (3 - 2 * p);  // eased

    // sky
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix(TOP_N, TOP_D, pe * 0.85));
    g.addColorStop(1, mix(BOT_N, BOT_D, pe));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // rising light (dawn)
    var sunY = H * (1.12 - pe * 0.5) - parY * 0.04;
    var glow = ctx.createRadialGradient(W * 0.5, sunY, 0, W * 0.5, sunY, H * 0.85);
    var ga = 0.07 + 0.20 * pe;
    glow.addColorStop(0, 'rgba(255,196,110,' + ga.toFixed(3) + ')');
    glow.addColorStop(0.5, 'rgba(255,170,90,' + (ga * 0.4).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // clouds (soft parallax blobs)
    ctx.globalCompositeOperation = 'lighter';
    clouds.forEach(function (c) {
      var cx = ((c.x + c.sp * t) % 1 + 1) % 1 * W;
      var cy = c.y * H - parY * c.depth;
      cy = ((cy % (H * 1.6)) + H * 1.6) % (H * 1.6) - H * 0.3;
      var rr = c.r * H;
      var rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      var col = c.warm ? '255,180,120' : '150,170,210';
      rad.addColorStop(0, 'rgba(' + col + ',' + (c.a * (0.5 + 0.5 * pe)).toFixed(3) + ')');
      rad.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = rad; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.283); ctx.fill();
    });

    // motes (drifting light)
    motes.forEach(function (m) {
      var x = m.x * W + Math.sin(t * m.sws + m.swp) * m.sway;
      var y = m.y * H - (t * m.rise) - parY * m.depth;
      y = ((y % (H + 40)) + (H + 40)) % (H + 40);   // wrap
      var tw = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * m.tws + m.tw));
      var a = tw * (0.5 + 0.5 * pe) * (m.white ? 0.7 : 0.85);
      var col = m.white ? '235,240,255' : '255,214,150';
      var rr = m.r * (1 + pe * 0.4);
      var rad = ctx.createRadialGradient(x, y, 0, x, y, rr * 4);
      rad.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')');
      rad.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = rad; ctx.beginPath(); ctx.arc(x, y, rr * 4, 0, 6.283); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    raf = requestAnimationFrame(draw);
  }

  var raf;
  size(); onScroll();
  window.addEventListener('resize', size);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(draw);
  });
  draw(0);   // paint an initial frame immediately (also starts the rAF loop)
})();

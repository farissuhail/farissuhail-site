/* Petrolhead Technica · anatomy poster viewer for the vehicle studios.
 *
 * Drops an "Anatomy poster" pill next to the studio's exit link and opens the
 * matching cutaway in a full-screen viewer with zoom, the full-size original and
 * a PNG download. Nothing here touches the 3D studio: it only reads the poster
 * data attributes off <main class="gt3-studio"> and appends its own nodes.
 *
 * Display uses the same-size WebP copy (assets/technica/anatomy/web/), so the
 * callout labels stay at full pixel resolution while the page stays light;
 * "Open original" and "Download PNG" always point at the untouched PNG.
 *
 * Text follows the site's data-en / data-bm pattern and the shared `fs-lang`
 * preference, so a studio opened after switching to BM on the hub comes up in BM.
 */
(function () {
  'use strict';

  var DIR = 'assets/technica/anatomy/';
  var T = {
    open:    { en: 'Anatomy poster',   bm: 'Poster anatomi' },
    zin:     { en: 'Zoom in',          bm: 'Besarkan' },
    zout:    { en: 'Zoom out',         bm: 'Kecilkan' },
    fit:     { en: 'Fit',              bm: 'Muat' },
    orig:    { en: 'Open full size',   bm: 'Buka saiz penuh' },
    dl:      { en: 'Download PNG',     bm: 'Muat turun PNG' },
    close:   { en: 'Close',            bm: 'Tutup' },
    caption: { en: 'Illustrative cutaway · not factory CAD', bm: 'Keratan rentas ilustrasi · bukan CAD kilang' }
  };
  var ICON_POSTER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>';
  var ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>';
  var ICON_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';

  var STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

  function lang() {
    var l = document.documentElement.getAttribute('data-lang');
    if (l !== 'bm' && l !== 'en') { try { l = localStorage.getItem('fs-lang'); } catch (e) { l = null; } }
    return l === 'bm' ? 'bm' : 'en';
  }
  function label(el, key) {
    el.setAttribute('data-en', T[key].en);
    el.setAttribute('data-bm', T[key].bm);
    el.textContent = T[key][lang()];
    return el;
  }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  function init() {
    var root = document.querySelector('.gt3-studio[data-poster-file]');
    if (!root) return;

    var cfg = {
      file: root.dataset.posterFile,
      w: Number(root.dataset.posterW) || 0,
      h: Number(root.dataset.posterH) || 0,
      title: { en: root.dataset.posterTitleEn || '', bm: root.dataset.posterTitleBm || root.dataset.posterTitleEn || '' },
      alt: { en: root.dataset.posterAltEn || '', bm: root.dataset.posterAltBm || root.dataset.posterAltEn || '' }
    };
    if (!cfg.file) return;
    var png = DIR + cfg.file;
    var webp = DIR + 'web/' + cfg.file.replace(/\.png$/i, '.webp');

    /* ── the opening button, stacked with the studio's exit pill ─────────── */
    var stack = el('div', 'gt3-utility');
    var exit = root.querySelector('.gt3-exit');
    if (exit) exit.parentNode.insertBefore(stack, exit), stack.appendChild(exit);
    else root.appendChild(stack);

    var openBtn = el('button', 'ap-open');
    openBtn.type = 'button';
    openBtn.id = 'anatomyPosterButton';
    openBtn.innerHTML = ICON_POSTER + '<span class="ap-open-text"></span>';
    label(openBtn.querySelector('.ap-open-text'), 'open');
    openBtn.setAttribute('aria-haspopup', 'dialog');
    openBtn.setAttribute('aria-label', cfg.title[lang()]);   /* the title already says "anatomy poster" */
    stack.appendChild(openBtn);

    /* ── the viewer ─────────────────────────────────────────────────────── */
    var view = el('div', 'ap-viewer');
    view.id = 'anatomyPosterViewer';
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-modal', 'true');
    view.setAttribute('aria-labelledby', 'apTitle');
    view.setAttribute('aria-hidden', 'true');
    view.innerHTML =
      '<div class="ap-scrim" data-ap="close"></div>' +
      '<div class="ap-inner">' +
        '<div class="ap-bar">' +
          '<span class="ap-title" id="apTitle"></span>' +
          '<span class="ap-zoom">' +
            '<button type="button" class="ap-step" data-ap="zoom-out">' + ICON_MINUS + '</button>' +
            '<span class="ap-level" aria-live="polite"></span>' +
            '<button type="button" class="ap-step" data-ap="zoom-in">' + ICON_PLUS + '</button>' +
            '<button type="button" data-ap="fit"></button>' +
          '</span>' +
          '<a class="ap-orig" target="_blank" rel="noopener"></a>' +
          '<a class="ap-dl"></a>' +
          '<button type="button" class="ap-close" data-ap="close"></button>' +
        '</div>' +
        '<div class="ap-stage"><img alt="" decoding="async" /></div>' +
        '<p class="ap-caption"></p>' +
      '</div>';
    document.body.appendChild(view);

    var q = function (s) { return view.querySelector(s); };
    var titleEl = q('.ap-title'), stage = q('.ap-stage'), img = stage.querySelector('img'),
        levelEl = q('.ap-level'), zoomIn = q('[data-ap="zoom-in"]'), zoomOut = q('[data-ap="zoom-out"]'),
        fitBtn = q('[data-ap="fit"]'), origLink = q('.ap-orig'), dlLink = q('.ap-dl'), closeBtn = q('.ap-close');

    label(fitBtn, 'fit'); label(origLink, 'orig'); label(dlLink, 'dl');
    label(closeBtn, 'close'); label(q('.ap-caption'), 'caption');
    zoomIn.setAttribute('aria-label', T.zin[lang()]); zoomIn.title = T.zin[lang()];
    zoomOut.setAttribute('aria-label', T.zout[lang()]); zoomOut.title = T.zout[lang()];
    origLink.href = png;
    dlLink.href = png;
    dlLink.setAttribute('download', cfg.file);
    if (cfg.w && cfg.h) { img.width = cfg.w; img.height = cfg.h; }
    /* browsers without WebP fall back to the original PNG */
    img.addEventListener('error', function onerr() { img.removeEventListener('error', onerr); img.src = png; });

    var isOpen = false, scale = 0, returnFocus = null;   /* scale 0 = fit to stage */

    /* "Fit" is width-based, matching the CSS (max-width:100%, height:auto): a tall
       poster stays as wide as the stage and the stage scrolls, which is what keeps
       the callout labels legible on a phone. */
    function fitScale() {
      if (!cfg.w) return 1;
      var rendered = img.offsetWidth;              /* what the CSS actually produced */
      if (rendered > 0) return Math.min(rendered / cfg.w, 1);
      var sw = stage.clientWidth - 28;
      return sw > 0 ? Math.min(sw / cfg.w, 1) : 1; /* stage not laid out yet */
    }
    function effective() { return scale || fitScale(); }
    function applyZoom(keepCentre) {
      var before = { x: stage.scrollLeft + stage.clientWidth / 2, y: stage.scrollTop + stage.clientHeight / 2,
                     w: Math.max(1, img.offsetWidth), h: Math.max(1, img.offsetHeight) };
      if (scale) { stage.classList.add('is-zoomed'); img.style.width = Math.round(cfg.w * scale) + 'px'; img.style.height = 'auto'; }
      else { stage.classList.remove('is-zoomed'); img.style.width = ''; img.style.height = ''; }
      levelEl.textContent = Math.round(effective() * 100) + '%';
      zoomIn.disabled = effective() >= STEPS[STEPS.length - 1] - 1e-6;
      zoomOut.disabled = effective() <= STEPS[0] + 1e-6;
      fitBtn.setAttribute('aria-pressed', String(!scale));
      if (keepCentre) {
        var rx = before.x / before.w, ry = before.y / before.h;
        stage.scrollLeft = rx * img.offsetWidth - stage.clientWidth / 2;
        stage.scrollTop = ry * img.offsetHeight - stage.clientHeight / 2;
      }
    }
    function step(dir) {
      var cur = effective(), next = null;
      if (dir > 0) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i] > cur + 1e-6) { next = STEPS[i]; break; } }
      else { for (var j = STEPS.length - 1; j >= 0; j--) if (STEPS[j] < cur - 1e-6) { next = STEPS[j]; break; } }
      if (next === null) return;
      scale = next;
      applyZoom(true);
    }

    function open() {
      var L = lang();
      returnFocus = document.activeElement;
      titleEl.textContent = cfg.title[L];
      img.alt = cfg.alt[L];
      if (!img.src) img.src = webp;              /* fetched the first time the viewer is opened */
      scale = 0;
      view.classList.add('is-open');
      view.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      isOpen = true;
      stage.scrollTop = stage.scrollLeft = 0;
      applyZoom(false);
      try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); }
    }
    function close() {
      if (!isOpen) return;
      view.classList.remove('is-open');
      view.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      isOpen = false;
      var back = returnFocus && document.contains(returnFocus) ? returnFocus : openBtn;
      returnFocus = null;
      try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); }
    }

    openBtn.addEventListener('click', open);
    view.addEventListener('click', function (e) {
      var act = e.target.closest ? e.target.closest('[data-ap]') : null;
      if (!act) return;
      var a = act.dataset.ap;
      if (a === 'close') close();
      else if (a === 'zoom-in') step(1);
      else if (a === 'zoom-out') step(-1);
      else if (a === 'fit') { scale = 0; stage.scrollTop = stage.scrollLeft = 0; applyZoom(false); }
    });
    /* click the poster to swap between fit and 1:1, the way the sneaker posters behave */
    img.addEventListener('click', function () { scale = scale ? 0 : 1; applyZoom(false); });
    window.addEventListener('resize', function () { if (isOpen && !scale) applyZoom(false); });

    /* while the viewer is open it owns the keyboard, so the studio's own shortcuts never fire */
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        var f = [zoomOut, zoomIn, fitBtn, origLink, dlLink, closeBtn].filter(function (n) { return !n.disabled; });
        var pos = f.indexOf(document.activeElement);
        var nx = e.shiftKey ? (pos <= 0 ? f.length - 1 : pos - 1) : (pos < 0 || pos === f.length - 1 ? 0 : pos + 1);
        e.preventDefault(); e.stopPropagation(); f[nx].focus();
        return;
      }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); e.stopPropagation(); step(1); return; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); e.stopPropagation(); step(-1); return; }
      if (e.key === '0') { e.preventDefault(); e.stopPropagation(); scale = 0; applyZoom(false); return; }
      var d = { ArrowDown: [0, 60], ArrowUp: [0, -60], ArrowRight: [60, 0], ArrowLeft: [-60, 0], PageDown: [0, 420], PageUp: [0, -420] }[e.key];
      if (d) { e.preventDefault(); e.stopPropagation(); stage.scrollBy(d[0], d[1]); }
    }, true);

    /* deep link from the hub: petrolhead-technica.html → r32-studio.html#anatomy-poster */
    function fromHash() { if (/^#anatomy-poster$/i.test(location.hash) && !isOpen) open(); }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* car-studio.js builds the studio markup when its module runs; wait for the
     exit pill so the button lands in the right place, then give up gracefully. */
  function boot(tries) {
    var root = document.querySelector('.gt3-studio[data-poster-file]');
    if (root && (root.querySelector('.gt3-exit') || tries > 20)) { init(); return; }
    if (tries > 20) return;
    requestAnimationFrame(function () { boot(tries + 1); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); });
  else boot(0);
})();

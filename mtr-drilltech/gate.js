/* MTR DRILLTECH access gate.
 *
 * Loaded (after access.js) by every page that needs an account: the rig
 * explorer and the HWU Level 2 simulator. A visitor without a valid session
 * is sent to login.html.
 *
 * This is a front-door lock for a static site, not server-side security:
 * the files behind it are still served to anyone who asks for them by URL.
 * Source: tools/mtr-drilltech-access/ — do not edit the published copy.
 */
(function () {
  'use strict';
  var KEY = 'mtr-access';
  var users = window.MTR_ACCESS || [];
  var script = document.currentScript;
  var base = script.src.replace(/gate\.js(\?.*)?$/, '');

  function session() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s || !(s.exp > Date.now())) return null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].u === s.u && users[i].h === s.k) return { user: s.u, expires: s.exp };
      }
    } catch (error) { /* storage unavailable: treated as signed out */ }
    return null;
  }

  function signOut() {
    try { localStorage.removeItem(KEY); } catch (error) { /* nothing stored */ }
    location.href = base + 'login.html';
  }

  window.mtrAccess = { session: session, signOut: signOut, key: KEY, base: base };
  if (script.hasAttribute('data-login')) return;

  var current = session();
  if (!current) {
    document.documentElement.style.visibility = 'hidden';
    var next = location.pathname + location.search + location.hash;
    if (window.stop) window.stop();
    location.replace(base + 'login.html?next=' + encodeURIComponent(next));
    return;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Sign out';
    button.title = 'Signed in as ' + current.user;
    button.setAttribute('style', 'position:fixed;right:10px;bottom:10px;z-index:9999;padding:6px 12px;' +
      'border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(11,32,39,.82);' +
      'color:#cfe3e0;font:600 11px/1 system-ui,sans-serif;letter-spacing:.04em;cursor:pointer');
    button.addEventListener('click', signOut);
    document.body.appendChild(button);
  });
})();

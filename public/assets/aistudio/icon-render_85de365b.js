/*
  icon-render.js - tampilkan ikon objek dengan urutan fallback:
    1) Hewan (cat === 'hewan')      -> emoji bawaan
    2) Ada di OpenMojiData           -> <img> SVG Base64 (tanda ≈ jika kualitasnya 'approx')
    3) Punya emoji bawaan            -> emoji bawaan
    4) Fallback "emoji:<karakter>"   -> emoji tersebut
    5) Selain itu                    -> KARTU BACAAN: 📖 + nama

  Muat SETELAH icons-data.js:
    <script src="icons-data.js"></script>
    <script src="icon-render.js"></script>

  Pakai:
    el.appendChild(OMIcon.make('Durian', '~', 'buah'));      // elemen DOM (disarankan)
    el.innerHTML = OMIcon.html('Bayam', '~', 'sayur');        // string HTML
    OMIcon.hasPicture('Durian', '~');                         // false -> jangan dipakai sebagai soal tebak gambar

  Ukuran mengikuti font-size elemen induk (1em), jadi sama dengan emoji biasa.
*/
(function (g) {
  'use strict';
  var OM = g.OpenMojiData || {}, META = g.OpenMojiMeta || {}, FB = g.OpenMojiFallback || {}, cache = {};

  var CSS = '.omi{width:1em;height:1em;object-fit:contain;vertical-align:-.12em;pointer-events:none;-webkit-user-drag:none}' +
    '.omi-w{position:relative;display:inline-block;line-height:1}' +
    '.omi-w[data-approx]::after{content:"≈";position:absolute;right:-.05em;bottom:-.05em;font:700 .26em/1 system-ui,sans-serif;' +
    'background:#fff;color:#6b4fd6;border-radius:.5em;padding:.12em .2em;box-shadow:0 1px 3px rgba(0,0,0,.25)}' +
    '.omi-card{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:.04em;min-width:1em;max-width:100%;' +
    'border:.03em dashed #b9a8ee;border-radius:.2em;background:#fff;padding:.06em .08em;line-height:1.05;text-align:center}' +
    '.omi-card .bk{font-size:.5em}.omi-card b{font-size:max(.17em,13px);font-weight:800;color:#4a3b5c;word-break:break-word}';

  function resolve(name, emoji, cat) {
    var hasEmoji = emoji && emoji !== '~';
    if (cat === 'hewan' && hasEmoji) return { t: 'emoji', v: emoji };
    if (OM[name]) return { t: 'img', src: OM[name], approx: !!(META[name] && META[name].q === 'approx') };
    if (hasEmoji) return { t: 'emoji', v: emoji };
    var fb = FB[name];
    if (fb && fb.indexOf('emoji:') === 0) return { t: 'emoji', v: fb.slice(6) };
    return { t: 'card' };
  }

  function build(r, name) {
    var d = document, n;
    if (r.t === 'img') {
      var im = d.createElement('img');
      im.className = 'omi'; im.src = r.src; im.alt = name; im.width = 64; im.height = 64;
      im.decoding = 'async'; im.draggable = false;
      n = d.createElement('span'); n.className = 'omi-w'; n.appendChild(im);
      if (r.approx) n.setAttribute('data-approx', '1');
      return n;
    }
    if (r.t === 'emoji') {
      n = d.createElement('span'); n.className = 'omi-e'; n.textContent = r.v; n.setAttribute('aria-label', name);
      return n;
    }
    n = d.createElement('span'); n.className = 'omi-card'; n.setAttribute('role', 'img'); n.setAttribute('aria-label', name);
    var bk = d.createElement('span'), b = d.createElement('b');
    bk.className = 'bk'; bk.textContent = '📖'; b.textContent = name;
    n.appendChild(bk); n.appendChild(b);
    return n;
  }

  // Elemen dibuat sekali per item lalu di-clone: cepat untuk grid besar di HP.
  function make(name, emoji, cat) {
    var k = name + '|' + (emoji || '') + '|' + (cat || '');
    if (!cache[k]) cache[k] = build(resolve(name, emoji, cat), name);
    return cache[k].cloneNode(true);
  }

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function html(name, emoji, cat) {
    var r = resolve(name, emoji, cat);
    if (r.t === 'img') return '<span class="omi-w"' + (r.approx ? ' data-approx="1"' : '') + '><img class="omi" src="' + r.src + '" alt="' + esc(name) + '" width="64" height="64" decoding="async" draggable="false"></span>';
    if (r.t === 'emoji') return '<span class="omi-e" aria-label="' + esc(name) + '">' + esc(r.v) + '</span>';
    return '<span class="omi-card" role="img" aria-label="' + esc(name) + '"><span class="bk">📖</span><b>' + esc(name) + '</b></span>';
  }

  function hasPicture(name, emoji, cat) { return resolve(name, emoji, cat).t !== 'card'; }

  function injectCSS() {
    if (document.getElementById('omi-css')) return;
    var s = document.createElement('style'); s.id = 'omi-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCSS); else injectCSS();
  }

  g.OMIcon = { make: make, html: html, resolve: resolve, hasPicture: hasPicture, css: CSS };
})(typeof window !== 'undefined' ? window : globalThis);

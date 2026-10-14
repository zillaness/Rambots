/**
 * @file viewer.js
 * @version 1.1
 * @author Sam Cao
 * @created 2026-10-14
 * @lastUpdated 2026-10-14
 * @description Turns the stacked slide/page list on a viewer page into a slideshow with keyboard, swipe, thumbnails, deep links, and full screen.
 * @aiUpdate Update @lastUpdated and @version. Append changelog at bottom.
 */
(function () {
  'use strict';
  var body = document.body;
  var deck = document.getElementById('deck');
  var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
  if (!slides.length) return;

  var unit = body.getAttribute('data-unit') || 'slide';
  var toolbar = document.querySelector('.toolbar');
  var controls = document.querySelector('.controls');
  var strip = document.querySelector('.strip');
  var prevBtn = controls.querySelector('.prev');
  var nextBtn = controls.querySelector('.next');
  var curEl = controls.querySelector('.cur');
  var modeBtns = toolbar.querySelectorAll('[data-mode]');
  var textToggle = document.getElementById('show-text');
  var fsBtn = document.getElementById('fullscreen');
  var idx = 0;
  var thumbs = [];

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* storage blocked: fall back to defaults */ }
    return null;
  }

  function fromHash() {
    var n = parseInt(String(location.hash).replace(/^#(?:\D*-)?/, ''), 10);
    return isNaN(n) ? null : Math.min(Math.max(n, 1), slides.length) - 1;
  }

  function preload(i) {
    var s = slides[i];
    if (!s) return;
    var img = s.querySelector('img');
    if (img && img.loading === 'lazy') img.loading = 'eager';
  }

  function show(i, opts) {
    idx = Math.min(Math.max(i, 0), slides.length - 1);
    slides.forEach(function (s, k) { s.classList.toggle('current', k === idx); });
    thumbs.forEach(function (t, k) { t.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
    curEl.textContent = String(idx + 1);
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === slides.length - 1;
    preload(idx); preload(idx + 1); preload(idx - 1);
    if (!opts || !opts.keepHash) history.replaceState(null, '', '#' + (idx + 1));
    if (opts && opts.scroll && body.classList.contains('mode-scroll')) {
      slides[idx].scrollIntoView({ block: 'start' });
    }
  }

  function setMode(mode) {
    body.classList.toggle('mode-show', mode === 'show');
    body.classList.toggle('mode-scroll', mode === 'scroll');
    Array.prototype.forEach.call(modeBtns, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false');
    });
    store('viewer-mode-' + unit, mode);
    measureChrome();
    if (mode === 'scroll') slides[idx].scrollIntoView({ block: 'start' });
  }

  // Height of everything that is not the slide, so a slide fits the viewport.
  function measureChrome() {
    var bar = document.querySelector('.bar');
    var h = (bar ? bar.offsetHeight : 0) + toolbar.offsetHeight + controls.offsetHeight + 60;
    document.documentElement.style.setProperty('--chrome', h + 'px');
  }

  function buildStrip() {
    slides.forEach(function (s, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Go to ' + unit + ' ' + (k + 1));
      var im = document.createElement('img');
      im.src = s.getAttribute('data-thumb');
      im.alt = '';
      im.loading = 'lazy';
      var n = document.createElement('span');
      n.textContent = String(k + 1);
      b.appendChild(im); b.appendChild(n);
      b.addEventListener('click', function () { show(k); });
      strip.appendChild(b);
      thumbs.push(b);
    });
  }

  // ---- wiring
  toolbar.hidden = false;
  controls.hidden = false;
  strip.hidden = false;
  if (unit !== 'slide') modeBtns[0].textContent = 'One ' + unit;
  buildStrip();

  prevBtn.addEventListener('click', function () { show(idx - 1); });
  nextBtn.addEventListener('click', function () { show(idx + 1); });
  Array.prototype.forEach.call(modeBtns, function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });
  textToggle.addEventListener('change', function () {
    body.classList.toggle('text-on', textToggle.checked);
    store('viewer-text', textToggle.checked ? '1' : '0');
  });

  if (deck.requestFullscreen) {
    fsBtn.addEventListener('click', function () {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (!body.classList.contains('mode-show')) setMode('show');
      deck.requestFullscreen().catch(function () {});
    });
  } else {
    fsBtn.hidden = true;
  }

  // Click a slide: left third goes back, the rest goes forward.
  deck.addEventListener('click', function (e) {
    if (!body.classList.contains('mode-show')) return;
    var frame = e.target.closest('.frame');
    if (!frame) return;
    var r = frame.getBoundingClientRect();
    show(e.clientX - r.left < r.width / 3 ? idx - 1 : idx + 1);
  });

  // Swipe on touch screens.
  var sx = null, sy = null;
  deck.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  deck.addEventListener('touchend', function (e) {
    if (sx === null || !body.classList.contains('mode-show')) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(dx < 0 ? idx + 1 : idx - 1);
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    var type = (e.target.type || '').toLowerCase();
    // Only text entry swallows keys; a focused checkbox or button still lets arrows move slides.
    if (tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (tag === 'input' && ['checkbox', 'radio', 'button', 'submit', 'reset'].indexOf(type) === -1) return;
    var k = e.key;
    if (body.classList.contains('mode-show') || document.fullscreenElement) {
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && tag !== 'button' && tag !== 'input')) { show(idx + 1); e.preventDefault(); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { show(idx - 1); e.preventDefault(); }
      else if (k === 'Home') { show(0); e.preventDefault(); }
      else if (k === 'End') { show(slides.length - 1); e.preventDefault(); }
    }
    if (k === 'f' || k === 'F') fsBtn.click();
  });

  window.addEventListener('hashchange', function () {
    var n = fromHash();
    if (n !== null && n !== idx) show(n, { keepHash: true, scroll: true });
  });
  window.addEventListener('resize', measureChrome);

  var start = fromHash();
  var mode = store('viewer-mode-' + unit) || body.getAttribute('data-default-mode') || 'show';
  textToggle.checked = store('viewer-text') === '1';
  body.classList.toggle('text-on', textToggle.checked);
  setMode(mode === 'scroll' ? 'scroll' : 'show');
  show(start === null ? 0 : start, { keepHash: start === null, scroll: true });
})();

/** CHANGELOG
 * v1.0 (2026-10-14): Initial release.
 * v1.1 (2026-10-14): Arrow keys keep working while the Show text checkbox has focus.
 */

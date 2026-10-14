/**
 * @file index.js
 * @version 1.1
 * @author Sam Cao
 * @created 2026-10-14
 * @lastUpdated 2026-10-14
 * @description Live search, type filter, and locked-item handling for the materials landing page.
 * @aiUpdate Update @lastUpdated and @version. Append changelog at bottom.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var q = document.getElementById('q');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var topics = Array.prototype.slice.call(document.querySelectorAll('.topic'));
  var empty = document.querySelector('.empty');
  var stats = document.querySelector('.stats');
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var type = '';
  if (!q) return;

  // Cards marked data-locked stay out of every view until the Konami unlock (assets/unlock.js).
  function available(c) {
    return !c.hasAttribute('data-locked') || root.classList.contains('unlocked');
  }

  function filter() {
    var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (c) {
      var hay = c.getAttribute('data-search');
      var ok = available(c) &&
        (!type || c.getAttribute('data-type') === type) &&
        terms.every(function (t) { return hay.indexOf(t) !== -1; });
      c.hidden = !ok;
      if (ok) shown++;
    });
    topics.forEach(function (t) {
      t.hidden = !t.querySelector('.card:not([hidden])');
    });
    empty.hidden = shown !== 0;
  }

  // Keep the stats line, filter counts, and search placeholder in step with what is available.
  function recount() {
    var counts = {}, total = 0, parts = [];
    cards.forEach(function (c) {
      if (!available(c)) return;
      var t = c.getAttribute('data-type');
      counts[t] = (counts[t] || 0) + 1;
      total++;
    });
    filterBtns.forEach(function (b) {
      var t = b.getAttribute('data-filter');
      var n = t ? (counts[t] || 0) : total;
      b.querySelector('span').textContent = String(n);
      if (t) {
        b.hidden = n === 0;
        if (n) parts.push(n + ' ' + b.getAttribute('data-noun'));
      }
    });
    if (type && !counts[type]) {
      type = '';
      filterBtns.forEach(function (o) { o.setAttribute('aria-pressed', o.getAttribute('data-filter') === '' ? 'true' : 'false'); });
    }
    if (stats) stats.textContent = parts.join(' · ');
    q.placeholder = 'Search ' + total + ' items  ( / )';
  }

  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      type = b.getAttribute('data-filter');
      filterBtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      filter();
    });
  });
  q.addEventListener('input', filter);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { q.value = ''; filter(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
  });
  document.addEventListener('materials:unlocked', function () { recount(); filter(); });

  recount();
  filter();
})();

/** CHANGELOG
 * v1.0 (2026-10-14): Initial release.
 * v1.1 (2026-10-14): Locked items (data-locked) hidden until unlock; counts, stats, and placeholder recomputed.
 */

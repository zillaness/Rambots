/**
 * @file unlock.js
 * @version 1.5
 * @author Sam Cao
 * @created 2026-10-14
 * @lastUpdated 2026-10-14
 * @description Easter egg: the Konami code reveals download links and locked items (an obscurity gate, not access control).
 * @aiUpdate Update @lastUpdated and @version. Append changelog at bottom.
 *
 * Keyboard: Up Up Down Down Left Right Left Right B A.
 * Touch: swipe up, up, down, down, left, right, left, right, then tap twice on the page header or a blank spot (not a card or button).
 * The unlock is remembered in this browser (localStorage) when storage is available.
 */
(function () {
  'use strict';
  var KEY = 'downloads-unlocked';
  var SEQ = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
  var recent = [];  // last SEQ.length inputs

  function remembered() {
    try { return window.localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function reveal() {
    Array.prototype.forEach.call(document.querySelectorAll('.gated'), function (el) { el.hidden = false; });
    document.documentElement.classList.add('unlocked');
    // index.js listens for this to show locked items and update its counts.
    document.dispatchEvent(new Event('materials:unlocked'));
  }

  // Keys typed into text fields are not part of the code; checkboxes and buttons do not count as typing.
  function isTyping(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = (t.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;
    if (tag !== 'input') return false;
    return ['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'file', 'color'].indexOf((t.type || 'text').toLowerCase()) === -1;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    // In full screen only the fullscreen element is drawn, so the toast has to live inside it.
    (document.fullscreenElement || document.body).appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2200);
    setTimeout(function () { t.remove(); }, 2700);
  }

  // The tap that completes the code is followed by a click, hit-tested after the newly revealed
  // cards have shifted the layout. Swallow that one click so it can't open a card by accident.
  function swallowNextClick() {
    var timer;
    function done() {
      document.removeEventListener('click', block, true);
      document.removeEventListener('pointerdown', done, true);
      document.removeEventListener('touchstart', done, true);
      clearTimeout(timer);
    }
    function block(ev) { ev.preventDefault(); ev.stopPropagation(); done(); }
    document.addEventListener('click', block, true);
    // A tap that drifted too far gets no click at all; disarm as soon as the next gesture starts
    // so the visitor's next real tap is never eaten.
    document.addEventListener('pointerdown', done, true);
    document.addEventListener('touchstart', done, { capture: true, passive: true });
    timer = setTimeout(done, 800);
  }

  function unlock() {
    try { window.localStorage.setItem(KEY, '1'); } catch (e) { /* unlocked for this page only */ }
    reveal();
    toast('Downloads unlocked');
  }

  // Length of the longest start of SEQ that the most recent inputs end with, so stray
  // keys before the code (e.g. an extra Up while scrolling) never eat part of it.
  function progress() {
    for (var k = Math.min(recent.length, SEQ.length); k > 0; k--) {
      var ok = true;
      for (var i = 0; i < k; i++) {
        if (recent[recent.length - k + i] !== SEQ[i]) { ok = false; break; }
      }
      if (ok) return k;
    }
    return 0;
  }

  function feed(step) {
    if (document.documentElement.classList.contains('unlocked')) return;
    recent.push(step);
    if (recent.length > SEQ.length) recent.shift();
    if (progress() === SEQ.length) { recent = []; unlock(); }
  }

  if (remembered()) reveal();

  var keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', b: 'b', B: 'b', a: 'a', A: 'a' };
  document.addEventListener('keydown', function (e) {
    if (isTyping(e.target)) return;
    if (keys[e.key]) feed(keys[e.key]);
    else if (e.key !== 'Shift') feed('other');
  });

  // Touch: swipes map to arrows. Taps map to B then A: on the page header at any time, or anywhere
  // that is not a control once the eight swipes have matched (stray swipes can scroll the header away).
  var sx = null, sy = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    sx = sy = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) {
      var el = e.target.closest ? e.target : null;
      if (!el || el.closest('a, button, input, select, textarea, label')) return;
      if (progress() >= SEQ.length - 2 || el.closest('.hero, .bar')) {
        var wasLocked = !document.documentElement.classList.contains('unlocked');
        feed(progress() === SEQ.length - 1 ? 'a' : 'b');
        if (wasLocked && document.documentElement.classList.contains('unlocked')) swallowNextClick();
      }
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) feed(dx < 0 ? 'left' : 'right');
    else feed(dy < 0 ? 'up' : 'down');
  }, { passive: true });
})();

/** CHANGELOG
 * v1.0 (2026-10-14): Initial release.
 * v1.1 (2026-10-14): Dispatch materials:unlocked so the landing page can reveal locked items.
 * v1.2 (2026-10-14): Match the code against the last 10 inputs so stray keys before it (e.g. an odd number of Ups) no longer break it.
 * v1.3 (2026-10-14): Closing taps work anywhere off-control after the swipes; checkbox focus no longer blocks the code; toast shows in full screen.
 * v1.4 (2026-10-14): Swallow the click that follows the unlocking tap so it cannot open a newly revealed card.
 * v1.5 (2026-10-14): Disarm that click swallow on the next pointerdown/touchstart so a drifted unlocking tap never eats a later tap.
 */

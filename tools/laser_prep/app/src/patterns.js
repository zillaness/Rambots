/**
 * @file patterns.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Calibration and test patterns for the laser prep app: 4 in test square, kerf comb, press-fit comb, and an 8-color power and speed grid.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  // The ULS color table's eight pens. The first seven are pure RGB values; orange is the common
  // driver value but was not confirmed by any source, so check it against your UCP color table.
  const ULS_COLORS = [
    { name: 'black', rgb: [0, 0, 0] }, { name: 'red', rgb: [255, 0, 0] }, { name: 'green', rgb: [0, 255, 0] },
    { name: 'yellow', rgb: [255, 255, 0] }, { name: 'blue', rgb: [0, 0, 255] }, { name: 'magenta', rgb: [255, 0, 255] },
    { name: 'cyan', rgb: [0, 255, 255] }, { name: 'orange', rgb: [255, 102, 0], unverified: true },
  ];

  const rect = (x, y, w, h) => LP.joints.polySegs([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
  const line = (a, b) => ({ k: 'L', a, b, layer: 'pattern', eid: 0 });
  const tag = (segs, color) => segs.map(s => Object.assign(s, { layer: 'pattern:' + color }));

  /** Build an object from segments that carry their color in the layer name ("pattern:red"). */
  function patternObject(name, segs, fills, params) {
    const job = LP.analyze({ kind: 'gen', units: 1, segs, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
    const o = LP.doc.makeObject('pattern', job, { name, params: Object.assign({ pattern: name }, params || {}) });
    const colorOf = item => { const l = item.segs[0].layer || ''; return l.startsWith('pattern:') ? l.slice(8) : null; };
    for (const L of job.loops) {
      const c = colorOf(L), fill = (fills || []).find(f => LP.pointInPoly(L.sample, f.poly) && L.depth === 0);
      o.assign[L.id] = { outline: fill ? null : c, inside: fill ? fill.color : null };
    }
    for (const c of job.open) o.assign[c.id] = { outline: colorOf(c) };
    return o;
  }

  /**
   * Text segments shifted to (x, y), colored for vector engraving with the single-line font. Hershey has
   * no "+" glyph, so a leading plus sign is drawn as two short strokes.
   */
  function label(text, x, y, cap, color) {
    const plus = text.startsWith('+'), body = plus ? text.slice(1) : text;
    const out = LP.fonts.layout({ text: body, fontId: 'hershey', cap, align: 'center' });
    const lay = 'pattern:' + (color || 'black');
    const segs = out.segs.map(s => Object.assign(s.k === 'L' ? { k: 'L', a: [s.a[0] + x, s.a[1] + y], b: [s.b[0] + x, s.b[1] + y] } : s, { layer: lay, eid: 0 }));
    if (plus) {
      const left = Math.min(...segs.flatMap(s => [s.a[0], s.b[0]])), r = cap * 0.3, cx = left - cap * 0.45, cy = y + cap / 2;
      segs.push({ k: 'L', a: [cx - r, cy], b: [cx + r, cy], layer: lay, eid: 0 }, { k: 'L', a: [cx, cy - r], b: [cx, cy + r], layer: lay, eid: 0 });
    }
    return segs;
  }

  function testSquare() {
    return patternObject('Test square 4 in', tag(rect(0, 0, 4, 4), 'red'));
  }

  /**
   * Kerf comb: a strip cut into `count` pieces. Push the pieces together after cutting; the gap left at the
   * end divided by `count` is the kerf.
   */
  function kerfComb(opts) {
    const o = Object.assign({ count: 10, width: 0.4, height: 1.5 }, opts || {}), W = o.count * o.width;
    const segs = tag(rect(0, 0, W, o.height), 'red');
    for (let i = 1; i < o.count; i++) segs.push(Object.assign(line([i * o.width, 0], [i * o.width, o.height]), { layer: 'pattern:red' }));
    segs.push(...label(`KERF COMB ${o.count}`, W / 2, o.height + 0.08, 0.12, 'black'));
    return patternObject('Kerf comb', segs, null, o);
  }

  /** Press-fit comb: slots from thickness + from to thickness + to, labeled in thousandths of an inch. */
  function fitComb(opts) {
    const o = Object.assign({ thickness: 0.125, from: -0.01, to: 0.01, step: 0.002, depth: 0.6, pitch: 0.55 }, opts || {});
    const steps = [];
    for (let d = o.from; d <= o.to + 1e-9; d += o.step) steps.push(Math.round(d * 1000) / 1000);
    const W = (steps.length + 1) * o.pitch, Hh = o.depth + 0.55;
    const plate = [[0, 0], [W, 0], [W, Hh], [0, Hh]];
    const cuts = steps.map((d, i) => {
      const cx = (i + 1) * o.pitch, sw = o.thickness + d;
      return [[cx - sw / 2, Hh - o.depth], [cx + sw / 2, Hh - o.depth], [cx + sw / 2, Hh + 0.01], [cx - sw / 2, Hh + 0.01]];
    });
    const segs = [];
    for (const poly of LP.clip.difference([plate], cuts)) segs.push(...tag(LP.joints.polySegs(poly, true), 'red'));
    steps.forEach((d, i) => segs.push(...label((d > 0 ? '+' : '') + Math.round(d * 1000), (i + 1) * o.pitch, 0.12, 0.13, 'black')));
    return patternObject(`Fit comb ${o.thickness} in`, segs, null, Object.assign(o, { steps }));
  }

  /**
   * Power and speed grid: one raster-filled square and one vector-cut ring per ULS color, left to right in
   * the order of ULS_COLORS. Set each color's power and speed in UCP, run it once, and compare.
   */
  function colorGrid(opts) {
    const o = Object.assign({ size: 0.5, gap: 0.2 }, opts || {}), segs = [], fills = [];
    ULS_COLORS.forEach((c, i) => {
      const x = i * (o.size + o.gap);
      const sq = [[x, o.size + o.gap], [x + o.size, o.size + o.gap], [x + o.size, 2 * o.size + o.gap], [x, 2 * o.size + o.gap]];
      segs.push(...tag(LP.joints.polySegs(sq, true), 'none'));
      fills.push({ poly: sq, color: c.name });
      const r = o.size / 2;
      segs.push({ k: 'A', c: [x + r, r], r: r * 0.9, a0: 0, a1: 0, ccw: true, layer: 'pattern:' + c.name, eid: 0 });
    });
    return patternObject('Color grid (8 ULS colors)', segs, fills, Object.assign(o, { colors: ULS_COLORS.map(c => c.name) }));
  }

  const PATTERNS = {
    square: { label: 'Test square (4 in)', make: testSquare },
    kerf: { label: 'Kerf comb', make: kerfComb },
    fit: { label: 'Press-fit comb', make: fitComb },
    colors: { label: 'Color grid (power and speed)', make: colorGrid },
  };

  LP.patterns = { ULS_COLORS, PATTERNS, testSquare, kerfComb, fitComb, colorGrid };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release. Plus signs drawn as strokes (Hershey has no + glyph).
 */

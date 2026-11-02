/**
 * @file phase2_unit.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Node tests for the Phase 2 modules: geometry wrapper, document model, shapes, fonts and text, joints and kerf, images, patterns, nesting, color import, and multi-object output.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 *
 * Usage: node phase2_unit.js [section ...]    (no sections = all)
 */
'use strict';
const { load } = require('./load_app.js');
const LP = load();

const want = process.argv.slice(2);
let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? '  ' + detail : ''}`);
}
const near = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 1e-6 : t);
const sections = {};
function section(name, fn) { sections[name] = fn; }

section('clip', () => {
  const sq = [[0, 0], [2, 0], [2, 2], [0, 2]];
  check('area of 2 in square', near(Math.abs(LP.clip.area(sq)), 4, 1e-6));
  const grown = LP.clip.offset([sq], 0.1);
  check('miter offset grows square to 2.2 in', grown.length === 1 && near(LP.clip.totalArea(grown), 2.2 * 2.2, 1e-4), LP.clip.totalArea(grown).toFixed(5));
  const u = LP.clip.union([sq, [[1, 1], [3, 1], [3, 3], [1, 3]]]);
  check('union of overlapping squares', u.length === 1 && near(LP.clip.totalArea(u), 7, 1e-6));
  const d = LP.clip.difference([sq], [[[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5]]]);
  const r = LP.clip.rings(d);
  check('difference keeps one outer with one hole', r.length === 1 && r[0].holes.length === 1);
});

section('doc', () => {
  const job = LP.shapes.shapeJob('rect', { w: 3, h: 1 });
  const o = LP.doc.makeObject('shape', job, { x: 1, y: 2 });
  let b = LP.doc.bbox(o);
  check('unrotated bbox at (1, 2), 3 x 1', near(b.x, 1) && near(b.y, 2) && near(b.w, 3) && near(b.h, 1));
  const m = LP.doc.mapper(o);
  const tl = m([0, 1]);
  check('local top-left maps to bed (1, 2)', near(tl[0], 1) && near(tl[1], 2));
  o.rot = 90;
  b = LP.doc.bbox(o);
  check('rotated 90: bbox 1 x 3 still at (1, 2)', near(b.x, 1) && near(b.y, 2) && near(b.w, 1, 1e-9) && near(b.h, 3, 1e-9));
  const inv = LP.doc.inverse(o), q = LP.doc.mapper(o)([2.2, 0.3]), back = inv(q);
  check('inverse undoes mapper', near(back[0], 2.2, 1e-9) && near(back[1], 0.3, 1e-9));
  o.scale = 2; o.rot = 0;
  b = LP.doc.bbox(o);
  check('scale 2 doubles the bbox', near(b.w, 6) && near(b.h, 2));
  const d = LP.doc.newDoc({ w: 24, h: 18 });
  const a = LP.shapes.makeShape('circle', { d: 2 }, { x: 0.25, y: 0.25 });
  d.objects.push(a);
  const res = LP.doc.copyGrid(d, [a.id], 2, 3, 0.25);
  check('copy grid 2 x 3 adds 5', res.added.length === 5 && d.objects.length === 6 && res.offBed === 0);
  const last = d.objects[5], lb = LP.doc.bbox(last);
  check('last copy at (4.75, 2.5)', near(lb.x, 0.25 + 2 * 2.25) && near(lb.y, 0.25 + 2.25));
  LP.doc.align(d, d.objects.map(o => o.id), 'left', 'selection');
  check('align left lines all up at x = 0.25', d.objects.every(o => near(LP.doc.bbox(o).x, 0.25)));
  d.objects.forEach((o, i) => { o.x = [0.25, 3, 10, 12, 5, 7][i]; o.y = 1; });
  LP.doc.distribute(d, d.objects.map(o => o.id), 'x');
  const xs = d.objects.map(o => LP.doc.bbox(o).x).sort((p, q) => p - q), gaps = xs.slice(1).map((x, i) => x - xs[i]);
  check('distribute gives equal gaps', gaps.every(g => near(g, gaps[0], 1e-9)), gaps.map(g => g.toFixed(3)).join(' '));
  const snap = LP.doc.snapshot(d); d.objects[0].x = 99; LP.doc.restore(d, snap);
  check('undo snapshot restores position', d.objects[0].x !== 99);
});

section('shapes', () => {
  const cases = [['rect', { w: 3, h: 2, r: 0.5 }, [3, 2]], ['circle', { d: 1.5 }, [1.5, 1.5]], ['ellipse', { w: 3, h: 1 }, [3, 1]],
    ['slot', { w: 2, h: 0.5 }, [2, 0.5]], ['slot', { w: 0.5, h: 2 }, [0.5, 2]], ['polygon', { n: 6, d: 2 }, null], ['star', { n: 5, d: 2, inner: 0.4 }, null]];
  for (const [type, p, size] of cases) {
    const job = LP.shapes.shapeJob(type, p);
    const ok = job.stats.loops === 1 && job.stats.openChains === 0 && (!size || (near(job.size[0], size[0], 1e-3) && near(job.size[1], size[1], 1e-3)));
    check(`${type} ${JSON.stringify(p)} is one closed loop${size ? ' of ' + size.join(' x ') : ''}`, ok, job.size.map(v => v.toFixed(4)).join(' x '));
  }
  const s = LP.shapes.makeShape('rect', { w: 2, h: 1 });
  s.assign[s.job.loops[0].id] = { outline: 'blue', inside: 'black' };
  LP.shapes.updateShape(s, { w: 4 });
  check('resizing a shape keeps its colors', s.assign[s.job.loops[0].id].outline === 'blue' && s.assign[s.job.loops[0].id].inside === 'black' && near(s.job.size[0], 4));
});

section('fonts', () => {
  LP.fonts.init();
  check('three bundled fonts', LP.fonts.registry.length === 3, LP.fonts.registry.map(f => f.name).join(', '));
  const o = LP.fonts.makeText({ text: 'O', fontId: 'label-sans', cap: 1 });
  const depths = o.job.stats.depths;
  check('Label Sans "O" is a loop with a counter (depths 0, 1)', JSON.stringify(depths) === '[0,1]', JSON.stringify(depths));
  const outer = o.job.loops.find(L => L.depth === 0), inner = o.job.loops.find(L => L.depth === 1);
  check('filled text: outer engraved, counter left bare', o.assign[outer.id].inside === 'black' && !o.assign[inner.id].inside);
  check('cap height 1 in: "O" is about 1 in tall', o.job.size[1] > 0.95 && o.job.size[1] < 1.1, o.job.size[1].toFixed(3));
  const h = LP.fonts.makeText({ text: 'HI', fontId: 'label-sans', cap: 0.5 });
  check('"HI" has 2 loops, both outer', h.job.stats.loops === 2 && h.job.stats.depths.every(d => d === 0));
  check('"H" cap height is exact', near(h.job.size[1], 0.5, 0.002), h.job.size[1].toFixed(4));
  const st = LP.fonts.makeText({ text: 'O', fontId: 'allerta-stencil', cap: 1 });
  check('stencil "O" has no counter (bridges): every loop is outer', st.job.stats.depths.every(d => d === 0) && st.job.stats.loops >= 2, JSON.stringify(st.job.stats.depths));
  const he = LP.fonts.makeText({ text: 'A1', fontId: 'hershey', cap: 0.5 });
  check('Hershey is open strokes, colored as vector engrave', he.job.stats.loops === 0 && he.job.stats.openChains >= 3 && he.job.open.every(c => he.assign[c.id].outline === 'black'), he.job.stats.openChains + ' strokes');
  check('Hershey cap height', near(he.job.size[1], 0.5, 0.01), he.job.size[1].toFixed(3));
  const miss = LP.fonts.makeText({ text: 'A&B', fontId: 'label-sans', cap: 0.3 });
  check('missing characters are reported', miss.missing.includes('&'), JSON.stringify(miss.missing));
  const two = LP.fonts.makeText({ text: 'AB\nCD', fontId: 'label-sans', cap: 0.3, line: 2 });
  check('two lines stack: height about cap x 3', near(two.job.size[1], 0.3 + 0.6, 0.03), two.job.size[1].toFixed(3));
  const wide = LP.fonts.makeText({ text: 'II', fontId: 'label-sans', cap: 0.3, spacing: 0.5 });
  const tight = LP.fonts.makeText({ text: 'II', fontId: 'label-sans', cap: 0.3, spacing: 0 });
  check('letter spacing adds width', near(wide.job.size[0] - tight.job.size[0], 0.5, 1e-6), (wide.job.size[0] - tight.job.size[0]).toFixed(4));
  // Text on an arc: every glyph's points sit between radius R and R + cap (outside, top).
  const R = 2, arc = LP.fonts.makeText({ text: 'RAMBOTS', fontId: 'label-sans', cap: 0.3, path: { type: 'arc', radius: R, side: 'top' } });
  const rs = [];
  for (const L of arc.job.loops) for (const p of L.poly) rs.push(Math.hypot(p[0], p[1]));
  check('arc text sits on radius 2 to 2.3', Math.min(...rs) > R - 0.02 && Math.max(...rs) < R + 0.32, Math.min(...rs).toFixed(3) + '..' + Math.max(...rs).toFixed(3));
  const cy = (arc.job.box[1] + arc.job.box[3]) / 2;
  check('top arc text is above the center', cy > 0);
  const bot = LP.fonts.makeText({ text: 'RAMBOTS', fontId: 'label-sans', cap: 0.3, path: { type: 'arc', radius: R, side: 'bottom' } });
  const rb = [];
  for (const L of bot.job.loops) for (const p of L.poly) rb.push(Math.hypot(p[0], p[1]));
  check('bottom arc text sits inside radius 2 (tops toward center)', Math.max(...rb) < R + 0.02 && Math.min(...rb) > R - 0.32 && (bot.job.box[1] + bot.job.box[3]) / 2 < 0, Math.min(...rb).toFixed(3) + '..' + Math.max(...rb).toFixed(3));
  const pl = LP.fonts.makeText({ text: 'ABC', fontId: 'label-sans', cap: 0.2, path: { type: 'polyline', pts: [[0, 0], [4, 0]], align: 'start' } });
  check('text along a straight polyline from its start', near(pl.job.box[0], 0, 0.03) && near(pl.job.box[1], 0, 0.01), pl.job.box.map(v => v.toFixed(3)).join(','));
});

section('joints', () => {
  const sq = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const pieces = LP.joints.splitForTabs(sq, 4, 0.1);
  const len = pts => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const cutLen = pieces.reduce((a, p) => a + len(p), 0);
  check('4 holding tabs of 0.1 in leave 4 cut pieces', pieces.length === 4, pieces.length);
  check('cut length = perimeter minus 4 x 0.1', near(cutLen, 16 - 0.4, 1e-6), cutLen.toFixed(4));
  const corners = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const ends = pieces.flatMap(p => [p[0], p[p.length - 1]]);
  check('no tab sits on a corner', ends.every(e => corners.every(c => Math.hypot(e[0] - c[0], e[1] - c[1]) > 0.08)));
  const grown = LP.joints.kerfPolys(sq, 0, 0.01), hole = LP.joints.kerfPolys(sq, 1, 0.01);
  check('kerf: outer 4 in square grows to 4.010 in', near(LP.clip.totalArea(grown), 4.01 * 4.01, 1e-5));
  check('kerf: a 4 in hole shrinks to 3.990 in', near(LP.clip.totalArea(hole), 3.99 * 3.99, 1e-5));

  const plate = LP.shapes.makeShape('rect', { w: 6, h: 3 });
  const L = plate.job.loops[0], bottomIdx = L.segs.findIndex(sg => sg.k === 'L' && near(sg.a[1], 0) && near(sg.b[1], 0));
  const r = LP.joints.fingerEdge(plate, L.id, bottomIdx, { thickness: 0.125, finger: 0.5, start: 'finger' });
  const area = LP.clip.totalArea(plate.job.loops.filter(x => x.depth === 0).map(x => x.poly));
  const notches = (r.fingers - 1) / 2;
  check(`finger edge: ${r.fingers} fingers, ${notches} notches 0.125 deep`, near(area, 18 - notches * r.width * 0.125, 1e-4), area.toFixed(4));
  check('finger edge keeps one closed outline and its red cut color', plate.job.loops.length === 1 && plate.assign[plate.job.loops[0].id].outline === 'red');

  const part = LP.shapes.makeShape('rect', { w: 4, h: 2 });
  const P0 = part.job.loops[0], topIdx = P0.segs.findIndex(sg => sg.k === 'L' && near(sg.a[1], 2) && near(sg.b[1], 2));
  const ts = LP.joints.tabAndSlot(part, P0.id, topIdx, { thickness: 0.125, width: 0.5, count: 2, clearance: 0.004 });
  const parea = LP.clip.totalArea(part.job.loops.map(x => x.poly));
  check('tab-and-slot: two 0.5 x 0.125 tabs added', near(parea, 8 + 2 * 0.5 * 0.125, 1e-4), parea.toFixed(4));
  const slotJob = LP.analyze({ kind: 'gen', units: 1, segs: ts.slots, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
  check('matching slots: 2 slots, 0.504 x 0.129', slotJob.stats.loops === 2 && slotJob.loops.every(x => near(x.area, 0.504 * 0.129, 1e-6)));
  const tabCenters = [1, 3], slotCenters = slotJob.loops.map(x => (x.box[0] + x.box[2]) / 2).sort((a, b) => a - b);
  check('slots line up with the tabs', slotCenters.every((c, i) => near(c, tabCenters[i], 1e-6)), slotCenters.join(','));

  // Box: mating edges alternate exactly; each corner cube belongs to one panel.
  const t = 0.125, panels = LP.joints.boxPanels({ w: 6, d: 4, h: 3, thickness: t, finger: 0.6 });
  const by = n => panels.find(p => p.name === n);
  const has = (p, pt) => p.polys.some(poly => LP.pointInPoly(pt, poly));
  check('box makes 6 panels', panels.length === 6, panels.map(p => p.name).join(' '));
  const pairs = [
    ['Bottom', s => [s, t / 2], 'Front', s => [s, t / 2], 6],
    ['Bottom', s => [t / 2, s], 'Left', s => [s, t / 2], 4],
    ['Front', s => [t / 2, s], 'Left', s => [t / 2, s], 3],
    ['Top', s => [s, t / 2], 'Front', s => [s, 3 - t / 2], 6],
  ];
  for (const [pn, pf, qn, qf, L] of pairs) {
    let bad = 0, samples = 0;
    for (let s = t + 0.013; s < L - t; s += 0.037) {
      samples++;
      if (has(by(pn), pf(s)) === has(by(qn), qf(s))) bad++;
    }
    check(`${pn} and ${qn} edges interlock (${samples} samples)`, bad <= 2, bad + ' clashes or gaps (segment boundaries allowed)');
  }
  const owners = ['Bottom', 'Front', 'Left'].filter(n => has(by(n), [t / 2, t / 2]));
  check('bottom-front-left corner cube belongs to one panel (Bottom)', owners.length === 1 && owners[0] === 'Bottom', owners.join(','));
  const open = LP.joints.boxPanels({ w: 6, d: 4, h: 3, thickness: t, finger: 0.6, openTop: true });
  check('open-top box makes 5 panels with a straight top edge', open.length === 5 && has(open.find(p => p.name === 'Front'), [3, 3 - t / 2]));
  const objs = LP.joints.makeBox({ w: 6, d: 4, h: 3, thickness: t, finger: 0.6 });
  check('box panels become cut objects', objs.length === 6 && objs.every(o => o.job.stats.loops === 1 && o.assign[o.job.loops[0].id].outline === 'red'));
});

module.exports = { section, check, near, LP };
if (require.main === module) {
  setImmediate(async () => {
    for (const [name, fn] of Object.entries(sections)) {
      if (want.length && !want.includes(name)) continue;
      console.log(`-- ${name}`);
      await fn();
    }
    console.log(`${pass}/${pass + fail} checks pass`);
    process.exit(fail ? 1 : 0);
  });
}

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */

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

/**
 * @file nest.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Auto-arrange for the laser prep app: rectangle packing (MaxRects) and greedy true-outline nesting ported from CutSheetCalculator, plus SVGnest's genetic search as a slower "pack tighter" option; every result is checked for overlaps and bed bounds.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const C = globalThis.ClipperLib, S = 1e5, EPS = 1e-9, AREA_TOL = 1e-7, SLIDE_TOP_N = 6;

  // ---------- helpers on integer Clipper paths ----------

  const toInt = poly => poly.map(p => ({ X: Math.round(p[0] * S), Y: Math.round(p[1] * S) }));
  const shift = (path, dx, dy) => path.map(p => ({ X: p.X + Math.round(dx * S), Y: p.Y + Math.round(dy * S) }));
  function interArea(a, b) {
    const c = new C.Clipper();
    c.AddPath(a, C.PolyType.ptSubject, true);
    c.AddPath(b, C.PolyType.ptClip, true);
    const out = new C.Paths();
    c.Execute(C.ClipType.ctIntersection, out, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
    return out.reduce((s, p) => s + Math.abs(C.Clipper.Area(p)), 0) / (S * S);
  }
  const boundsOf = poly => poly.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);

  function anglesFor(step) {
    if (step === 'free') return { coarse: range(0, 345, 15), refine: true };
    const s = Math.max(1, +step || 90);
    return { coarse: range(0, 360 - s, s), refine: false };
  }
  function range(a, b, s) { const out = []; for (let v = a; v <= b + 1e-9; v += s) out.push(v); return out; }

  // An item is one object or a bonded group, moved and rotated as one rigid body. Rotations are relative to
  // where the item sits now, about the top-left corner of its current outline (c0).
  function makeItem(objs) {
    const pts = [].concat(...objs.map(LP.doc.pagePoints));
    const c0 = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))];
    const polys = objs.map(o => { const fp = LP.doc.footprint(o, o.rot), b = LP.doc.bbox(o); return fp.poly.map(p => [p[0] + b.x, p[1] + b.y]); });
    return { objs, pts, polys, c0, name: objs.map(o => o.name).join(' + '), cache: {} };
  }

  /** Item outline rotated by deg, normalized so its bounding box corner is at (0, 0); minR is the shift that took. */
  function itemFp(item, deg) {
    const key = Math.round(((deg % 360) + 360) % 360 * 1e6) / 1e6;
    item.fpCache = item.fpCache || {};
    if (item.fpCache[key]) return item.fpCache[key];
    const th = (key * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th);
    const R = q => { const d0 = q[0] - item.c0[0], d1 = q[1] - item.c0[1]; return [d0 * c - d1 * sn, d0 * sn + d1 * c]; };
    const rp = item.pts.map(R);
    const minR = [Math.min(...rp.map(p => p[0])), Math.min(...rp.map(p => p[1]))], maxR = [Math.max(...rp.map(p => p[0])), Math.max(...rp.map(p => p[1]))];
    const rpolys = item.polys.map(poly => poly.map(R));
    let poly;
    if (rpolys.length === 1) poly = rpolys[0];
    else { const u = LP.clip.union(rpolys); poly = u.length === 1 ? u[0] : LP.clip.convexHull([].concat(...rpolys)); }
    const out = { a: key, base: poly.map(p => [p[0] - minR[0], p[1] - minR[1]]), w: maxR[0] - minR[0], h: maxR[1] - minR[1], minR };
    item.fpCache[key] = out;
    return out;
  }

  /** Rotate the item by deg about c0, then shift so its rotated outline corner lands at (cx, cy). */
  function placeItem(item, deg, cx, cy) {
    const fp = itemFp(item, deg), shift = [cx - fp.minR[0] - item.c0[0], cy - fp.minR[1] - item.c0[1]];
    for (const o of item.objs) LP.doc.rotateAbout(o, item.c0, fp.a, shift);
  }

  /** Footprint variants with the inflated outline used for spacing (cached per angle). */
  function variantFor(item, a, half) {
    const key = Math.round(((a % 360) + 360) % 360 * 1e6) / 1e6 + '|' + half;
    item.cache = item.cache || {};
    if (!item.cache[key]) {
      const fp = itemFp(item, a);
      const infl = half > 0 ? LP.clip.offset([fp.base], half, { join: 'miter', miter: 4 }) : [fp.base];
      const big = infl.reduce((m, p) => (Math.abs(LP.clip.area(p)) > Math.abs(LP.clip.area(m)) ? p : m), infl[0]);
      item.cache[key] = { a: fp.a, base: fp.base, w: fp.w, h: fp.h, inflInt: toInt(big), ib: boundsOf(big) };
    }
    return item.cache[key];
  }

  // ---------- greedy true-outline nester (port of CutSheetCalculator pack_poly._nest_shapely) ----------

  function greedy(items, sheet, opts) {
    const gap = opts.gap, half = gap / 2, m = opts.margin;
    const ub = [m, m, sheet.w - m, sheet.h - m], uw = ub[2] - ub[0], uh = ub[3] - ub[1];
    const { coarse, refine } = anglesFor(opts.rotation);
    const placed = [], placements = [], unplaced = [];

    const collides = (v, cx, cy) => {
      const ix0 = cx + v.ib[0], iy0 = cy + v.ib[1], ix1 = cx + v.ib[2], iy1 = cy + v.ib[3];
      let path = null;
      for (const q of placed) {
        if (ix0 < q.b[2] - 1e-7 && ix1 > q.b[0] + 1e-7 && iy0 < q.b[3] - 1e-7 && iy1 > q.b[1] + 1e-7) {
          path = path || shift(v.inflInt, cx, cy);
          if (interArea(path, q.path) > AREA_TOL) return true;
        }
      }
      return false;
    };
    const ok = (v, cx, cy) => cx >= ub[0] - EPS && cy >= ub[1] - EPS && cx + v.w <= ub[2] + EPS && cy + v.h <= ub[3] + EPS && !collides(v, cx, cy);

    function slide(v, x, y) {
      let moved = true, iters = 0;
      while (moved && iters < 6) {
        moved = false; iters++;
        for (const axis of ['y', 'x']) {
          let lo = 0, hi = axis === 'y' ? y - ub[1] : x - ub[0];
          const at = d => (axis === 'y' ? ok(v, x, y - d) : ok(v, x - d, y));
          if (hi > EPS && at(hi)) { if (axis === 'y') y -= hi; else x -= hi; moved = true; continue; }
          if (hi > EPS) {
            for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (at(mid)) lo = mid; else hi = mid; }
            if (lo > 1e-4) { if (axis === 'y') y -= lo; else x -= lo; moved = true; }
          }
        }
      }
      return [x, y];
    }

    function tryPlace(vars, cands, topN) {
      const found = [];
      for (const v of vars) {
        for (let [cx, cy] of cands) {
          cx = Math.max(cx, ub[0]); cy = Math.max(cy, ub[1]);
          if (cx + v.w > ub[2] + EPS || cy + v.h > ub[3] + EPS) continue;
          if (collides(v, cx, cy)) continue;
          found.push({ score: [cy + v.h, cx + v.w, v.a], v, cx, cy });
        }
      }
      if (!found.length) return null;
      const cmp = (p, q) => p.score[0] - q.score[0] || p.score[1] - q.score[1] || p.score[2] - q.score[2];
      found.sort(cmp);
      let best = null;
      for (const f of found.slice(0, topN)) {
        const [sx, sy] = slide(f.v, f.cx, f.cy);
        const cand = { score: [sy + f.v.h, sx + f.v.w, f.v.a], v: f.v, cx: sx, cy: sy };
        if (!best || cmp(cand, best) < 0) best = cand;
      }
      return best;
    }

    const order = items.slice().sort((p, q) => Math.abs(LP.clip.area(itemFp(q, 0).base)) - Math.abs(LP.clip.area(itemFp(p, 0).base)));
    for (const item of order) {
      const vars = coarse.map(a => variantFor(item, a, half)).filter(v => v.w <= uw + EPS && v.h <= uh + EPS);
      if (!vars.length) { unplaced.push(item); continue; }
      const cands = [[ub[0], ub[1]]];
      for (const q of placed) cands.push([q.b[2] + half, q.b[1] - half], [q.b[0] - half, q.b[3] + half], [q.b[2] + half, ub[1]], [ub[0], q.b[3] + half]);
      let best = tryPlace(vars, cands, SLIDE_TOP_N);
      if (!best) { unplaced.push(item); continue; }
      if (refine) {
        const fine = range(-7, 7, 1).filter(d => d).map(d => variantFor(item, best.v.a + d, half)).filter(v => v.w <= uw + EPS && v.h <= uh + EPS);
        for (const v of fine) {
          const hit = tryPlace([v], [[best.cx, best.cy], ...cands], 1);
          if (hit && (hit.score[0] < best.score[0] || (hit.score[0] === best.score[0] && hit.score[1] < best.score[1]))) best = hit;
        }
      }
      const path = shift(best.v.inflInt, best.cx, best.cy);
      placed.push({ path, b: [best.cx + best.v.ib[0], best.cy + best.v.ib[1], best.cx + best.v.ib[2], best.cy + best.v.ib[3]] });
      placements.push({ item, x: best.cx, y: best.cy, rot: best.v.a });
    }
    return { placements, unplaced };
  }

  // ---------- rectangle packer (port of CutSheetCalculator pack_rect MaxRectsBin) ----------

  function maxRects(items, sheet, opts) {
    const gap = opts.gap, m = opts.margin, W = sheet.w - 2 * m + gap, H = sheet.h - 2 * m + gap;
    let free = [{ x: 0, y: 0, w: W, h: H }];
    const placements = [], unplaced = [];
    const rotate = opts.rotation !== 0 && opts.rotation !== 'none';
    const order = items.slice().sort((p, q) => {
      const a = itemFp(p, 0), b = itemFp(q, 0);
      return Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h;
    });
    for (const item of order) {
      const f0 = itemFp(item, 0), options = [[f0.w + gap, f0.h + gap, 0]];
      if (rotate) { const f1 = itemFp(item, 90); options.push([f1.w + gap, f1.h + gap, 90]); }
      let best = null;
      for (const [w, h, a] of options) {
        for (const fr of free) {
          if (w <= fr.w + EPS && h <= fr.h + EPS) {
            const score = [Math.min(fr.w - w, fr.h - h), Math.max(fr.w - w, fr.h - h), fr.y, fr.x];
            if (!best || compare(score, best.score) < 0) best = { score, r: { x: fr.x, y: fr.y, w, h }, a };
          }
        }
      }
      if (!best) { unplaced.push(item); continue; }
      const r = best.r, next = [];
      for (const fr of free) {
        if (r.x >= fr.x + fr.w - EPS || r.x + r.w <= fr.x + EPS || r.y >= fr.y + fr.h - EPS || r.y + r.h <= fr.y + EPS) { next.push(fr); continue; }
        if (r.x > fr.x + EPS) next.push({ x: fr.x, y: fr.y, w: r.x - fr.x, h: fr.h });
        if (r.x + r.w < fr.x + fr.w - EPS) next.push({ x: r.x + r.w, y: fr.y, w: fr.x + fr.w - r.x - r.w, h: fr.h });
        if (r.y > fr.y + EPS) next.push({ x: fr.x, y: fr.y, w: fr.w, h: r.y - fr.y });
        if (r.y + r.h < fr.y + fr.h - EPS) next.push({ x: fr.x, y: r.y + r.h, w: fr.w, h: fr.y + fr.h - r.y - r.h });
      }
      free = next.filter((a, i) => !next.some((b, j) => i !== j && a.x >= b.x - EPS && a.y >= b.y - EPS && a.x + a.w <= b.x + b.w + EPS && a.y + a.h <= b.y + b.h + EPS && (b.w > a.w + EPS || b.h > a.h + EPS || j < i)));
      placements.push({ item, x: r.x + m, y: r.y + m, rot: best.a });
    }
    return { placements, unplaced };
  }
  function compare(p, q) { for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) return p[i] - q[i]; return 0; }

  // ---------- SVGnest (genetic search over no-fit-polygon placements) ----------

  const U = 100;   // SVGnest's area thresholds assume pixel-sized units, so work in hundredths of an inch

  function svgnest(items, sheet, opts) {
    const gap = opts.gap, half = gap / 2, m = opts.margin;
    const rotations = opts.rotation === 'free' ? 24 : Math.max(1, Math.round(360 / (+opts.rotation || 90)));
    const config = { clipperScale: 10000000, curveTolerance: 0.3, spacing: 0, rotations, populationSize: opts.population || 10, mutationRate: 10, useHoles: false, exploreConcave: false };
    const toNest = poly => poly.map(p => ({ x: p[0] * U, y: p[1] * U }));
    // Simplify to 0.01 in and grow by the same amount so the simpler outline still covers the part;
    // no-fit-polygon work grows with the square of the vertex count.
    const SIMPLIFY = 0.01;
    const parts = items.map((it, i) => {
      const fp = { poly: itemFp(it, 0).base };
      const simple = LP.clip.clean([fp.poly], SIMPLIFY)[0] || fp.poly;
      const infl = LP.clip.offset([simple], half + SIMPLIFY, { join: 'miter', miter: 4 });
      const big = infl.reduce((mx, p) => (Math.abs(LP.clip.area(p)) > Math.abs(LP.clip.area(mx)) ? p : mx), infl[0]);
      const poly = toNest(big);
      if (GeometryUtil.polygonArea(poly) > 0) poly.reverse();
      poly.id = i; poly.source = i;
      return poly;
    });
    const bw = (sheet.w - 2 * m + gap) * U, bh = (sheet.h - 2 * m + gap) * U;
    const bin = [{ x: 0, y: 0 }, { x: bw, y: 0 }, { x: bw, y: bh }, { x: 0, y: bh }];
    if (GeometryUtil.polygonArea(bin) > 0) bin.reverse();
    bin.id = -1; bin.width = bw; bin.height = bh;

    const adam = parts.slice().sort((a, b) => Math.abs(GeometryUtil.polygonArea(b)) - Math.abs(GeometryUtil.polygonArea(a)));
    const GA = new SvgNestCore.GeneticAlgorithm(adam, bin, config);
    let cache = {}, best = null, evaluated = 0;
    const deadline = Date.now() + (opts.timeMs || 4000);

    function evaluate(individual) {
      const list = individual.placement, rots = individual.rotation, ids = [];
      list.forEach((p, i) => { ids.push(p.id); p.rotation = rots[i]; });
      const next = {};
      const need = (A, B, inside, ar, br) => {
        const key = JSON.stringify({ A: A.id, B: B.id, inside, Arotation: ar, Brotation: br });
        if (cache[key]) { next[key] = cache[key]; return; }
        // nfpPair rotates A and B itself, so pass them unrotated.
        const res = SvgNestCore.nfpPair({ A, B, key: { A: A.id, B: B.id, inside, Arotation: ar, Brotation: br } }, false, false);
        if (res) next[key] = res.value;
      };
      list.forEach((p, i) => {
        need(bin, p, true, 0, rots[i]);
        for (let j = 0; j < i; j++) need(list[j], p, false, rots[j], rots[i]);
      });
      cache = next;
      const worker = new PlacementWorker(bin, list.slice(0), ids, rots, config, cache);
      if (typeof global === 'undefined') globalThis.global = globalThis;
      global.env = { self: worker };
      const result = worker.placePaths(list.slice(0));
      individual.fitness = result ? result.fitness : Infinity;
      evaluated++;
      if (result && (!best || result.fitness < best.fitness)) best = result;
    }

    return new Promise(resolve => {
      const tick = () => {
        const sliceEnd = Date.now() + 40;
        while (Date.now() < sliceEnd && Date.now() < deadline) {
          let ind = GA.population.find(p => !p.fitness);
          if (!ind) { GA.generation(); ind = GA.population[1]; }
          evaluate(ind);
        }
        if (opts.onProgress) opts.onProgress({ evaluated, fitness: best ? best.fitness : null, done: Date.now() >= deadline });
        if (Date.now() < deadline) setTimeout(tick, 0);
        else resolve(finish());
      };
      setTimeout(tick, 0);
    });

    function finish() {
      const placements = [], placedIds = new Set();
      if (best && best.placements.length) {
        for (const pos of best.placements[0]) {
          // SVGnest rotates the normalized outline (bed point minus c0) about the origin and shifts it by
          // (pos.x, pos.y) inside a bin whose corner sits at (m - half, m - half) on the bed.
          const item = items[pos.id], fp = itemFp(item, pos.rotation);
          placements.push({ item, rot: fp.a, x: pos.x / U + m - half + fp.minR[0], y: pos.y / U + m - half + fp.minR[1] });
          placedIds.add(pos.id);
        }
      }
      return { placements, unplaced: items.filter((_, i) => !placedIds.has(i)), evaluated };
    }
  }

  // ---------- check and apply ----------

  /** Overlaps (with the spacing) and parts outside the usable bed, measured on the final positions. Members of one bonded group may overlap each other. */
  function verify(doc, objs, gap) {
    const m = doc.margin, half = gap / 2, problems = [], polys = [];
    for (const o of objs) {
      const fp = LP.doc.footprint(o, o.rot), b = LP.doc.bbox(o);
      const poly = fp.poly.map(p => [p[0] + b.x, p[1] + b.y]);
      if (b.x < m - 1e-3 || b.y < m - 1e-3 || b.x + b.w > doc.bed.w - m + 1e-3 || b.y + b.h > doc.bed.h - m + 1e-3) problems.push(`${o.name} is outside the bed margin`);
      const infl = half > 0 ? LP.clip.offset([poly], half * 0.99, { join: 'miter', miter: 4 }) : [poly];
      polys.push({ o, path: toInt(infl[0] || poly), b: boundsOf(infl[0] || poly) });
    }
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const p = polys[i], q = polys[j];
        if (p.o.bond && p.o.bond === q.o.bond) continue;
        if (p.b[0] < q.b[2] && p.b[2] > q.b[0] && p.b[1] < q.b[3] && p.b[3] > q.b[1] && interArea(p.path, q.path) > 1e-6) problems.push(`${p.o.name} and ${q.o.name} are closer than the spacing`);
      }
    }
    return problems;
  }

  /** Does every item look like a plain rectangle? Then the rectangle packer does better. */
  const allRects = items => items.every(it => { const fp = itemFp(it, 0); return Math.abs(Math.abs(LP.clip.area(fp.base)) - fp.w * fp.h) < 0.005 * fp.w * fp.h; });

  /** Bonded groups become one item each; everything else is its own item. */
  function itemsFor(doc, objs) {
    const seen = new Set(), items = [];
    for (const o of objs) {
      if (seen.has(o)) continue;
      const members = o.bond ? doc.objects.filter(x => x.bond === o.bond) : [o];
      members.forEach(x => seen.add(x));
      items.push(makeItem(members));
    }
    return items;
  }

  /**
   * Arrange objects on the bed. opts: { engine: auto | rect | outline | svgnest, rotation: 0 | 90 | 45 | 30 | 15 | 5 | free,
   * gap, timeMs, onProgress }. Bonded groups move as one. Items that do not fit are stacked to the right of the bed and listed.
   */
  async function arrange(doc, ids, opts) {
    const o = Object.assign({ engine: 'auto', rotation: 90, gap: 0.1 }, opts || {}, { margin: doc.margin });
    if (o.rotation === 0) o.rotation = 360;
    const objs = doc.objects.filter(x => ids.includes(x.id)), items = itemsFor(doc, objs);
    let engine = o.engine;
    if (engine === 'auto') engine = allRects(items) ? 'rect' : 'outline';
    const res = engine === 'rect' ? maxRects(items, doc.bed, Object.assign({}, o, { rotation: o.rotation === 360 ? 0 : o.rotation })) : engine === 'svgnest' ? await svgnest(items, doc.bed, o) : greedy(items, doc.bed, o);
    for (const p of res.placements) placeItem(p.item, p.rot, p.x, p.y);
    let sy = doc.margin;
    for (const it of res.unplaced) {
      const fp = itemFp(it, 0);
      placeItem(it, 0, doc.bed.w + 0.5, sy);
      sy += fp.h + o.gap;
    }
    const placedObjs = [].concat(...res.placements.map(p => p.item.objs));
    return { engine, placed: res.placements.length, unplaced: res.unplaced.map(it => it.name), problems: verify(doc, placedObjs, o.gap), evaluated: res.evaluated };
  }

  LP.nest = { arrange, greedy, maxRects, svgnest, verify, allRects, makeItem, itemFp, placeItem };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release. Items are objects or bonded groups moved as rigid bodies (relative rotation about their corner).
 */

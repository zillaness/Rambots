/**
 * @file geom.js
 * @version 0.1
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Geometry core for the laser prep app: segments, units, duplicates, joining into loops, nesting, and unit suggestions (core design v1.1, sections 2, 4, 5).
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const TAU = Math.PI * 2;

  // Segments (inches once scaled, DXF orientation: y up):
  //   L line   { a:[x,y], b:[x,y] }
  //   A arc    { c:[x,y], r, a0, a1, ccw }   angles in radians; a0 == a1 means a full circle
  //   P poly   { pts:[[x,y],...] }           flattened splines and ellipses
  //   C cubic  { p:[p0,p1,p2,p3] }           from SVG paths
  // Every segment also carries { layer, eid } so counts can be per source entity.

  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

  function arcSweep(s) {
    let d = s.ccw ? s.a1 - s.a0 : s.a0 - s.a1;
    d = ((d % TAU) + TAU) % TAU;
    return d < 1e-12 ? TAU : d;
  }

  function arcPoint(s, t) {
    const ang = s.a0 + (s.ccw ? 1 : -1) * arcSweep(s) * t;
    return [s.c[0] + s.r * Math.cos(ang), s.c[1] + s.r * Math.sin(ang)];
  }

  function bez(p, t) {
    const u = 1 - t;
    return [0, 1].map(i => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]);
  }

  function start(s) {
    switch (s.k) {
      case 'L': return s.a;
      case 'A': return arcPoint(s, 0);
      case 'P': return s.pts[0];
      case 'C': return s.p[0];
    }
  }

  function end(s) {
    switch (s.k) {
      case 'L': return s.b;
      case 'A': return arcPoint(s, 1);
      case 'P': return s.pts[s.pts.length - 1];
      case 'C': return s.p[3];
    }
  }

  function middle(s) {
    switch (s.k) {
      case 'L': return [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];
      case 'A': return arcPoint(s, 0.5);
      case 'P': {
        const pts = s.pts, half = polyLength(pts) / 2;
        let run = 0;
        for (let i = 1; i < pts.length; i++) {
          const d = dist(pts[i - 1], pts[i]);
          if (run + d >= half && d > 0) {
            const t = (half - run) / d;
            return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])];
          }
          run += d;
        }
        return pts[pts.length - 1];
      }
      case 'C': return bez(s.p, 0.5);
    }
  }

  function polyLength(pts) {
    let n = 0;
    for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
    return n;
  }

  function reverse(s) {
    const meta = { layer: s.layer, eid: s.eid };
    switch (s.k) {
      case 'L': return { k: 'L', a: s.b, b: s.a, ...meta };
      case 'A': return { k: 'A', c: s.c, r: s.r, a0: s.a1, a1: s.a0, ccw: !s.ccw, ...meta };
      case 'P': return { k: 'P', pts: s.pts.slice().reverse(), ...meta };
      case 'C': return { k: 'C', p: s.p.slice().reverse(), ...meta };
    }
  }

  function isClosedSeg(s, tol) {
    if (s.k === 'A') return arcSweep(s) >= TAU - 1e-9;
    return dist(start(s), end(s)) <= tol && (s.k !== 'L');
  }

  /** Points along a segment, including both ends. tol is the allowed chord error. */
  function flatten(s, tol) {
    switch (s.k) {
      case 'L': return [s.a, s.b];
      case 'A': {
        const sw = arcSweep(s);
        const step = s.r > tol ? 2 * Math.acos(Math.max(-1, 1 - tol / s.r)) : sw;
        const n = Math.min(4000, Math.max(2, Math.ceil(sw / step)));
        const out = [];
        for (let i = 0; i <= n; i++) out.push(arcPoint(s, i / n));
        return out;
      }
      case 'P': return s.pts;
      case 'C': {
        const out = [];
        for (let i = 0; i <= 48; i++) out.push(bez(s.p, i / 48));
        return out;
      }
    }
  }

  function scaleSeg(s, f) {
    const sc = p => [p[0] * f, p[1] * f];
    const meta = { layer: s.layer, eid: s.eid };
    switch (s.k) {
      case 'L': return { k: 'L', a: sc(s.a), b: sc(s.b), ...meta };
      case 'A': return { k: 'A', c: sc(s.c), r: s.r * f, a0: s.a0, a1: s.a1, ccw: s.ccw, ...meta };
      case 'P': return { k: 'P', pts: s.pts.map(sc), ...meta };
      case 'C': return { k: 'C', p: s.p.map(sc), ...meta };
    }
  }

  function bboxOf(points, box) {
    box = box || [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of points) {
      if (p[0] < box[0]) box[0] = p[0];
      if (p[1] < box[1]) box[1] = p[1];
      if (p[0] > box[2]) box[2] = p[0];
      if (p[1] > box[3]) box[3] = p[1];
    }
    return box;
  }

  function segsBBox(segs) {
    let box = null;
    for (const s of segs) box = bboxOf(flatten(s, 0.0005), box);
    return box;
  }

  // ---------- units ----------

  const UNIT_FACTORS = { 1: 1, 2: 12, 4: 1 / 25.4, 5: 1 / 2.54, 6: 39.37007874 };
  const UNIT_NAMES = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' };

  /** Factors that make a part fit the bed when the header's reading does not (fixtures' plausibility rule). */
  function unitSuggestions(size, plaus) {
    const [bw, bh] = plaus.bed;
    const fits = (w, h) => (w <= bw && h <= bh) || (w <= bh && h <= bw);
    if (fits(size[0], size[1])) return [];
    return plaus.factors
      .filter(f => fits(size[0] * f, size[1] * f) && Math.max(size[0], size[1]) * f >= plaus.minLargestSide)
      .sort((a, b) => a - b);
  }

  // ---------- duplicates and overlaps ----------

  function sameSeg(x, y, tol) {
    if (x.k !== y.k) return false;
    const fwd = dist(start(x), start(y)) <= tol && dist(end(x), end(y)) <= tol;
    const rev = dist(start(x), end(y)) <= tol && dist(end(x), start(y)) <= tol;
    if (!fwd && !rev) return false;
    if (x.k === 'A') return dist(x.c, y.c) <= tol && Math.abs(x.r - y.r) <= tol && Math.abs(arcSweep(x) - arcSweep(y)) < 1e-6;
    return dist(middle(x), middle(y)) <= tol;
  }

  function dedupe(segs, tol) {
    const cell = Math.max(tol * 4, 1e-6), grid = new Map(), kept = [];
    let removed = 0;
    const key = (gx, gy) => gx + ',' + gy;
    for (const s of segs) {
      const m = middle(s), gx = Math.floor(m[0] / cell), gy = Math.floor(m[1] / cell);
      let dup = false;
      for (let dx = -1; dx <= 1 && !dup; dx++) {
        for (let dy = -1; dy <= 1 && !dup; dy++) {
          for (const k of grid.get(key(gx + dx, gy + dy)) || []) {
            if (sameSeg(s, kept[k], tol)) { dup = true; break; }
          }
        }
      }
      if (dup) { removed++; continue; }
      const k = key(gx, gy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(kept.length);
      kept.push(s);
    }
    return { kept, removed };
  }

  /** Collinear LINE pairs that partly overlap. Reported only; geometry is not changed. */
  function overlaps(segs, tol) {
    const lines = segs.filter(s => s.k === 'L');
    if (lines.length > 4000) return { count: 0, skipped: true };
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const a = lines[i], ax = a.a[0], ay = a.a[1];
      const dx = a.b[0] - ax, dy = a.b[1] - ay, len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const ux = dx / len, uy = dy / len;
      for (let j = i + 1; j < lines.length; j++) {
        const b = lines[j];
        const off = Math.max(...[b.a, b.b].map(p => Math.abs((p[0] - ax) * uy - (p[1] - ay) * ux)));
        if (off > tol) continue;
        const t = [b.a, b.b].map(p => (p[0] - ax) * ux + (p[1] - ay) * uy).sort((m, n) => m - n);
        if (Math.min(len, t[1]) - Math.max(0, t[0]) > tol) count++;
      }
    }
    return { count, skipped: false };
  }

  // ---------- joining ----------

  function join(segs, tol, nearMax) {
    const nodes = [], grid = new Map(), loops = [], edges = [];
    let joinedPairs = 0, largestGap = 0;
    const key = (gx, gy) => gx + ',' + gy;

    function nodeOf(p) {
      const gx = Math.floor(p[0] / tol), gy = Math.floor(p[1] / tol);
      let best = -1, bd = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const i of grid.get(key(gx + dx, gy + dy)) || []) {
            const d = dist(nodes[i].p, p);
            if (d <= tol && d < bd) { best = i; bd = d; }
          }
        }
      }
      if (best >= 0) {
        joinedPairs++;
        largestGap = Math.max(largestGap, bd);
        return best;
      }
      nodes.push({ p, edges: [] });
      const k = key(gx, gy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(nodes.length - 1);
      return nodes.length - 1;
    }

    for (const s of segs) {
      if (isClosedSeg(s, tol)) { loops.push({ segs: [s] }); continue; }
      const a = nodeOf(start(s)), b = nodeOf(end(s));
      edges.push({ a, b, s });
      nodes[a].edges.push(edges.length - 1);
      nodes[b].edges.push(edges.length - 1);
    }
    const degree = nodes.map(n => n.edges.length);
    const used = new Array(edges.length).fill(false);

    function walk(from, first) {
      const out = [];
      let cur = from, eid = first;
      for (;;) {
        used[eid] = true;
        const e = edges[eid], fwd = e.a === cur;
        out.push(fwd ? e.s : reverse(e.s));
        cur = fwd ? e.b : e.a;
        if (degree[cur] !== 2 || cur === from) return { segs: out, endNode: cur };
        eid = nodes[cur].edges.find(x => !used[x]);
        if (eid === undefined) return { segs: out, endNode: cur };
      }
    }

    const open = [];
    let almostClosed = 0;
    for (let n = 0; n < nodes.length; n++) {
      if (degree[n] === 2) continue;
      for (const eid of nodes[n].edges) {
        if (used[eid]) continue;
        const w = walk(n, eid);
        const gap = dist(nodes[n].p, nodes[w.endNode].p);
        const near = degree[n] === 1 && degree[w.endNode] === 1 && gap > tol && gap <= nearMax;
        if (near) almostClosed++;
        open.push({ segs: w.segs, gap: degree[n] === 1 && degree[w.endNode] === 1 ? gap : null, almostClosed: near });
      }
    }
    for (let eid = 0; eid < edges.length; eid++) {
      if (!used[eid]) loops.push({ segs: walk(edges[eid].a, eid).segs });
    }
    const branchPoints = nodes.filter((n, i) => degree[i] >= 3).map(n => n.p);
    return { loops, open, branchPoints, almostClosed, joinedPairs, largestGap };
  }

  // ---------- nesting ----------

  function chainPoints(segs, tol) {
    const out = [];
    for (const s of segs) {
      const pts = flatten(s, tol);
      for (let i = out.length ? 1 : 0; i < pts.length; i++) out.push(pts[i]);
    }
    return out;
  }

  function polyArea(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    return a / 2;
  }

  function pointInPoly(p, poly) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < xi + ((p[1] - yi) * (xj - xi)) / (yj - yi)) hit = !hit;
    }
    return hit;
  }

  function nest(loops, tol) {
    for (const L of loops) {
      L.poly = chainPoints(L.segs, tol);
      L.area = Math.abs(polyArea(L.poly));
      L.box = bboxOf(L.poly);
      L.sample = middle(L.segs[0]);
      L.children = [];
      L.parent = null;
    }
    const order = loops.slice().sort((x, y) => y.area - x.area);
    order.forEach((L, k) => {
      for (let j = k - 1; j >= 0; j--) {
        const P = order[j], b = P.box, s = L.sample;
        if (s[0] < b[0] || s[0] > b[2] || s[1] < b[1] || s[1] > b[3]) continue;
        if (pointInPoly(s, P.poly)) { L.parent = P; break; }
      }
      L.depth = L.parent ? L.parent.depth + 1 : 0;
      if (L.parent) L.parent.children.push(L);
    });
    return order;
  }

  // ---------- whole pipeline ----------

  const DEFAULTS = {
    tol: 0.001,
    nearMax: 0.01,
    refWords: ['BEND', 'EXTENT', 'CONSTRUCTION', 'CENTER'],
    plausibility: { bed: [24, 12], minLargestSide: 0.25, factors: [0.001, 0.0394, 0.1, 10, 25.4, 1000] },
  };

  /**
   * parsed: output of LP.parseDXF or LP.parseSVG (segments in file units).
   * opts.scale: file units to inches. opts.tol: join tolerance in inches.
   */
  function analyze(parsed, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const scaled = parsed.segs.map(s => scaleSeg(s, o.scale));
    const isRef = s => o.refWords.some(w => String(s.layer || '').toUpperCase().includes(w));
    const ref = scaled.filter(isRef), work = scaled.filter(s => !isRef(s));

    const box = work.length ? segsBBox(work) : [0, 0, 0, 0];
    const size = [box[2] - box[0], box[3] - box[1]];
    const { kept, removed } = dedupe(work, o.tol);
    const ov = overlaps(kept, o.tol);
    const j = join(kept, o.tol, o.nearMax);
    const loops = nest(j.loops, o.tol);
    loops.forEach((L, i) => { L.id = 'L' + i; });
    j.open.forEach((c, i) => { c.id = 'O' + i; c.poly = chainPoints(c.segs, o.tol); });

    return {
      loops, open: j.open, ref, box, size,
      stats: {
        loops: loops.length,
        openChains: j.open.length,
        depths: loops.map(L => L.depth).sort((a, b) => a - b),
        branchPoints: j.branchPoints.length,
        duplicatesRemoved: removed,
        overlapsReported: ov.count,
        overlapCheckSkipped: ov.skipped,
        almostClosed: j.almostClosed,
        textSkipped: parsed.counts.text || 0,
        referenceHidden: new Set(ref.map(s => s.eid)).size,
        fitPointSplines: parsed.counts.fitOnly || 0,
        ignored: Object.assign({}, parsed.counts.ignored || {}),
        unitsMissing: !parsed.units,
        joinedPairs: j.joinedPairs,
        largestGap: j.largestGap,
        size,
        unitSuggestions: unitSuggestions(size, o.plausibility),
      },
      branchPoints: j.branchPoints,
    };
  }

  Object.assign(LP, {
    TAU, dist, arcSweep, arcPoint, bez, start, end, middle, reverse, flatten, scaleSeg, bboxOf, segsBBox,
    UNIT_FACTORS, UNIT_NAMES, unitSuggestions, dedupe, overlaps, join, nest, chainPoints, polyArea, pointInPoly,
    DEFAULTS, analyze,
  });
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. Segment model, units and suggestions, duplicates, overlaps, joining with a snap grid, nesting, analyze().
 */

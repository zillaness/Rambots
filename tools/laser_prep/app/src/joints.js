/**
 * @file joints.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Joints and cut adjustments for the laser prep app: holding tabs, kerf compensation, finger joints on an edge, tab-and-slot joints, and a finger-jointed box generator.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const polySegs = (pts, closed) => {
    const out = [];
    for (let i = 0; i < (closed ? pts.length : pts.length - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (dist(a, b) > 1e-9) out.push({ k: 'L', a, b, layer: 'joint', eid: 0 });
    }
    return out;
  };

  // ---------- holding tabs ----------

  /**
   * Split a closed outline (array of points) into cut pieces, leaving `count` uncut bridges of `width`.
   * Bridge centers start evenly spaced and move off sharp corners when one is too close.
   */
  function splitForTabs(poly, count, width) {
    const pts = poly.slice();
    if (dist(pts[0], pts[pts.length - 1]) > 1e-9) pts.push(pts[0]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    const P = cum[cum.length - 1];
    if (count < 1 || width <= 0 || count * width >= P * 0.8) return [pts];
    const corners = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[(i - 1 + pts.length - 1) % (pts.length - 1)], b = pts[i], c = pts[i + 1];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
      const lu = Math.hypot(...u), lv = Math.hypot(...v);
      if (!lu || !lv) continue;
      const turn = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (lu * lv))));
      if (turn > (25 * Math.PI) / 180) corners.push(cum[i]);
    }
    const clear = s => corners.every(c => Math.min(Math.abs(c - s), P - Math.abs(c - s)) > width / 2 + 0.04);
    const step = P / count, centers = [];
    for (let i = 0; i < count; i++) {
      let s = (i + 0.5) * step, best = s;
      if (!clear(s)) {
        for (let d = 0.02; d < step / 2 - width / 2; d += 0.02) {
          if (clear(s + d)) { best = s + d; break; }
          if (clear(s - d)) { best = s - d; break; }
        }
      }
      centers.push(((best % P) + P) % P);
    }
    centers.sort((a, b) => a - b);
    const at = s => {
      s = ((s % P) + P) % P;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1e-12);
      return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])];
    };
    const pieces = [];
    for (let k = 0; k < centers.length; k++) {
      const s0 = centers[k] + width / 2, s1 = centers[(k + 1) % centers.length] - width / 2 + (k + 1 === centers.length ? P : 0);
      if (s1 - s0 <= 1e-6) continue;
      const ordered = [at(s0)];
      const inner = [];
      for (let i = 0; i < cum.length; i++) for (const off of [0, P]) { const s = cum[i] + off; if (s > s0 + 1e-9 && s < s1 - 1e-9) inner.push({ s, p: pts[i] }); }
      inner.sort((a, b) => a.s - b.s).forEach(e => ordered.push(e.p));
      ordered.push(at(s1));
      pieces.push(ordered);
    }
    return pieces;
  }

  // ---------- kerf ----------

  /** Outer outlines (even depth) grow by half the kerf; holes (odd depth) shrink by half. */
  function kerfPolys(poly, depth, kerf) {
    if (!kerf) return [poly];
    const sign = depth % 2 === 0 ? 1 : -1;
    const out = LP.clip.offset([poly], (sign * kerf) / 2, { join: 'miter', miter: 3 });
    return out.length ? out : [poly];
  }

  // ---------- edge joints ----------

  const oddCount = (len, finger) => { let n = Math.max(3, Math.round(len / finger)); if (n % 2 === 0) n += 1; return n; };

  /** The straight edge `segIndex` of loop `loopId`, with its inward direction, in local coordinates. */
  function edgeInfo(obj, loopId, segIndex) {
    const L = obj.job.loops.find(x => x.id === loopId);
    if (!L) throw new Error('Pick an outline first.');
    const s = L.segs[segIndex];
    if (!s || s.k !== 'L') throw new Error('Pick a straight edge (fingers and tabs go on straight lines).');
    const len = dist(s.a, s.b), d = [(s.b[0] - s.a[0]) / len, (s.b[1] - s.a[1]) / len];
    const left = [-d[1], d[0]], mid = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];
    const probe = [mid[0] + left[0] * 1e-3, mid[1] + left[1] * 1e-3];
    const inward = LP.pointInPoly(probe, L.poly) ? left : [-left[0], -left[1]];
    return { L, a: s.a, b: s.b, len, d, n: inward };
  }

  /** A rectangle along the edge from s0 to s1, from `inner` to `outer` along the inward normal. */
  function bandRect(e, s0, s1, inner, outer) {
    const P = (s, h) => [e.a[0] + e.d[0] * s + e.n[0] * h, e.a[1] + e.d[1] * s + e.n[1] * h];
    return [P(s0, inner), P(s1, inner), P(s1, outer), P(s0, outer)];
  }

  function replaceLoop(obj, L, newPolys) {
    const segs = [];
    for (const K of obj.job.loops) if (K !== L) segs.push(...K.segs);
    for (const c of obj.job.open) segs.push(...c.segs);
    for (const p of newPolys) segs.push(...polySegs(p, true));
    LP.doc.rebuild(obj, segs);
  }

  /** Fingers along a straight edge: notches `thickness` deep, alternating, starting with a finger or a notch. */
  function fingerEdge(obj, loopId, segIndex, opts) {
    const e = edgeInfo(obj, loopId, segIndex), t = +opts.thickness, n = oddCount(e.len, +opts.finger || 3 * t);
    const w = e.len / n, startNotch = opts.start === 'notch', cuts = [];
    for (let i = 0; i < n; i++) if ((i % 2 === 0) === startNotch) cuts.push(bandRect(e, i * w, (i + 1) * w, -0.01, t));
    replaceLoop(obj, e.L, LP.clip.difference([e.L.poly], cuts));
    return { fingers: n, width: w };
  }

  /** Tabs sticking out of a straight edge, plus a matching strip of slots to place on the other part. */
  function tabAndSlot(obj, loopId, segIndex, opts) {
    const e = edgeInfo(obj, loopId, segIndex), t = +opts.thickness, w = +opts.width, count = Math.max(1, Math.round(+opts.count || 2));
    const clearance = +opts.clearance || 0, pitch = e.len / count, tabs = [];
    for (let i = 0; i < count; i++) {
      const c = (i + 0.5) * pitch;
      tabs.push(bandRect(e, c - w / 2, c + w / 2, 0.01, -t));
    }
    replaceLoop(obj, e.L, LP.clip.union([e.L.poly, ...tabs]));
    const sw = w + clearance, sh = t + clearance, slotSegs = [];
    for (let i = 0; i < count; i++) {
      const c = (i + 0.5) * pitch;
      slotSegs.push(...polySegs([[c - sw / 2, 0], [c + sw / 2, 0], [c + sw / 2, sh], [c - sw / 2, sh]], true));
    }
    return { slots: slotSegs, pitch, length: e.len };
  }

  // ---------- box generator ----------

  /**
   * Six (or five, open top) panels with finger joints. Outer dimensions unless opts.inside.
   * Edge patterns: A starts with a finger, B with a notch; mating edges get opposite patterns, and each
   * corner cube belongs to exactly one panel (top and bottom own the corners on their edges).
   */
  function boxPanels(opts) {
    const t = +opts.thickness, add = opts.inside ? 2 * t : 0;
    const W = +opts.w + add, D = +opts.d + add, H = +opts.h + add, finger = +opts.finger || 3 * t;
    const panel = (name, w, h, edges) => {
      const rect = [[0, 0], [w, 0], [w, h], [0, h]], cuts = [];
      const sides = [
        { a: [0, 0], d: [1, 0], n: [0, 1], len: w, pat: edges[0] },
        { a: [w, 0], d: [0, 1], n: [-1, 0], len: h, pat: edges[1] },
        { a: [w, h], d: [-1, 0], n: [0, -1], len: w, pat: edges[2] },
        { a: [0, h], d: [0, -1], n: [1, 0], len: h, pat: edges[3] },
      ];
      for (const e of sides) {
        if (e.pat === 'flat') continue;
        const n = oddCount(e.len, finger), sw = e.len / n;
        for (let i = 0; i < n; i++) if ((i % 2 === 0) === (e.pat === 'B')) cuts.push(bandRect(e, i * sw, (i + 1) * sw, -0.01, t));
      }
      const polys = cuts.length ? LP.clip.difference([rect], cuts) : [rect];
      return { name, w, h, polys };
    };
    const top = opts.openTop ? 'flat' : 'B';
    const out = [
      panel('Bottom', W, D, ['A', 'A', 'A', 'A']),
      panel('Front', W, H, ['B', 'A', top, 'A']),
      panel('Back', W, H, ['B', 'A', top, 'A']),
      panel('Left', D, H, ['B', 'B', top, 'B']),
      panel('Right', D, H, ['B', 'B', top, 'B']),
    ];
    if (!opts.openTop) out.splice(1, 0, panel('Top', W, D, ['A', 'A', 'A', 'A']));
    return out;
  }

  /** Box panels as objects laid out in a row from (x, y). */
  function makeBox(opts, x, y) {
    let cx = x === undefined ? 0.25 : x;
    const cy = y === undefined ? 0.25 : y;
    return boxPanels(opts).map(p => {
      const segs = [];
      for (const poly of p.polys) segs.push(...polySegs(poly, true));
      const job = LP.analyze({ kind: 'gen', units: 1, segs, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
      const o = LP.doc.makeObject('panel', job, { name: 'Box ' + p.name, x: cx, y: cy, params: { box: Object.assign({}, opts), panel: p.name } });
      cx += p.w + 0.25;
      return o;
    });
  }

  LP.joints = { splitForTabs, kerfPolys, edgeInfo, fingerEdge, tabAndSlot, boxPanels, makeBox, oddCount, polySegs };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */

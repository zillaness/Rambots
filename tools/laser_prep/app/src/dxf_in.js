/**
 * @file dxf_in.js
 * @version 0.1
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Minimal DXF reader for the laser prep app: HEADER units, BLOCKS, and the entity subset in core design v1.1 section 3.1, returned as segments in file units.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const TAU = Math.PI * 2;
  const STRUCTURAL = new Set(['SEQEND', 'VERTEX', 'ATTRIB', 'ATTDEF', 'ENDBLK', 'BLOCK']);

  function tokenize(text) {
    const lines = text.split(/\r\n|\r|\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = parseInt(lines[i].trim(), 10);
      if (Number.isNaN(code)) { i -= 1; continue; }
      pairs.push([code, lines[i + 1].trim()]);
    }
    return pairs;
  }

  /** Split a run of pairs into records that each start at a code 0. */
  function records(pairs) {
    const out = [];
    let cur = null;
    for (const [code, val] of pairs) {
      if (code === 0) { cur = { type: val, data: [] }; out.push(cur); } else if (cur) cur.data.push([code, val]);
    }
    return out;
  }

  /** Attach VERTEX records to their POLYLINE and drop INSERT attributes. */
  function group(recs) {
    const out = [];
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      if (r.type === 'POLYLINE' || (r.type === 'INSERT' && num(r, 66, 0) === 1)) {
        r.vertices = [];
        while (++i < recs.length && recs[i].type !== 'SEQEND') if (recs[i].type === 'VERTEX') r.vertices.push(recs[i]);
      }
      out.push(r);
    }
    return out;
  }

  function num(r, code, def) {
    const hit = r.data.find(d => d[0] === code);
    return hit ? parseFloat(hit[1]) : def;
  }
  function str(r, code, def) {
    const hit = r.data.find(d => d[0] === code);
    return hit ? hit[1] : def;
  }
  function all(r, code) { return r.data.filter(d => d[0] === code).map(d => parseFloat(d[1])); }
  /** Point lists from repeated x/y codes (10/20 for control points, 11/21 for fit points). */
  function pointList(r, cx, cy) {
    const out = [];
    for (const [code, val] of r.data) {
      if (code === cx) out.push([parseFloat(val), 0]);
      else if (code === cy && out.length) out[out.length - 1][1] = parseFloat(val);
    }
    return out;
  }

  // ---------- coordinate systems ----------

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  /** AutoCAD arbitrary axis algorithm. Returns a 2D mapper from OCS (x, y, z) to world (x, y). */
  function ocs(r) {
    const N = norm([num(r, 210, 0), num(r, 220, 0), num(r, 230, 1)]);
    if (N[0] === 0 && N[1] === 0 && N[2] === 1) return { map: p => [p[0], p[1]], ccw: true, flat: true };
    const Ax = norm(Math.abs(N[0]) < 1 / 64 && Math.abs(N[1]) < 1 / 64 ? cross([0, 1, 0], N) : cross([0, 0, 1], N));
    const Ay = norm(cross(N, Ax));
    const z = p => p[2] || 0;
    return {
      map: p => [p[0] * Ax[0] + p[1] * Ay[0] + z(p) * N[0], p[0] * Ax[1] + p[1] * Ay[1] + z(p) * N[1]],
      ccw: N[2] > 0,
      flat: Math.abs(N[2]) > 0.999999,
      affine: [Ax[0], Ax[1], Ay[0], Ay[1], 0, 0],
    };
  }

  // Affine [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f
  const ID = [1, 0, 0, 1, 0, 0];
  const apply = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const compose = (M, N) => [
    M[0] * N[0] + M[2] * N[1], M[1] * N[0] + M[3] * N[1],
    M[0] * N[2] + M[2] * N[3], M[1] * N[2] + M[3] * N[3],
    M[0] * N[4] + M[2] * N[5] + M[4], M[1] * N[4] + M[3] * N[5] + M[5],
  ];
  const translate = (x, y) => [1, 0, 0, 1, x, y];
  const rotate = a => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
  const scale = (sx, sy) => [sx, 0, 0, sy, 0, 0];
  function similarity(M) {
    const sx = Math.hypot(M[0], M[1]), sy = Math.hypot(M[2], M[3]), dot = M[0] * M[2] + M[1] * M[3];
    return Math.abs(sx - sy) < 1e-9 * Math.max(sx, 1) && Math.abs(dot) < 1e-9 * Math.max(sx * sx, 1) ? sx : null;
  }
  const det = M => M[0] * M[3] - M[1] * M[2];

  // ---------- curves ----------

  function arcSeg(c, r, a0, a1, ccw, meta) {
    return { k: 'A', c, r, a0, a1, ccw, ...meta };
  }

  /** Arc from bulge between two OCS points: sweep 4 atan(b), positive turns counterclockwise. */
  function bulgeArc(p1, p2, b) {
    const theta = 4 * Math.atan(b), d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const ux = (p2[0] - p1[0]) / d, uy = (p2[1] - p1[1]) / d;
    const h = (d / 2) / Math.tan(theta / 2);
    const c = [(p1[0] + p2[0]) / 2 - uy * h, (p1[1] + p2[1]) / 2 + ux * h];
    const r = Math.hypot(p1[0] - c[0], p1[1] - c[1]);
    return { c, r, a0: Math.atan2(p1[1] - c[1], p1[0] - c[0]), a1: Math.atan2(p2[1] - c[1], p2[0] - c[0]), ccw: b > 0 };
  }

  function findSpan(n, p, u, U) {
    if (u >= U[n]) return n - 1;
    let lo = p, hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (u < U[mid]) hi = mid; else lo = mid;
    }
    return lo;
  }

  /** NURBS point by de Boor's algorithm on homogeneous coordinates. */
  function deBoor(u, U, P, p) {
    const k = findSpan(P.length, p, u, U);
    const d = [];
    for (let j = 0; j <= p; j++) d.push(P[j + k - p].slice());
    for (let r = 1; r <= p; r++) {
      for (let j = p; j >= r; j--) {
        const i = j + k - p, den = U[i + p - r + 1] - U[i];
        const a = den === 0 ? 0 : (u - U[i]) / den;
        for (let c = 0; c < 3; c++) d[j][c] = (1 - a) * d[j - 1][c] + a * d[j][c];
      }
    }
    return [d[p][0] / d[p][2], d[p][1] / d[p][2]];
  }

  function nurbsPoints(ctrl, weights, knots, p) {
    const P = ctrl.map((c, i) => { const w = weights[i] || 1; return [c[0] * w, c[1] * w, w]; });
    const u0 = knots[p], u1 = knots[ctrl.length];
    const n = Math.min(4000, Math.max(64, ctrl.length * 24));
    const out = [];
    for (let i = 0; i <= n; i++) out.push(deBoor(u0 + (u1 - u0) * (i / n), knots, P, p));
    return out;
  }

  /** Centripetal Catmull-Rom through fit points (used when a SPLINE has no control points). */
  function catmullRom(pts) {
    const P = [pts[0], ...pts, pts[pts.length - 1]], out = [pts[0]];
    const tj = (ti, a, b) => ti + Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) + 1e-12;
    for (let i = 1; i + 2 < P.length; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
      for (let s = 1; s <= 24; s++) {
        const t = t1 + (t2 - t1) * (s / 24);
        const lerp = (a, b, ta, tb) => [0, 1].map(c => ((tb - t) / (tb - ta)) * a[c] + ((t - ta) / (tb - ta)) * b[c]);
        const A1 = lerp(p0, p1, t0, t1), A2 = lerp(p1, p2, t1, t2), A3 = lerp(p2, p3, t2, t3);
        const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3);
        out.push(lerp(B1, B2, t1, t2));
      }
    }
    return out;
  }

  // ---------- entities to segments ----------

  /** Push a segment through the block transform M. Arcs stay arcs under similarity transforms. */
  function emit(seg, M, out) {
    if (M === ID) { out.push(seg); return; }
    if (seg.k === 'L') { out.push({ ...seg, a: apply(M, seg.a), b: apply(M, seg.b) }); return; }
    if (seg.k === 'P') { out.push({ ...seg, pts: seg.pts.map(p => apply(M, p)) }); return; }
    const s = similarity(M);
    if (s !== null) {
      const c = apply(M, seg.c), full = LP.arcSweep(seg) >= TAU - 1e-9;
      const p0 = apply(M, LP.arcPoint(seg, 0)), p1 = apply(M, LP.arcPoint(seg, 1));
      const a0 = Math.atan2(p0[1] - c[1], p0[0] - c[0]);
      const a1 = full ? a0 : Math.atan2(p1[1] - c[1], p1[0] - c[0]);
      out.push({ ...seg, c, r: seg.r * s, a0, a1, ccw: det(M) > 0 ? seg.ccw : !seg.ccw });
      return;
    }
    const n = 256;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(apply(M, LP.arcPoint(seg, i / n)));
    out.push({ k: 'P', pts, layer: seg.layer, eid: seg.eid });
  }

  function polylineSegs(verts, closed, o, meta, out, M) {
    const n = verts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const v = verts[i], w = verts[(i + 1) % n];
      if (Math.hypot(w.p[0] - v.p[0], w.p[1] - v.p[1]) < 1e-12) continue;
      if (Math.abs(v.b) > 1e-12) {
        const a = bulgeArc(v.p, w.p, v.b);
        if (o.flat) {
          const c = o.map([...a.c, v.z]), s = o.map([...v.p, v.z]), e = o.map([...w.p, v.z]);
          emit(arcSeg(c, a.r, Math.atan2(s[1] - c[1], s[0] - c[0]), Math.atan2(e[1] - c[1], e[0] - c[0]), o.ccw ? a.ccw : !a.ccw, meta), M, out);
        } else {
          const tmp = arcSeg(a.c, a.r, a.a0, a.a1, a.ccw, meta), pts = [];
          for (let k = 0; k <= 64; k++) { const q = LP.arcPoint(tmp, k / 64); pts.push(o.map([q[0], q[1], v.z])); }
          emit({ k: 'P', pts, ...meta }, M, out);
        }
      } else {
        emit({ k: 'L', a: o.map([...v.p, v.z]), b: o.map([...w.p, v.z]), ...meta }, M, out);
      }
    }
  }

  function entity(r, M, ctx, depth, stack) {
    const t = r.type;
    if (depth === 0 && num(r, 67, 0) === 1 && !STRUCTURAL.has(t)) { ctx.bump('paper space ' + t); return; }
    const meta = { layer: str(r, 8, '0'), eid: ctx.nextId++ };
    switch (t) {
      case 'LINE':
        emit({ k: 'L', a: [num(r, 10, 0), num(r, 20, 0)], b: [num(r, 11, 0), num(r, 21, 0)], ...meta }, M, ctx.segs);
        return;
      case 'CIRCLE':
      case 'ARC': {
        const o = ocs(r);
        if (!o.flat) ctx.tilted++;
        const c3 = [num(r, 10, 0), num(r, 20, 0), num(r, 30, 0)], rad = num(r, 40, 0);
        if (!(rad > 0)) { ctx.bump('degenerate ' + t); return; }
        const d0 = t === 'CIRCLE' ? 0 : (num(r, 50, 0) * Math.PI) / 180;
        const d1 = t === 'CIRCLE' ? TAU : (num(r, 51, 360) * Math.PI) / 180;
        const tmp = arcSeg([c3[0], c3[1]], rad, d0, t === 'CIRCLE' ? d0 : d1, true, meta);
        if (o.flat) {
          const c = o.map(c3), p0 = o.map([...LP.arcPoint(tmp, 0), c3[2]]), p1 = o.map([...LP.arcPoint(tmp, 1), c3[2]]);
          const a0 = Math.atan2(p0[1] - c[1], p0[0] - c[0]);
          const a1 = t === 'CIRCLE' ? a0 : Math.atan2(p1[1] - c[1], p1[0] - c[0]);
          emit(arcSeg(c, rad, a0, a1, o.ccw, meta), M, ctx.segs);
        } else {
          const pts = [];
          for (let k = 0; k <= 256; k++) { const q = LP.arcPoint(tmp, k / 256); pts.push(o.map([q[0], q[1], c3[2]])); }
          emit({ k: 'P', pts, ...meta }, M, ctx.segs);
        }
        return;
      }
      case 'LWPOLYLINE': {
        const o = ocs(r), z = num(r, 38, 0), verts = [];
        if (!o.flat) ctx.tilted++;
        for (const [code, val] of r.data) {
          if (code === 10) verts.push({ p: [parseFloat(val), 0], b: 0, z });
          else if (code === 20 && verts.length) verts[verts.length - 1].p[1] = parseFloat(val);
          else if (code === 42 && verts.length) verts[verts.length - 1].b = parseFloat(val);
        }
        polylineSegs(verts, (num(r, 70, 0) & 1) === 1, o, meta, ctx.segs, M);
        return;
      }
      case 'POLYLINE': {
        const flags = num(r, 70, 0);
        if (flags & (16 | 64)) { ctx.bump('POLYLINE mesh'); return; }
        const is3d = (flags & 8) === 8, o = is3d ? ocs({ data: [] }) : ocs(r);
        if (!o.flat) ctx.tilted++;
        const verts = (r.vertices || [])
          .filter(v => (num(v, 70, 0) & 16) === 0)
          .map(v => ({ p: [num(v, 10, 0), num(v, 20, 0)], b: is3d ? 0 : num(v, 42, 0), z: num(v, 30, 0) }));
        polylineSegs(verts, (flags & 1) === 1, o, meta, ctx.segs, M);
        return;
      }
      case 'SPLINE': {
        const deg = num(r, 71, 3), knots = all(r, 40), weights = all(r, 41);
        const ctrl = pointList(r, 10, 20), fit = pointList(r, 11, 21);
        let pts = null;
        if (ctrl.length >= deg + 1 && knots.length === ctrl.length + deg + 1) pts = nurbsPoints(ctrl, weights, knots, deg);
        else if (fit.length >= 2) { ctx.fitOnly++; pts = catmullRom(fit); }
        if (!pts) { ctx.bump('SPLINE (unreadable)'); return; }
        emit({ k: 'P', pts, ...meta }, M, ctx.segs);
        return;
      }
      case 'ELLIPSE': {
        const N = norm([num(r, 210, 0), num(r, 220, 0), num(r, 230, 1)]);
        if (Math.abs(N[2]) < 0.999999) ctx.tilted++;
        const c = [num(r, 10, 0), num(r, 20, 0)], maj = [num(r, 11, 1), num(r, 21, 0), num(r, 31, 0)], ratio = num(r, 40, 1);
        const mn = cross(N, maj).map(v => v * ratio);
        let t0 = num(r, 41, 0), t1 = num(r, 42, TAU);
        if (t1 <= t0) t1 += TAU;
        const n = Math.max(16, Math.ceil((512 * (t1 - t0)) / TAU)), pts = [];
        for (let i = 0; i <= n; i++) {
          const u = t0 + ((t1 - t0) * i) / n;
          pts.push([c[0] + maj[0] * Math.cos(u) + mn[0] * Math.sin(u), c[1] + maj[1] * Math.cos(u) + mn[1] * Math.sin(u)]);
        }
        if (t1 - t0 >= TAU - 1e-9) pts[pts.length - 1] = pts[0];
        emit({ k: 'P', pts, ...meta }, M, ctx.segs);
        return;
      }
      case 'INSERT': {
        const name = str(r, 2, ''), blk = ctx.blocks[name];
        if (!blk) { ctx.bump('INSERT (missing block)'); return; }
        if (depth > 16 || stack.includes(name)) { ctx.bump('INSERT (recursive)'); return; }
        const o = ocs(r);
        const ins = [num(r, 10, 0), num(r, 20, 0)], rot = (num(r, 50, 0) * Math.PI) / 180;
        const sx = num(r, 41, 1), sy = num(r, 42, 1);
        const cols = Math.max(1, num(r, 70, 1)), rows = Math.max(1, num(r, 71, 1));
        const cs = num(r, 44, 0), rs = num(r, 45, 0);
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            let T = compose(translate(ins[0], ins[1]), rotate(rot));
            T = compose(T, translate(i * cs, j * rs));
            T = compose(T, compose(scale(sx, sy), translate(-blk.base[0], -blk.base[1])));
            if (o.affine) T = compose(o.affine, T);
            const MT = compose(M, T);
            for (const e of blk.ents) entity(e, MT, ctx, depth + 1, [...stack, name]);
          }
        }
        return;
      }
      case 'TEXT':
      case 'MTEXT':
        ctx.text++;
        return;
      default:
        if (!STRUCTURAL.has(t)) ctx.bump(t);
    }
  }

  /** Parse DXF text. Returns segments in file units plus header units and skip counts. */
  function parseDXF(text) {
    const pairs = tokenize(text);
    const header = {}, blocks = {};
    let ents = [];
    for (let i = 0; i < pairs.length; i++) {
      if (!(pairs[i][0] === 0 && pairs[i][1] === 'SECTION')) continue;
      const name = pairs[i + 1] ? pairs[i + 1][1] : '';
      let j = i + 2;
      while (j < pairs.length && !(pairs[j][0] === 0 && pairs[j][1] === 'ENDSEC')) j++;
      const body = pairs.slice(i + 2, j);
      if (name === 'HEADER') {
        for (let k = 0; k < body.length; k++) {
          if (body[k][0] === 9) header[body[k][1]] = body[k + 1] ? body[k + 1][1] : undefined;
        }
      } else if (name === 'BLOCKS') {
        let cur = null;
        for (const r of group(records(body))) {
          if (r.type === 'BLOCK') { cur = { name: str(r, 2, ''), base: [num(r, 10, 0), num(r, 20, 0)], ents: [] }; blocks[cur.name] = cur; } else if (r.type === 'ENDBLK') cur = null;
          else if (cur) cur.ents.push(r);
        }
      } else if (name === 'ENTITIES') {
        ents = group(records(body));
      }
      i = j;
    }
    const ctx = {
      segs: [], blocks, nextId: 0, text: 0, fitOnly: 0, tilted: 0, ignored: {},
      bump(t) { this.ignored[t] = (this.ignored[t] || 0) + 1; },
    };
    for (const r of ents) entity(r, ID, ctx, 0, []);
    const code = parseInt(header.$INSUNITS, 10);
    return {
      kind: 'dxf',
      version: header.$ACADVER || null,
      units: LP.UNIT_FACTORS[code] ? code : null,
      unitsLabel: LP.UNIT_FACTORS[code] ? LP.UNIT_NAMES[code] : null,
      segs: ctx.segs,
      counts: { text: ctx.text, fitOnly: ctx.fitOnly, tilted: ctx.tilted, ignored: ctx.ignored },
    };
  }

  Object.assign(LP, { parseDXF });
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. HEADER units, BLOCKS, LINE, CIRCLE, ARC, LWPOLYLINE and POLYLINE with bulges, SPLINE (NURBS any degree, fit-point fallback), ELLIPSE, INSERT and MINSERT with nesting guard, OCS extrusion, skip counts by type.
 */

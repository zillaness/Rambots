/**
 * @file svg_in.js
 * @version 0.1
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description SVG reader for the laser prep app (browser only, uses DOMParser): paths, basic shapes, transforms, and units from the root size and viewBox (core design v1.1, section 3.2).
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const TO_IN = { in: 1, mm: 1 / 25.4, cm: 1 / 2.54, pt: 1 / 72, pc: 1 / 6, px: 1 / 96, '': 1 / 96 };
  const SKIP = new Set(['defs', 'clipPath', 'mask', 'symbol', 'marker', 'pattern', 'metadata', 'title', 'desc', 'style', 'script', 'linearGradient', 'radialGradient', 'filter']);
  const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);

  const mul = (M, N) => [
    M[0] * N[0] + M[2] * N[1], M[1] * N[0] + M[3] * N[1],
    M[0] * N[2] + M[2] * N[3], M[1] * N[2] + M[3] * N[3],
    M[0] * N[4] + M[2] * N[5] + M[4], M[1] * N[4] + M[3] * N[5] + M[5],
  ];
  const ap = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const nums = s => (String(s || '').match(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || []).map(Number);

  function parseLength(v) {
    const m = String(v || '').trim().match(/^(-?[\d.]+(?:[eE][-+]?\d+)?)\s*(in|mm|cm|pt|pc|px|%)?$/);
    return m ? { val: parseFloat(m[1]), unit: m[2] || '' } : null;
  }

  function parseTransform(str) {
    let M = [1, 0, 0, 1, 0, 0];
    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(str || ''))) {
      const a = nums(m[2]);
      let T;
      switch (m[1]) {
        case 'matrix': T = a.slice(0, 6); break;
        case 'translate': T = [1, 0, 0, 1, a[0] || 0, a[1] || 0]; break;
        case 'scale': T = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0]; break;
        case 'rotate': {
          const r = ((a[0] || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
          T = [c, s, -s, c, 0, 0];
          if (a.length >= 3) T = mul(mul([1, 0, 0, 1, a[1], a[2]], T), [1, 0, 0, 1, -a[1], -a[2]]);
          break;
        }
        case 'skewX': T = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0]; break;
        case 'skewY': T = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0]; break;
      }
      M = mul(M, T);
    }
    return M;
  }

  /** SVG elliptical arc to cubic Beziers (SVG spec appendix B.2.4 center parameterization). */
  function arcToCubics(p0, rx, ry, phiDeg, fa, fs, p1) {
    if (rx === 0 || ry === 0) return [[p0, p0, p1, p1]];
    const phi = (phiDeg * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
    const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
    const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
    const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
    const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
    const cx = cp * cx1 - sp * cy1 + (p0[0] + p1[0]) / 2, cy = sp * cx1 + cp * cy1 + (p0[1] + p1[1]) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
    let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI;
    if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9)), d = dt / n, k = (4 / 3) * Math.tan(d / 4);
    const pt = t => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
    const dv = t => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = t1 + i * d, b = a + d, P0 = pt(a), P3 = pt(b), D0 = dv(a), D3 = dv(b);
      out.push([P0, [P0[0] + k * D0[0], P0[1] + k * D0[1]], [P3[0] - k * D3[0], P3[1] - k * D3[1]], P3]);
    }
    out[0][0] = p0;
    out[out.length - 1][3] = p1;
    return out;
  }

  /** Path data to segments in user units, already transformed by M. */
  function pathSegs(d, M, meta, out) {
    const toks = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    let i = 0, cmd = null, cur = [0, 0], startPt = [0, 0], lastC = null, lastQ = null;
    const n = () => parseFloat(toks[i++]);
    const line = (a, b) => { if (a[0] !== b[0] || a[1] !== b[1]) out.push({ k: 'L', a: ap(M, a), b: ap(M, b), ...meta }); };
    const cubic = (p0, p1, p2, p3) => out.push({ k: 'C', p: [p0, p1, p2, p3].map(p => ap(M, p)), ...meta });
    while (i < toks.length) {
      if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
      else if (!cmd) { i++; continue; }
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const P = (x, y) => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
      if (C !== 'Z' && i >= toks.length) break;
      if (C === 'M') {
        cur = P(n(), n()); startPt = cur; lastC = lastQ = null;
        cmd = rel ? 'l' : 'L';
      } else if (C === 'L') { const p = P(n(), n()); line(cur, p); cur = p; lastC = lastQ = null; }
      else if (C === 'H') { const x = n(), p = [rel ? cur[0] + x : x, cur[1]]; line(cur, p); cur = p; lastC = lastQ = null; }
      else if (C === 'V') { const y = n(), p = [cur[0], rel ? cur[1] + y : y]; line(cur, p); cur = p; lastC = lastQ = null; }
      else if (C === 'C') { const p1 = P(n(), n()), p2 = P(n(), n()), p3 = P(n(), n()); cubic(cur, p1, p2, p3); lastC = p2; lastQ = null; cur = p3; }
      else if (C === 'S') {
        const p1 = lastC ? [2 * cur[0] - lastC[0], 2 * cur[1] - lastC[1]] : cur, p2 = P(n(), n()), p3 = P(n(), n());
        cubic(cur, p1, p2, p3); lastC = p2; lastQ = null; cur = p3;
      } else if (C === 'Q' || C === 'T') {
        const q = C === 'Q' ? P(n(), n()) : (lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur);
        const p3 = P(n(), n());
        cubic(cur, [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])], [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])], p3);
        lastQ = q; lastC = null; cur = p3;
      } else if (C === 'A') {
        const rx = n(), ry = n(), rot = n(), fa = n(), fs = n(), p = P(n(), n());
        for (const b of arcToCubics(cur, rx, ry, rot, !!fa, !!fs, p)) cubic(...b);
        cur = p; lastC = lastQ = null;
      } else if (C === 'Z') { line(cur, startPt); cur = startPt; lastC = lastQ = null; }
    }
  }

  function attr(el, name, def) { const v = el.getAttribute(name); return v === null ? def : parseFloat(v); }

  function shapePath(el) {
    const tag = el.localName;
    if (tag === 'path') return el.getAttribute('d');
    if (tag === 'line') return `M${attr(el, 'x1', 0)} ${attr(el, 'y1', 0)}L${attr(el, 'x2', 0)} ${attr(el, 'y2', 0)}`;
    if (tag === 'polyline' || tag === 'polygon') {
      const v = nums(el.getAttribute('points'));
      if (v.length < 4) return '';
      let d = `M${v[0]} ${v[1]}`;
      for (let i = 2; i + 1 < v.length; i += 2) d += `L${v[i]} ${v[i + 1]}`;
      return tag === 'polygon' ? d + 'Z' : d;
    }
    if (tag === 'rect') {
      const x = attr(el, 'x', 0), y = attr(el, 'y', 0), w = attr(el, 'width', 0), h = attr(el, 'height', 0);
      let rx = attr(el, 'rx', NaN), ry = attr(el, 'ry', NaN);
      if (Number.isNaN(rx)) rx = Number.isNaN(ry) ? 0 : ry;
      if (Number.isNaN(ry)) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` +
        `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    if (tag === 'circle' || tag === 'ellipse') {
      const cx = attr(el, 'cx', 0), cy = attr(el, 'cy', 0);
      const rx = tag === 'circle' ? attr(el, 'r', 0) : attr(el, 'rx', 0), ry = tag === 'circle' ? rx : attr(el, 'ry', 0);
      if (!(rx > 0 && ry > 0)) return '';
      return `M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx} ${cy + ry}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx} ${cy - ry}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}Z`;
    }
    return '';
  }

  /**
   * Parse SVG text. Segments come back in inches with y flipped to point up (DXF orientation).
   * `units` is set when the root size has an absolute unit; otherwise 96 px per inch is assumed.
   */
  function parseSVG(text) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error('Not a readable SVG file.');
    const W = parseLength(root.getAttribute('width')), H = parseLength(root.getAttribute('height'));
    const vb = nums(root.getAttribute('viewBox'));
    const absolute = !!(W && ['in', 'mm', 'cm', 'pt', 'pc'].includes(W.unit));
    let perUnit = 1 / 96, Mroot = [1, 0, 0, 1, 0, 0];
    if (vb.length === 4 && vb[2] > 0) {
      const widthIn = W && W.unit !== '%' ? W.val * TO_IN[W.unit] : vb[2] / 96;
      perUnit = widthIn / vb[2];
      Mroot = [1, 0, 0, 1, -vb[0], -vb[1]];
    }
    const counts = { text: 0, fitOnly: 0, tilted: 0, ignored: {} };
    const raw = [];
    let eid = 0;
    (function walk(el, M) {
      for (const child of Array.from(el.children)) {
        const tag = child.localName;
        if (SKIP.has(tag)) continue;
        if ((child.getAttribute('display') || '') === 'none' || /display\s*:\s*none/.test(child.getAttribute('style') || '')) continue;
        const CM = mul(M, parseTransform(child.getAttribute('transform')));
        if (tag === 'g' || tag === 'a' || tag === 'svg') walk(child, CM);
        else if (SHAPES.has(tag)) pathSegs(shapePath(child), CM, { layer: child.getAttribute('id') || tag, eid: eid++ }, raw);
        else if (tag === 'text') counts.text++;
        else counts.ignored[tag] = (counts.ignored[tag] || 0) + 1;
      }
    })(root, Mroot);
    const flip = p => [p[0] * perUnit, -p[1] * perUnit];
    const segs = raw.map(s => (s.k === 'L' ? { ...s, a: flip(s.a), b: flip(s.b) } : { ...s, p: s.p.map(flip) }));
    return { kind: 'svg', units: absolute ? 1 : null, unitsLabel: absolute ? W.unit : 'px (assumed 96 per inch)', perUnit, segs, counts };
  }

  Object.assign(LP, { parseSVG, parseTransform, arcToCubics });
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. Path commands (MLHVCSQTAZ, absolute and relative), rect with rounded corners, circle, ellipse, line, polyline, polygon, nested transforms, viewBox and absolute units, display none, skip counts.
 */

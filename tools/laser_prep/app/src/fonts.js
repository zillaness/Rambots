/**
 * @file fonts.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Text for the laser prep app: bundled fonts (Label Sans, Allerta Stencil, Hershey Simplex), fonts installed on the PC (Local Font Access), layout with size, spacing, and alignment, and text along an arc, a line, or an outline.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const registry = [];

  function toArrayBuffer(b64) {
    if (typeof atob === 'function') {
      const s = atob(b64), u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return u.buffer;
    }
    const b = Buffer.from(b64, 'base64');
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
  }

  function init() {
    if (registry.length) return registry;
    const D = LP.FONT_DATA;
    registry.push({ id: 'label-sans', name: 'Label Sans', kind: 'outline', source: 'bundled', font: opentype.parse(toArrayBuffer(D.labelSans.base64)) });
    registry.push({ id: 'allerta-stencil', name: 'Allerta Stencil', kind: 'outline', source: 'bundled', font: opentype.parse(toArrayBuffer(D.allertaStencil.base64)) });
    registry.push({ id: 'hershey', name: 'Hershey Simplex (single line)', kind: 'stroke', source: 'bundled', data: D.hershey });
    return registry;
  }

  const get = id => init().find(f => f.id === id) || registry[0];

  /** Fonts installed on this PC (Chrome and Edge only; the browser asks permission first). */
  async function listLocal() {
    if (typeof window === 'undefined' || typeof window.queryLocalFonts !== 'function') {
      throw new Error('This browser cannot read installed fonts. Use Chrome or Edge, or a built-in font.');
    }
    const fonts = await window.queryLocalFonts();
    return fonts.map(f => ({ family: f.family, style: f.style, fullName: f.fullName, postscriptName: f.postscriptName, data: f }));
  }

  async function addLocal(entry) {
    const id = 'pc:' + entry.postscriptName;
    if (registry.some(f => f.id === id)) return id;
    const buf = await (await entry.data.blob()).arrayBuffer();
    let font;
    try { font = opentype.parse(buf); } catch (e) { throw new Error(`${entry.fullName} could not be read (${e.message}). Try another font.`); }
    registry.push({ id, name: entry.fullName, kind: 'outline', source: 'pc', font });
    return id;
  }

  // ---------- glyph outlines ----------

  /** Glyph outlines in inches, y up, origin at the glyph's left end of the baseline. */
  function outlineGlyph(font, glyph, size) {
    const segs = [], path = glyph.getPath(0, 0, size);
    let cur = null, start = null;
    const P = (x, y) => [x, -y];
    const line = (a, b) => { if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-9) segs.push({ k: 'L', a, b }); };
    for (const c of path.commands) {
      if (c.type === 'M') { cur = start = P(c.x, c.y); }
      else if (c.type === 'L') { const p = P(c.x, c.y); line(cur, p); cur = p; }
      else if (c.type === 'Q') {
        const q = P(c.x1, c.y1), p = P(c.x, c.y);
        segs.push({ k: 'C', p: [cur, [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])], [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])], p] });
        cur = p;
      } else if (c.type === 'C') {
        const p = P(c.x, c.y);
        segs.push({ k: 'C', p: [cur, P(c.x1, c.y1), P(c.x2, c.y2), p] });
        cur = p;
      } else if (c.type === 'Z') { if (cur && start) line(cur, start); cur = start; }
    }
    return segs;
  }

  /** Glyph runs: [{ segs (glyph-local), adv, ch }] plus the characters the font lacks. */
  function glyphRuns(line, f, cap, spacing) {
    const runs = [], missing = [];
    if (f.kind === 'stroke') {
      const H = f.data, k = cap / H.capHeight;
      for (const ch of line) {
        let g = H.glyphs[ch];
        if (!g) { if (ch !== ' ') missing.push(ch); g = ch === ' ' ? null : H.glyphs['?']; }
        if (!g) { runs.push({ segs: [], adv: cap * 0.6 + spacing, ch }); continue; }
        const segs = [];
        for (const stroke of g.s) {
          for (let i = 1; i < stroke.length; i++) {
            const a = [(stroke[i - 1][0] - g.l) * k, (H.baseLine - stroke[i - 1][1]) * k];
            const b = [(stroke[i][0] - g.l) * k, (H.baseLine - stroke[i][1]) * k];
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-9) segs.push({ k: 'L', a, b });
          }
        }
        runs.push({ segs, adv: (g.r - g.l) * k + spacing, ch });
      }
      return { runs, missing };
    }
    const font = f.font, capUnits = (font.tables.os2 && font.tables.os2.sCapHeight) || font.charToGlyph('H').yMax || font.unitsPerEm * 0.7;
    const k = cap / capUnits, size = k * font.unitsPerEm;
    const glyphs = font.stringToGlyphs(line), chars = Array.from(line);
    glyphs.forEach((g, i) => {
      const ch = chars[i] || '';
      if (g.index === 0 && ch !== ' ') missing.push(ch);
      let adv = (g.advanceWidth || 0) * k + spacing;
      if (i + 1 < glyphs.length) adv += font.getKerningValue(g, glyphs[i + 1]) * k;
      runs.push({ segs: g.index === 0 ? [] : outlineGlyph(font, g, size), adv, ch });
    });
    return { runs, missing };
  }

  // ---------- paths ----------

  /** Point, tangent, and "up" direction at arc length u measured from the middle of the text. */
  function pathFrame(path, u, total) {
    if (!path || path.type === 'none') return null;
    if (path.type === 'line') {
      const a = ((+path.angle || 0) * Math.PI) / 180, T = [Math.cos(a), Math.sin(a)];
      return { P: [u * T[0], u * T[1]], T, N: [-T[1], T[0]] };
    }
    if (path.type === 'arc') {
      const R = Math.max(0.05, +path.radius || 2);
      if (path.side === 'bottom') {
        const th = -Math.PI / 2 + u / R;
        return { P: [R * Math.cos(th), R * Math.sin(th)], T: [-Math.sin(th), Math.cos(th)], N: [-Math.cos(th), -Math.sin(th)] };
      }
      const th = Math.PI / 2 - u / R;
      return { P: [R * Math.cos(th), R * Math.sin(th)], T: [Math.sin(th), -Math.cos(th)], N: [Math.cos(th), Math.sin(th)] };
    }
    if (path.type === 'polyline') {
      const pts = path.pts, len = [0];
      for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = len[len.length - 1];
      const startAt = path.align === 'start' ? 0 : path.align === 'end' ? L - total : (L - total) / 2;
      let s = startAt + total / 2 + u + (+path.offset || 0);
      if (path.closed) s = ((s % L) + L) % L; else s = Math.max(0, Math.min(L, s));
      let i = 1;
      while (i < len.length - 1 && len[i] < s) i++;
      const a = pts[i - 1], b = pts[i], segLen = len[i] - len[i - 1] || 1e-12, t = (s - len[i - 1]) / segLen;
      const T = [(b[0] - a[0]) / segLen, (b[1] - a[1]) / segLen];
      const sideSign = path.flip ? -1 : 1;
      return { P: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], T, N: [-T[1] * sideSign, T[0] * sideSign] };
    }
    return null;
  }

  function placeSeg(s, fn) {
    if (s.k === 'L') return { k: 'L', a: fn(s.a), b: fn(s.b) };
    return { k: 'C', p: s.p.map(fn) };
  }

  /**
   * Lay out text. params: { text, fontId, cap (in), spacing (in), line (x cap), align, path }.
   * Returns { segs (inches, y up), missing, lines }.
   */
  function layout(params) {
    const f = get(params.fontId), cap = Math.max(0.02, +params.cap || 0.25), spacing = +params.spacing || 0;
    const lineGap = cap * (+params.line || 1.6), missing = new Set(), segs = [];
    let lines = String(params.text || '').split(/\r?\n/);
    const onPath = params.path && params.path.type && params.path.type !== 'none';
    if (onPath && lines.length > 1) lines = [lines.join(' ')];
    lines.forEach((line, li) => {
      const { runs, missing: miss } = glyphRuns(line, f, cap, spacing);
      miss.forEach(m => missing.add(m));
      const width = runs.reduce((w, r) => w + r.adv, 0) - (runs.length ? spacing : 0);
      // On a path, glyphs are placed by their distance from the middle of the text; the path handles alignment.
      let x = onPath ? 0 : params.align === 'center' ? -width / 2 : params.align === 'right' ? -width : 0;
      const base = -li * lineGap;
      for (const r of runs) {
        if (onPath) {
          const fr = pathFrame(params.path, x + r.adv / 2 - width / 2, width);
          const half = r.adv / 2;
          for (const s of r.segs) segs.push(placeSeg(s, p => [fr.P[0] + (p[0] - half) * fr.T[0] + p[1] * fr.N[0], fr.P[1] + (p[0] - half) * fr.T[1] + p[1] * fr.N[1]]));
        } else {
          for (const s of r.segs) segs.push(placeSeg(s, p => [p[0] + x, p[1] + base]));
        }
        x += r.adv;
      }
    });
    segs.forEach((s, i) => { s.layer = 'text'; s.eid = i; });
    return { segs, missing: [...missing], kind: f.kind };
  }

  /** Default colors: filled engrave for outline fonts, vector engrave lines for the single-line font. */
  function textAssign(job, params, kind) {
    const a = {}, mode = params.mode || (kind === 'stroke' ? 'outline' : 'fill'), color = params.color || (mode === 'fill' ? 'black' : kind === 'stroke' ? 'black' : 'red');
    for (const L of job.loops) a[L.id] = mode === 'fill' ? { outline: null, inside: L.depth % 2 === 0 ? 'black' : null } : { outline: color, inside: null };
    for (const c of job.open) a[c.id] = { outline: mode === 'fill' && kind !== 'stroke' ? null : color };
    return a;
  }

  function textJob(params) {
    const out = layout(params);
    if (!out.segs.length) out.segs.push({ k: 'L', a: [0, 0], b: [Math.max(0.1, +params.cap || 0.25), 0], layer: 'text', eid: 0 });
    const job = LP.analyze({ kind: 'gen', units: 1, segs: out.segs, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1, tol: 0.0005 });
    return { job, missing: out.missing, kind: out.kind };
  }

  const DEFAULTS = { text: 'RAMBOTS 2204', fontId: 'label-sans', cap: 0.25, spacing: 0, line: 1.6, align: 'left', mode: null, color: null, path: { type: 'none' } };

  function makeText(params, opts) {
    const p = Object.assign({}, DEFAULTS, params || {});
    const { job, missing, kind } = textJob(p);
    const o = LP.doc.makeObject('text', job, Object.assign({ name: 'Text: ' + String(p.text).slice(0, 24), params: p }, opts || {}));
    o.assign = textAssign(job, p, kind);
    o.missing = missing;
    return o;
  }

  /** Rebuild after a text or option change; colors reset to the text's mode (fill or outline). */
  function updateText(obj, params) {
    Object.assign(obj.params, params || {});
    const { job, missing, kind } = textJob(obj.params);
    obj.job = job;
    obj.assign = textAssign(job, obj.params, kind);
    obj.missing = missing;
    obj.name = 'Text: ' + String(obj.params.text).slice(0, 24);
    obj._frame = null;
    return obj;
  }

  LP.fonts = { init, get, listLocal, addLocal, layout, makeText, updateText, textAssign, DEFAULTS, registry };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */

/**
 * @file writers.js
 * @version 0.2
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Output writers for the laser prep app: page layout, PDF written byte by byte (exact DeviceRGB, 0.072 pt lines), SVG for printing, and R12 DXF (core design v1.1, section 7).
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const RGB = { red: '1 0 0', blue: '0 0 1', black: '0 0 0' };
  const HEX = { red: '#FF0000', blue: '#0000FF', black: '#000000' };
  const ACI = { red: 1, blue: 5, black: 7 };
  const LAYER = { red: 'CUT', blue: 'SCORE', black: 'ENGRAVE' };
  const STROKE_ORDER = ['black', 'blue', 'red'];
  const num = v => String(Math.round(v * 10000) / 10000);

  /** Place the part's bounding box at (margin, margin) from the bed's top-left. Page coordinates: inches, y down. */
  function layout(job, bed, margin) {
    const b = job.box, w = b[2] - b[0], h = b[3] - b[1];
    return {
      w, h, margin, bed,
      fits: w + margin <= bed.w + 1e-9 && h + margin <= bed.h + 1e-9,
      map: p => [p[0] - b[0] + margin, b[3] - p[1] + margin],
    };
  }

  /** Cubic Beziers (90 degrees or less each) for an arc segment, in the segment's own coordinates. */
  function arcBeziers(s) {
    const sw = LP.arcSweep(s) * (s.ccw ? 1 : -1);
    const n = Math.max(1, Math.ceil(Math.abs(sw) / (Math.PI / 2) - 1e-9));
    const d = sw / n, k = (4 / 3) * Math.tan(d / 4), out = [];
    for (let i = 0; i < n; i++) {
      const t1 = s.a0 + i * d, t2 = t1 + d;
      const p0 = [s.c[0] + s.r * Math.cos(t1), s.c[1] + s.r * Math.sin(t1)];
      const p3 = [s.c[0] + s.r * Math.cos(t2), s.c[1] + s.r * Math.sin(t2)];
      out.push([p0,
        [p0[0] - k * s.r * Math.sin(t1), p0[1] + k * s.r * Math.cos(t1)],
        [p3[0] + k * s.r * Math.sin(t2), p3[1] - k * s.r * Math.cos(t2)],
        p3]);
    }
    return out;
  }

  /** Drawing commands for one chain, mapped to page coordinates. Tiny joins inside tolerance become short lines. */
  function chainCmds(segs, map, closed) {
    const cmds = [];
    let cur = null;
    for (const s of segs) {
      const a = LP.start(s);
      if (!cur) cmds.push(['M', map(a)]);
      else if (LP.dist(cur, a) > 1e-9) cmds.push(['L', map(a)]);
      if (s.k === 'L') cmds.push(['L', map(s.b)]);
      else if (s.k === 'P') for (let i = 1; i < s.pts.length; i++) cmds.push(['L', map(s.pts[i])]);
      else if (s.k === 'C') cmds.push(['C', map(s.p[1]), map(s.p[2]), map(s.p[3])]);
      else for (const b of arcBeziers(s)) cmds.push(['C', map(b[1]), map(b[2]), map(b[3])]);
      cur = LP.end(s);
    }
    if (closed) cmds.push(['Z']);
    return cmds;
  }

  /** What gets written, by color, from a job and an assignment map { id: { outline, inside } }. */
  function plan(job, assign) {
    const strokes = { red: [], blue: [], black: [] }, fills = [];
    for (const L of job.loops) {
      const a = assign[L.id] || {};
      if (a.outline) strokes[a.outline].push({ segs: L.segs, closed: true });
      if (a.inside === 'black') fills.push([L, ...L.children]);
    }
    for (const c of job.open) {
      const a = assign[c.id] || {};
      if (a.outline) strokes[a.outline].push({ segs: c.segs, closed: false });
    }
    return { strokes, fills, counts: { cut: strokes.red.length, score: strokes.blue.length, vectorEngrave: strokes.black.length, rasterFills: fills.length } };
  }

  // ---------- PDF ----------

  function pdfOps(cmds) {
    return cmds.map(c => {
      if (c[0] === 'M') return `${num(c[1][0])} ${num(c[1][1])} m`;
      if (c[0] === 'L') return `${num(c[1][0])} ${num(c[1][1])} l`;
      if (c[0] === 'C') return `${num(c[1][0])} ${num(c[1][1])} ${num(c[2][0])} ${num(c[2][1])} ${num(c[3][0])} ${num(c[3][1])} c`;
      return 'h';
    }).join('\n');
  }

  /** opts: { bed:{w,h}, margin, lineWidth (inches, 0 allowed), title } */
  function writePDF(job, assign, opts) {
    const lay = layout(job, opts.bed, opts.margin);
    const H = opts.bed.h;
    const map = p => { const q = lay.map(p); return [q[0] * 72, (H - q[1]) * 72]; };
    const pl = plan(job, assign);
    const ops = ['q', '0 J 0 j'];
    if (pl.fills.length) {
      ops.push('0 0 0 rg');
      for (const group of pl.fills) {
        for (const L of group) ops.push(pdfOps(chainCmds(L.segs, map, true)));
        ops.push('f*');
      }
    }
    for (const color of STROKE_ORDER) {
      if (!pl.strokes[color].length) continue;
      ops.push(`${RGB[color]} RG`, `${num(opts.lineWidth * 72)} w`);
      for (const st of pl.strokes[color]) ops.push(pdfOps(chainCmds(st.segs, map, st.closed)));
      ops.push('S');
    }
    ops.push('Q');
    const content = ops.join('\n');
    const title = String(opts.title || 'laser job').replace(/[()\\]/g, '_');
    const objects = [
      // PrintScaling None asks Reader and browser PDF viewers to default to actual size, not fit to page.
      '<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(opts.bed.w * 72)} ${num(H * 72)}] /Resources << >> /Contents 4 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      `<< /Title (${title}) /Creator (laser_prep v${LP.VERSION || '0.1'}) >>`,
    ];
    let out = '%PDF-1.4\n%âãÏÓ\n' +
      `% Made by the Rambots laser prep app v${LP.VERSION || '0.1'}. Colors are DeviceRGB, no ICC profile. Line width ${num(opts.lineWidth)} in.\n`;
    const offsets = [];
    objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(o => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return { bytes, counts: pl.counts, fits: lay.fits };
  }

  // ---------- SVG ----------

  function svgD(cmds) {
    return cmds.map(c => {
      if (c[0] === 'M') return `M${num(c[1][0])} ${num(c[1][1])}`;
      if (c[0] === 'L') return `L${num(c[1][0])} ${num(c[1][1])}`;
      if (c[0] === 'C') return `C${num(c[1][0])} ${num(c[1][1])} ${num(c[2][0])} ${num(c[2][1])} ${num(c[3][0])} ${num(c[3][1])}`;
      return 'Z';
    }).join('');
  }

  /** True-size SVG of the output (no screen-only decoration). SVG cannot draw 0 width, so 0 becomes 0.001 in. */
  function writeSVG(job, assign, opts) {
    const lay = layout(job, opts.bed, opts.margin), pl = plan(job, assign);
    const lw = num(opts.lineWidth > 0 ? opts.lineWidth : 0.001);
    const parts = [];
    for (const group of pl.fills) parts.push(`<path d="${group.map(L => svgD(chainCmds(L.segs, lay.map, true))).join('')}" fill="#000000" fill-rule="evenodd"/>`);
    for (const color of STROKE_ORDER) {
      for (const st of pl.strokes[color]) parts.push(`<path d="${svgD(chainCmds(st.segs, lay.map, st.closed))}" fill="none" stroke="${HEX[color]}" stroke-width="${lw}"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(opts.bed.w)}in" height="${num(opts.bed.h)}in" viewBox="0 0 ${num(opts.bed.w)} ${num(opts.bed.h)}">\n${parts.join('\n')}\n</svg>`;
  }

  // ---------- DXF (R12) ----------

  /** R12 DXF, inches, y up, origin at the part's lower-left plus margin. Vectors only: insides are not written. */
  function writeDXF(job, assign, opts) {
    const b = job.box, m = opts.margin;
    const P = p => [p[0] - b[0] + m, p[1] - b[1] + m];
    const pl = plan(job, assign), out = [];
    const g = (code, val) => out.push(String(code), String(val));
    // Real extents and limits, so an importer that scales or centers from the header sees the true size.
    const hi = P([b[2], b[3]]);
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 1);
    g(9, '$EXTMIN'); g(10, num(m)); g(20, num(m)); g(30, 0); g(9, '$EXTMAX'); g(10, num(hi[0])); g(20, num(hi[1])); g(30, 0);
    g(9, '$LIMMIN'); g(10, 0); g(20, 0); g(9, '$LIMMAX'); g(10, num(hi[0] + m)); g(20, num(hi[1] + m)); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1);
    g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, '0.0');
    g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, 3);
    for (const c of ['red', 'blue', 'black']) { g(0, 'LAYER'); g(2, LAYER[c]); g(70, 0); g(62, ACI[c]); g(6, 'CONTINUOUS'); }
    g(0, 'ENDTAB'); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    let entities = 0;
    for (const color of STROKE_ORDER) {
      const head = () => { g(8, LAYER[color]); g(62, ACI[color]); };
      for (const st of pl.strokes[color]) {
        for (const s of st.segs) {
          entities++;
          if (s.k === 'L') {
            const a = P(s.a), e = P(s.b);
            g(0, 'LINE'); head(); g(10, num(a[0])); g(20, num(a[1])); g(30, 0); g(11, num(e[0])); g(21, num(e[1])); g(31, 0);
          } else if (s.k === 'A') {
            const c = P(s.c);
            if (LP.arcSweep(s) >= LP.TAU - 1e-9) {
              g(0, 'CIRCLE'); head(); g(10, num(c[0])); g(20, num(c[1])); g(30, 0); g(40, num(s.r));
            } else {
              const deg = a => ((a * 180) / Math.PI + 360) % 360;
              const [d0, d1] = s.ccw ? [s.a0, s.a1] : [s.a1, s.a0];
              g(0, 'ARC'); head(); g(10, num(c[0])); g(20, num(c[1])); g(30, 0); g(40, num(s.r)); g(50, num(deg(d0))); g(51, num(deg(d1)));
            }
          } else {
            const pts = (s.k === 'P' ? s.pts : LP.flatten(s, 0.0005)).map(P);
            g(0, 'POLYLINE'); head(); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 0);
            for (const q of pts) { g(0, 'VERTEX'); head(); g(10, num(q[0])); g(20, num(q[1])); g(30, 0); }
            g(0, 'SEQEND'); g(8, LAYER[color]);
          }
        }
      }
    }
    g(0, 'ENDSEC'); g(0, 'EOF');
    return { text: out.join('\n') + '\n', counts: pl.counts, entities, droppedFills: pl.fills.length };
  }

  Object.assign(LP, { layout, arcBeziers, chainCmds, plan, writePDF, writeSVG, writeDXF, svgD, OUTPUT_HEX: HEX });
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. Layout from the bed's top-left, arcs as cubic Beziers, PDF with even-odd fills and per-color strokes, SVG, and R12 DXF with CUT/SCORE/ENGRAVE layers.
 * v0.2 (2026-10-30): PDF catalog sets /PrintScaling /None; DXF header carries real extents and limits.
 */

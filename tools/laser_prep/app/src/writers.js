/**
 * @file writers.js
 * @version 0.3
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


  // ======================================================================================
  // Multi-object documents (v0.3): every object placed on the bed, all eight ULS colors,
  // fills by color, images, kerf compensation, and holding tabs.
  // ======================================================================================

  const COLOR_RGB = { black: [0, 0, 0], red: [255, 0, 0], green: [0, 255, 0], yellow: [255, 255, 0], blue: [0, 0, 255], magenta: [255, 0, 255], cyan: [0, 255, 255], orange: [255, 102, 0] };
  const COLOR_ACI = { red: 1, yellow: 2, green: 3, cyan: 4, blue: 5, magenta: 6, black: 7, orange: 30 };
  const COLOR_ORDER = ['black', 'orange', 'yellow', 'green', 'cyan', 'magenta', 'blue', 'red'];
  const pdfRGB = c => COLOR_RGB[c].map(v => num(v / 255)).join(' ');
  const hexOf = c => '#' + COLOR_RGB[c].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const lineCmds = (pts, closed) => { const c = [['M', pts[0]]]; for (let i = 1; i < pts.length; i++) c.push(['L', pts[i]]); if (closed) c.push(['Z']); return c; };

  /**
   * Everything that gets drawn, in bed inches (y down): images, fills (compound paths with their holes),
   * and strokes, with kerf compensation and holding tabs applied to cut outlines.
   */
  function renderDoc(doc) {
    const items = [], kerf = doc.kerf && doc.kerf.apply ? +doc.kerf.value || 0 : 0;
    for (const obj of doc.objects) {
      if (obj.hidden) continue;
      const map = LP.doc.mapper(obj);
      if (obj.kind === 'image' && obj.image) items.push({ type: 'image', obj, map });
      for (const L of obj.job.loops) {
        const a = obj.assign[L.id] || {};
        if (a.inside) items.push({ type: 'fill', color: a.inside, obj, rings: [L, ...L.children].map(x => chainCmds(x.segs, map, true)) });
        if (!a.outline) continue;
        const tabs = obj.tabs && obj.tabs[L.id];
        const cut = a.outline === 'red';
        if (cut && (kerf || (tabs && tabs.count > 0))) {
          const page = L.poly.map(map);
          const polys = kerf ? LP.joints.kerfPolys(page, L.depth, kerf) : [page];
          for (const poly of polys) {
            if (tabs && tabs.count > 0) for (const piece of LP.joints.splitForTabs(poly, tabs.count, tabs.width)) items.push({ type: 'stroke', color: a.outline, obj, cmds: lineCmds(piece, false) });
            else items.push({ type: 'stroke', color: a.outline, obj, cmds: lineCmds(poly.concat([poly[0]]), true) });
          }
        } else {
          items.push({ type: 'stroke', color: a.outline, obj, cmds: chainCmds(L.segs, map, true) });
        }
      }
      for (const c of obj.job.open) {
        const a = obj.assign[c.id] || {};
        if (a.outline) items.push({ type: 'stroke', color: a.outline, obj, cmds: chainCmds(c.segs, map, false) });
      }
    }
    return items;
  }

  function docCounts(items) {
    const n = { cut: 0, score: 0, vectorEngrave: 0, otherVector: 0, rasterFills: 0, images: 0 };
    for (const it of items) {
      if (it.type === 'image') n.images++;
      else if (it.type === 'fill') n.rasterFills++;
      else if (it.color === 'red') n.cut++;
      else if (it.color === 'blue') n.score++;
      else if (it.color === 'black') n.vectorEngrave++;
      else n.otherVector++;
    }
    return n;
  }

  /** Bed-sized PDF of the whole document, written byte by byte (DeviceRGB, no color profile). */
  function writeDocPDF(doc, opts) {
    const o = Object.assign({ lineWidth: 0.001, title: 'laser job' }, opts || {}), H = doc.bed.h;
    const items = renderDoc(doc), toPt = q => [q[0] * 72, (H - q[1]) * 72];
    const ptCmds = cmds => cmds.map(c => c[0] === 'Z' ? c : [c[0], ...c.slice(1).map(toPt)]);
    const ops = ['q', '0 J 0 j'], xobjs = [];
    for (const it of items.filter(i => i.type === 'image')) {
      const img = it.obj.image;
      if (!img.pdf) continue;
      const w = img.widthIn, h = img.heightIn;
      const P = (u, v) => toPt(it.map([u * w, v * h]));
      const p00 = P(0, 0), p10 = P(1, 0), p01 = P(0, 1);
      const name = 'Im' + (xobjs.length + 1);
      xobjs.push({ name, img });
      ops.push('q', [p10[0] - p00[0], p10[1] - p00[1], p01[0] - p00[0], p01[1] - p00[1], p00[0], p00[1]].map(num).join(' ') + ' cm', `/${name} Do`, 'Q');
    }
    for (const color of COLOR_ORDER) {
      const fills = items.filter(i => i.type === 'fill' && i.color === color);
      if (!fills.length) continue;
      ops.push(`${pdfRGB(color)} rg`);
      for (const f of fills) { for (const r of f.rings) ops.push(pdfOps(ptCmds(r))); ops.push('f*'); }
    }
    for (const color of COLOR_ORDER) {
      const strokes = items.filter(i => i.type === 'stroke' && i.color === color);
      if (!strokes.length) continue;
      ops.push(`${pdfRGB(color)} RG`, `${num(o.lineWidth * 72)} w`);
      for (const st of strokes) ops.push(pdfOps(ptCmds(st.cmds)));
      ops.push('S');
    }
    ops.push('Q');
    const content = ops.join('\n');
    const title = String(o.title).replace(/[()\\]/g, '_');
    const objects = [];
    const xref = xobjs.map((x, i) => `/${x.name} ${6 + i} 0 R`).join(' ');
    objects.push('<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(doc.bed.w * 72)} ${num(H * 72)}] /Resources << ${xobjs.length ? `/XObject << ${xref} >>` : ''} >> /Contents 4 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    objects.push(`<< /Title (${title}) /Creator (laser_prep v${LP.VERSION || '0.3'}) >>`);
    for (const x of xobjs) {
      const d = x.img.pdf.data;
      let bin = '';
      for (let i = 0; i < d.length; i += 8192) bin += String.fromCharCode.apply(null, d.subarray(i, i + 8192));
      objects.push(`<< /Type /XObject /Subtype /Image /Width ${x.img.w} /Height ${x.img.h} /ColorSpace /DeviceGray /BitsPerComponent 8${x.img.pdf.filter ? ' /Filter /' + x.img.pdf.filter : ''} /Length ${d.length} >>\nstream\n${bin}\nendstream`);
    }
    let out = '%PDF-1.4\n%âãÏÓ\n' +
      `% Made by the Rambots laser prep app v${LP.VERSION || '0.3'}. Colors are DeviceRGB, no ICC profile. Line width ${num(o.lineWidth)} in.\n`;
    const offsets = [];
    objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
    const xrefAt = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => { out += `${String(off).padStart(10, '0')} 00000 n \n`; });
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return { bytes, counts: docCounts(items) };
  }

  /** True-size SVG of the whole document (images as PNG). SVG cannot draw 0 width, so 0 becomes 0.001 in. */
  function writeDocSVG(doc, opts) {
    const o = Object.assign({ lineWidth: 0.001 }, opts || {}), items = renderDoc(doc), lw = num(o.lineWidth > 0 ? o.lineWidth : 0.001), parts = [];
    for (const it of items) {
      if (it.type === 'image' && it.obj.image.png) {
        const img = it.obj.image, Q = (u, v) => it.map([u * img.widthIn, (1 - v) * img.heightIn]);
        const q00 = Q(0, 0), q10 = Q(1, 0), q01 = Q(0, 1);
        parts.push(`<image href="${img.png}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform="matrix(${[q10[0] - q00[0], q10[1] - q00[1], q01[0] - q00[0], q01[1] - q00[1], q00[0], q00[1]].map(num).join(' ')})"/>`);
      }
    }
    for (const it of items) if (it.type === 'fill') parts.push(`<path d="${it.rings.map(svgD).join('')}" fill="${hexOf(it.color)}" fill-rule="evenodd"/>`);
    for (const it of items) if (it.type === 'stroke') parts.push(`<path d="${svgD(it.cmds)}" fill="none" stroke="${hexOf(it.color)}" stroke-width="${lw}"/>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(doc.bed.w)}in" height="${num(doc.bed.h)}in" viewBox="0 0 ${num(doc.bed.w)} ${num(doc.bed.h)}">\n${parts.join('\n')}\n</svg>`;
  }

  /** R12 DXF of the vector strokes (inches, y up from the bed's lower-left). Fills and images are left out and counted. */
  function writeDocDXF(doc) {
    const items = renderDoc(doc), H = doc.bed.h, out = [], g = (code, val) => out.push(String(code), String(val));
    const P = q => [q[0], H - q[1]];
    const used = [...new Set(items.filter(i => i.type === 'stroke').map(i => i.color))];
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 1);
    g(9, '$EXTMIN'); g(10, 0); g(20, 0); g(30, 0); g(9, '$EXTMAX'); g(10, num(doc.bed.w)); g(20, num(H)); g(30, 0);
    g(9, '$LIMMIN'); g(10, 0); g(20, 0); g(9, '$LIMMAX'); g(10, num(doc.bed.w)); g(20, num(H)); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1); g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, '0.0'); g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, used.length);
    for (const c of used) { g(0, 'LAYER'); g(2, LAYER[c] || c.toUpperCase()); g(70, 0); g(62, COLOR_ACI[c]); g(6, 'CONTINUOUS'); }
    g(0, 'ENDTAB'); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    let entities = 0;
    for (const it of items) {
      if (it.type !== 'stroke') continue;
      const pts = [];
      let cur = null;
      for (const c of it.cmds) {
        if (c[0] === 'M' || c[0] === 'L') { cur = c[1]; pts.push(cur); }
        else if (c[0] === 'C') { for (let k = 1; k <= 16; k++) pts.push(LP.bez([cur, c[1], c[2], c[3]], k / 16)); cur = c[3]; }
      }
      const closed = it.cmds[it.cmds.length - 1][0] === 'Z';
      const layer = LAYER[it.color] || it.color.toUpperCase();
      g(0, 'POLYLINE'); g(8, layer); g(62, COLOR_ACI[it.color]); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, closed ? 1 : 0);
      for (const q of pts) { const p = P(q); g(0, 'VERTEX'); g(8, layer); g(10, num(p[0])); g(20, num(p[1])); g(30, 0); }
      g(0, 'SEQEND'); g(8, layer);
      entities++;
    }
    g(0, 'ENDSEC'); g(0, 'EOF');
    const n = docCounts(items);
    return { text: out.join('\n') + '\n', entities, droppedFills: n.rasterFills, droppedImages: n.images };
  }

  Object.assign(LP, { layout, arcBeziers, chainCmds, plan, writePDF, writeSVG, writeDXF, svgD, OUTPUT_HEX: HEX,
    COLOR_RGB, COLOR_ORDER, hexOf, renderDoc, docCounts, writeDocPDF, writeDocSVG, writeDocDXF });
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. Layout from the bed's top-left, arcs as cubic Beziers, PDF with even-odd fills and per-color strokes, SVG, and R12 DXF with CUT/SCORE/ENGRAVE layers.
 * v0.2 (2026-10-30): PDF catalog sets /PrintScaling /None; DXF header carries real extents and limits.
 * v0.3 (2026-11-02): Multi-object documents: renderDoc (kerf compensation, holding tabs, fills by color, images), writeDocPDF with image XObjects and all eight ULS colors, writeDocSVG, writeDocDXF. Phase 1 single-job writers unchanged.
 */

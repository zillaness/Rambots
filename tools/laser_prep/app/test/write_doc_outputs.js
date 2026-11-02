/**
 * @file write_doc_outputs.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Builds one Phase 2 document with every feature (file, shapes, text, image with outline, patterns, box, joints, tabs, kerf, copies) and writes its PDF, SVG, and DXF for validate_doc_outputs.py.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 *
 * Usage: node write_doc_outputs.js <out_dir>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./load_app.js');
const LP = load();
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

(async () => {
  const doc = LP.doc.newDoc({ w: 24, h: 18 });
  const parsed = LP.parseDXF(fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', 'f08_nested_plate_v1.0.dxf'), 'utf8'));
  const plate = LP.doc.makeObject('file', LP.analyze(parsed, { scale: 1 }), { name: 'f08 plate', x: 0.5, y: 0.5 });
  plate.tabs[plate.job.loops.find(L => L.depth === 0).id] = { count: 4, width: 0.08 };
  doc.objects.push(plate);
  const rect = LP.shapes.makeShape('rect', { w: 3, h: 2, r: 0.25 }, { x: 7, y: 0.5 });
  rect.assign[rect.job.loops[0].id] = { outline: 'blue', inside: 'black' };
  doc.objects.push(rect, LP.shapes.makeShape('star', { n: 5, d: 2 }, { x: 11, y: 0.5, rot: 15 }));
  doc.objects.push(LP.fonts.makeText({ text: 'RAMBOTS 2204', fontId: 'label-sans', cap: 0.4 }, { x: 0.5, y: 5 }));
  doc.objects.push(LP.fonts.makeText({ text: 'TEAM 2204', fontId: 'allerta-stencil', cap: 0.5, path: { type: 'arc', radius: 1.5, side: 'top' } }, { x: 7, y: 4.5 }));
  doc.objects.push(LP.fonts.makeText({ text: 'score me', fontId: 'hershey', cap: 0.3, color: 'blue' }, { x: 11, y: 5 }));
  const w = 120, h = 80, rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = 4 * (y * w + x), v = Math.round((x / w) * 255), ink = Math.hypot(x - 60, y - 40) < 30; rgba[i] = rgba[i + 1] = rgba[i + 2] = ink ? v : 255; rgba[i + 3] = 255; }
  const img = LP.images.makeImage(Object.assign({ w, h }, LP.images.grayFromRGBA(rgba, w, h)), 3, { x: 15, y: 0.5 });
  await LP.images.prepare(img);
  doc.objects.push(img, LP.images.makeOutline(img, 0.1));
  const grid = LP.patterns.colorGrid(); grid.x = 0.5; grid.y = 8; doc.objects.push(grid);
  const fit = LP.patterns.fitComb({ thickness: 0.125 }); fit.x = 7; fit.y = 8; doc.objects.push(fit);
  const box = LP.joints.makeBox({ w: 3, d: 2, h: 1.5, thickness: 0.125, finger: 0.4 }, 0.5, 11); doc.objects.push(...box);
  const part = LP.shapes.makeShape('rect', { w: 3, h: 1.5 }, { x: 15, y: 5 });
  const L0 = part.job.loops[0], top = L0.segs.findIndex(s => s.k === 'L' && Math.abs(s.a[1] - 1.5) < 1e-9 && Math.abs(s.b[1] - 1.5) < 1e-9);
  const ts = LP.joints.tabAndSlot(part, L0.id, top, { thickness: 0.125, width: 0.4, count: 2, clearance: 0.004 });
  const slots = LP.doc.makeObject('slots', LP.analyze({ kind: 'gen', units: 1, segs: ts.slots, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 }), { name: 'Slots', x: 15, y: 7.5 });
  doc.objects.push(part, slots);
  LP.doc.copyGrid(doc, [doc.objects[2].id], 1, 3, 0.25);
  doc.kerf = { value: 0.006, apply: true };
  const pdf = LP.writeDocPDF(doc, { title: 'phase2 everything' });
  fs.writeFileSync(path.join(out, 'phase2_everything.pdf'), Buffer.from(pdf.bytes));
  fs.writeFileSync(path.join(out, 'phase2_everything.svg'), LP.writeDocSVG(doc));
  const dxf = LP.writeDocDXF(doc);
  fs.writeFileSync(path.join(out, 'phase2_everything.dxf'), dxf.text);
  const bbs = doc.objects.map(o => Object.assign({ name: o.name }, LP.doc.bbox(o)));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ counts: pdf.counts, dxf: { entities: dxf.entities, droppedFills: dxf.droppedFills, droppedImages: dxf.droppedImages }, objects: bbs.length, bbs }, null, 1));
  console.log(JSON.stringify({ counts: pdf.counts, objects: bbs.length, dxfEntities: dxf.entities }));
})();

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */

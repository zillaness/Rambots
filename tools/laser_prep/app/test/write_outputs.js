/**
 * @file write_outputs.js
 * @version 0.1
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Writes PDF, SVG, and DXF output for every fixture with a default color plan, for validate_outputs.py to check.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 *
 * Usage: node write_outputs.js <out_dir>
 * Plan: every loop outline red, every open chain blue, outermost loops filled black.
 */
'use strict';
const fs = require('fs');
const path = require('path');
for (const f of ['geom.js', 'dxf_in.js', 'writers.js']) require(path.join(__dirname, '..', 'src', f));
const LP = globalThis.LP;
const FIX = path.join(__dirname, '..', '..', 'fixtures');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const spec = JSON.parse(fs.readFileSync(path.join(FIX, 'expected_results_v1.1.json'), 'utf8'));
const manifest = [];
for (const fx of spec.fixtures) {
  const parsed = LP.parseDXF(fs.readFileSync(path.join(FIX, fx.file), 'utf8'));
  const job = LP.analyze(parsed, { scale: parsed.units ? LP.UNIT_FACTORS[parsed.units] : 1 });
  const assign = {};
  for (const L of job.loops) assign[L.id] = { outline: 'red', inside: L.depth === 0 ? 'black' : null };
  for (const c of job.open) assign[c.id] = { outline: 'blue' };
  const big = Math.max(job.size[0], job.size[1]);
  const bed = big + 1 <= 24 ? { w: 24, h: 12 } : { w: Math.ceil(big + 1), h: Math.ceil(big + 1) };
  if (job.size[1] + 0.5 > bed.h) bed.h = Math.ceil(job.size[1] + 1);
  const opts = { bed, margin: 0.25, lineWidth: 0.001, title: fx.file };
  const base = path.join(out, fx.file.replace('.dxf', ''));
  const pdf = LP.writePDF(job, assign, opts);
  fs.writeFileSync(base + '.pdf', Buffer.from(pdf.bytes));
  fs.writeFileSync(base + '.svg', LP.writeSVG(job, assign, opts));
  const dxf = LP.writeDXF(job, assign, opts);
  fs.writeFileSync(base + '.out.dxf', dxf.text);
  manifest.push({ base: path.basename(base), bed, size: job.size, sizeTolerance: fx.sizeTolerance, counts: pdf.counts, fits: pdf.fits, open: job.open.length, loops: job.loops.length });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`wrote ${manifest.length} x 3 files to ${out}`);

/** CHANGELOG
 * v0.1 (2026-10-30): Initial release.
 */

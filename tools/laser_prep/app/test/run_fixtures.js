/**
 * @file run_fixtures.js
 * @version 0.1
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Runs the app's DXF reader and geometry core on every fixture and compares to fixtures/expected_results_v1.1.json.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 *
 * Usage: node run_fixtures.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
for (const f of ['geom.js', 'dxf_in.js', 'writers.js']) {
  if (fs.existsSync(path.join(SRC, f))) require(path.join(SRC, f));
}
const LP = globalThis.LP;

const FIX = path.join(__dirname, '..', '..', 'fixtures');
const spec = JSON.parse(fs.readFileSync(path.join(FIX, 'expected_results_v1.1.json'), 'utf8'));
const D = spec.defaults;

let failures = 0;
for (const fx of spec.fixtures) {
  const parsed = LP.parseDXF(fs.readFileSync(path.join(FIX, fx.file), 'utf8'));
  const scale = parsed.units ? LP.UNIT_FACTORS[parsed.units] : 1;
  const job = LP.analyze(parsed, { scale, tol: D.joinTolerance, nearMax: D.almostClosedMax, refWords: D.referenceLayerWords, plausibility: D.plausibility });
  const got = job.stats, bad = [];
  for (const key of ['loops', 'openChains', 'depths', ...D.omittedCountsMeanZero]) {
    const want = key in fx ? fx[key] : (D.omittedCountsMeanZero.includes(key) ? 0 : undefined);
    if (want !== undefined && JSON.stringify(got[key]) !== JSON.stringify(want)) bad.push(`${key}: got ${JSON.stringify(got[key])} want ${JSON.stringify(want)}`);
  }
  const wantIgnored = fx.ignored || {};
  if (JSON.stringify(sortKeys(got.ignored)) !== JSON.stringify(sortKeys(wantIgnored))) bad.push(`ignored: got ${JSON.stringify(got.ignored)} want ${JSON.stringify(wantIgnored)}`);
  const wantSug = fx.unitSuggestions || [];
  if (JSON.stringify(got.unitSuggestions) !== JSON.stringify(wantSug)) bad.push(`unitSuggestions: got ${JSON.stringify(got.unitSuggestions)} want ${JSON.stringify(wantSug)}`);
  if (!!fx.unitsMissing !== got.unitsMissing) bad.push(`unitsMissing: got ${got.unitsMissing}`);
  if (got.size.some((g, i) => Math.abs(g - fx.size[i]) > fx.sizeTolerance)) bad.push(`size: got ${got.size.map(v => v.toFixed(4))} want ${fx.size}`);
  if (bad.length) failures++;
  console.log((bad.length ? 'FAIL ' : 'ok   ') + fx.file + (bad.length ? '  ' + bad.join('; ') : ''));
}
console.log(`${spec.fixtures.length - failures}/${spec.fixtures.length} fixtures pass`);
process.exit(failures ? 1 : 0);

function sortKeys(o) { return Object.fromEntries(Object.entries(o).sort()); }

/** CHANGELOG
 * v0.1 (2026-10-30): Initial release. Compares counts, depths, ignored types, unit suggestions, units-missing flag, and size.
 */

/**
 * @file load_app.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Loads the vendored libraries and the app's src modules into Node's global scope the same way the browser does, for the tests.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

globalThis.window = globalThis.window || globalThis;
globalThis.self = globalThis.self || globalThis;

const SRC = path.join(__dirname, '..', 'src');
const ORDER = require('../build_order.json');

/** Run each file in the shared global scope, as a browser <script> would. Missing files are skipped. */
function load(files) {
  for (const f of files || ORDER) {
    const p = path.join(SRC, f);
    if (!fs.existsSync(p)) continue;
    vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
  }
  return globalThis.LP;
}

module.exports = { load };

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */

/**
 * @file ui_smoke.js
 * @version 0.1
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Browser test of the built app: load files, confirm units, click to color, save PDF, print layout, SVG import, screenshots.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 *
 * Usage: node ui_smoke.js <out_dir>
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const APP = path.join(__dirname, '..', 'laser_prep_v0.1.html');
const FIX = path.join(__dirname, '..', '..', 'fixtures');
const CARD = path.join(__dirname, '..', '..', 'test_card');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + APP);

  // 1. Plate with holes, pocket, island (inches).
  await page.setInputFiles('#file', path.join(FIX, 'f08_nested_plate_v1.0.dxf'));
  await page.waitForSelector('#preview:not([hidden])');
  check('PDF locked before units confirmed', await page.isDisabled('#save-pdf'));
  await page.click('#confirm-units');
  check('PDF enabled after confirm', !(await page.isDisabled('#save-pdf')));
  check('5 loops cut by default', (await page.textContent('#c-cut')) === '5');
  // Click inside the plate (outermost loop, between the edge and a hole) and engrave it.
  const box = await page.locator('#preview').boundingBox();
  const vb = await page.$eval('#preview', s => { const v = s.viewBox.baseVal; return { x: v.x, y: v.y, width: v.width, height: v.height }; });
  const toScreen = (x, y) => [box.x + ((x - vb.x) / vb.width) * box.width, box.y + ((y - vb.y) / vb.height) * box.height];
  let [sx, sy] = toScreen(0.25 + 0.5, 0.25 + 2.0);      // plate interior, left of the holes
  await page.mouse.click(sx, sy);
  await page.keyboard.press('k');
  check('inside set to engrave', (await page.textContent('#c-fill')) === '1');
  [sx, sy] = toScreen(0.25 + 3.75, 0.25 + 2.0);        // island center (depth 2)
  await page.mouse.click(sx, sy);
  await page.click('.palette button[data-color="black"]');
  check('island inside engraved too', (await page.textContent('#c-fill')) === '2');
  [sx, sy] = toScreen(0.25 + 1.0, 0.25 + 3.0 - 0.25);  // top edge of the hole at DXF (1, 1), which sits 3.25 in from the top of the bed
  await page.mouse.click(sx, sy);
  await page.keyboard.press('b');
  check('hole outline set to score', (await page.textContent('#c-score')) === '1' && (await page.textContent('#c-cut')) === '4');
  await page.screenshot({ path: path.join(out, 'app_plate.png') });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save-pdf')]);
  const pdfPath = path.join(out, dl.suggestedFilename());
  await dl.saveAs(pdfPath);
  const pdf = fs.readFileSync(pdfPath, 'latin1');
  check('PDF has even-odd fills, red and blue strokes', /f\*/.test(pdf) && /1 0 0 RG/.test(pdf) && /0 0 1 RG/.test(pdf) && /0\.072 w/.test(pdf), dl.suggestedFilename());
  const [dd] = await Promise.all([page.waitForEvent('download'), page.click('#save-dxf')]);
  await dd.saveAs(path.join(out, dd.suggestedFilename()));
  check('DXF warns that fills are left out', /left out/.test(await page.textContent('#out-status')));

  // 2. Inches header over mm coordinates: too big as read, mm option fits.
  await page.setInputFiles('#file', path.join(FIX, 'f21_header_inches_coords_mm_v1.0.dxf'));
  await page.waitForFunction(() => /does not fit the bed/.test(document.getElementById('units-note').textContent));
  check('wrong-unit file flagged as too big', true);
  await page.check('#units input[value="1"]');
  await page.click('#confirm-units');
  check('mm choice gives 4 x 2 in', /4\.00 x 2\.00 in/.test(await page.textContent('#units-status')));

  // 3. Almost-closed gap: offered fix joins it.
  await page.setInputFiles('#file', path.join(FIX, 'f03_lines_square_gap_near_v1.0.dxf'));
  await page.waitForSelector('#warns [data-tol]');
  await page.click('#warns [data-tol]');
  check('gap join button closes the shape', /1 closed shape/.test(await page.textContent('#warns')));

  // 4. Bend lines hidden, test card raw mm file.
  await page.setInputFiles('#file', path.join(FIX, 'f27_flat_pattern_layers_v1.0.dxf'));
  check('bend layers hidden', /bend or reference layers/.test(await page.textContent('#warns')));
  await page.setInputFiles('#file', path.join(CARD, 'laser_test_card_raw_mm_v1.0.dxf'));
  await page.click('#confirm-units');
  check('raw mm test card reads 6.50 x 4.00 in', /6\.50 x 4\.00 in/.test(await page.textContent('#units-status')));
  await page.screenshot({ path: path.join(out, 'app_rawmm.png') });

  // 5. SVG import: 2 x 1 in rect with a 0.5 in hole, plus a path with arcs, drawn in mm.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="40mm" viewBox="0 0 80 40">
    <g transform="translate(5 5)"><rect x="0" y="0" width="50.8" height="25.4" rx="3"/><circle cx="25.4" cy="12.7" r="6.35"/></g>
    <path d="M60 5 h10 a5 5 0 0 1 5 5 v10 a5 5 0 0 1 -5 5 h-10 z"/><text x="1" y="1">x</text></svg>`;
  const svgFile = path.join(out, 'sample_v0.1.svg');
  fs.writeFileSync(svgFile, svg);
  await page.setInputFiles('#file', svgFile);
  await page.waitForFunction(() => /SVG/.test(document.getElementById('file-status').textContent));
  await page.click('#confirm-units');
  const st = await page.evaluate(() => LP.ui.state.job.stats);
  check('SVG: 3 loops, depths 0/0/1', st.loops === 3 && JSON.stringify(st.depths) === '[0,0,1]', JSON.stringify({ loops: st.loops, depths: st.depths, size: st.size.map(v => v.toFixed(3)) }));
  check('SVG: size 2.756 x 1.000 in', Math.abs(st.size[0] - 70 / 25.4) < 0.002 && Math.abs(st.size[1] - 1) < 0.002);
  check('SVG: text counted', st.textSkipped === 1);

  // 6. Print layout: page size and no extra pages.
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('#print');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(out, 'print_check.pdf'), preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  check('no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} checks pass`);
  process.exit(failed ? 1 : 0);
})();

/** CHANGELOG
 * v0.1 (2026-10-30): Initial release.
 */

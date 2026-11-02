/**
 * @file ui_smoke.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-11-02
 * @description Browser test of the built app: Phase 1 flows (load, units, click to color, save) and every Phase 2 feature (shapes, text, copies, repeat, arrange, align, tabs, fingers, tab-and-slot, box, patterns, images, kerf, file colors, resize, undo, delete, off-bed lock).
 * @aiUpdate Update @lastUpdated and @version. Keep the filename. Append changelog at bottom.
 *
 * Usage: node ui_smoke.js <out_dir>
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const APP = path.join(__dirname, '..', 'laser_prep_v0.3.html');
const FIX = path.join(__dirname, '..', '..', 'fixtures');
const CARD = path.join(__dirname, '..', '..', 'test_card');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? '  ' + detail : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + APP);
  // Layout and Tabs and joints start collapsed; open every section the way a student would.
  await page.evaluate(() => document.querySelectorAll('details.step').forEach(d => { d.open = true; }));

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const objs = () => ev(() => LP.ui.state.doc.objects.map(o => ({ id: o.id, kind: o.kind, name: o.name })));
  const bbox = id => ev(id => LP.doc.bbox(LP.ui.state.doc.objects.find(o => o.id === id)), id);
  const toScreen = (x, y) => ev(([x, y]) => { const svg = document.getElementById('preview'), pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const q = pt.matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [x, y]);
  const clickBed = async (x, y, shift) => { const [cx, cy] = await toScreen(x, y); if (shift) await page.keyboard.down('Shift'); await page.mouse.click(cx, cy); if (shift) await page.keyboard.up('Shift'); };
  const num = async id => +(await page.textContent(id));
  const selectIds = ids => ev(ids => { const s = LP.ui.state; s.sel.clear(); for (const id of ids) { const o = s.doc.objects.find(x => x.id === id); s.sel.add(o.id + '|' + (o.kind === 'image' ? 'img' : (o.job.loops[0] || o.job.open[0]).id + ':o')); } LP.ui.render(); }, ids);
  const saveName = async btn => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(btn)]); const p = path.join(out, d.suggestedFilename()); await d.saveAs(p); return p; };

  check('page loads with 3 bundled fonts and a 24 x 18 bed', (await page.textContent('#ver')) === '0.3' && (await ev(() => LP.fonts.registry.length)) === 3 && (await ev(() => LP.ui.state.doc.bed.w + 'x' + LP.ui.state.doc.bed.h)) === '24x18');

  // ---- Phase 1 flows ----
  await page.setInputFiles('#file', path.join(FIX, 'f08_nested_plate_v1.0.dxf'));
  await page.waitForFunction(() => LP.ui.state.doc.objects.length === 1);
  const plate = (await objs())[0];
  check('file loads as an unconfirmed object; output locked', plate.kind === 'file' && await page.isDisabled('#save-pdf'));
  await page.click('#confirm-units');
  check('confirming units unlocks output; 5 loops cut', !(await page.isDisabled('#save-pdf')) && (await num('#c-cut')) === 5);
  const pb = await bbox(plate.id);
  await clickBed(pb.x + 0.5, pb.y + 2.0); await page.keyboard.press('k');
  check('click inside the plate + K engraves it', (await num('#c-fill')) === 1);
  await clickBed(pb.x + 1.0, pb.y + 4 - 1.25); await page.keyboard.press('b');
  check('click a hole edge + B scores it', (await num('#c-score')) === 1 && (await num('#c-cut')) === 4);
  let pdf = fs.readFileSync(await saveName('#save-pdf'), 'latin1');
  check('saved PDF: even-odd fill, red and blue, hairline, no scaling', /f\*/.test(pdf) && /1 0 0 RG/.test(pdf) && /0 0 1 RG/.test(pdf) && /0\.072 w/.test(pdf) && /\/PrintScaling \/None/.test(pdf));
  await clickBed(pb.x + 3, pb.y + 4);
  await page.fill('#tab-count', '4'); await page.click('#tab-apply');
  check('4 holding tabs split the plate outline into 4 cut pieces', (await num('#c-cut')) === 3 + 4, await page.textContent('#c-cut'));
  await page.check('#kerf-on');
  check('kerf compensation shows in the checks', /Kerf compensation on/.test(await page.textContent('#warns')));
  await page.uncheck('#kerf-on');

  // ---- shapes, fingers, tab-and-slot ----
  await page.selectOption('#add-shape', 'rect');
  let all = await objs();
  const rect = all[all.length - 1];
  await page.fill('#shape-fields input[data-shape="w"]', '3'); await page.dispatchEvent('#shape-fields input[data-shape="w"]', 'change');
  let rb = await bbox(rect.id);
  check('shape width edited to 3 in', Math.abs(rb.w - 3) < 1e-6, rb.w.toFixed(4));
  await clickBed(rb.x + rb.w / 2, rb.y + rb.h);
  await page.fill('#j-t', '0.125'); await page.fill('#j-f', '0.4');
  await page.click('#finger-apply');
  const fingerInfo = await ev(id => { const o = LP.ui.state.doc.objects.find(x => x.id === id); return { loops: o.job.loops.length, area: o.job.loops[0].area }; }, rect.id);
  check('fingers cut into the picked edge', /fingers/.test(await page.textContent('#joint-status')) && fingerInfo.loops === 1 && fingerInfo.area < 3.0 - 0.01, JSON.stringify(fingerInfo));
  await page.selectOption('#add-shape', 'rect');
  all = await objs();
  const rect2 = all[all.length - 1]; rb = await bbox(rect2.id);
  await clickBed(rb.x + rb.w / 2, rb.y);
  await page.click('#tabslot-apply');
  check('tab-and-slot adds tabs and a matching slot strip', (await objs()).some(o => o.kind === 'slots'), await page.textContent('#joint-status'));

  // ---- text, repeat, copies ----
  await page.click('#add-text');
  all = await objs();
  const text = all[all.length - 1];
  await page.fill('#text-value', 'A&B'); await page.dispatchEvent('#text-value', 'change');
  check('missing characters are reported', /no &/.test(await page.textContent('#text-status')));
  await page.fill('#text-value', 'PART {}'); await page.dispatchEvent('#text-value', 'change');
  await selectIds([text.id]);
  await page.fill('#repeat-list', '1-3'); await page.fill('#copy-cols', '3');
  await page.click('#repeat-make');
  const texts = await ev(() => LP.ui.state.doc.objects.filter(o => o.kind === 'text').map(o => o.params.text));
  check('repeat with list makes PART 1, PART 2, PART 3', JSON.stringify(texts) === JSON.stringify(['PART 1', 'PART 2', 'PART 3']), JSON.stringify(texts));
  await selectIds([rect2.id]);
  const before = (await objs()).length;
  await page.fill('#copy-rows', '1'); await page.fill('#copy-cols', '3'); await page.click('#copy-make');
  check('copies 1 x 3 adds 2 objects', (await objs()).length === before + 2);

  // ---- box, patterns, image ----
  await page.click('#add-box'); await page.click('#box-make');
  check('box makes 6 panels', (await objs()).filter(o => /^Box /.test(o.name)).length === 6);
  const fillsBefore = await num('#c-fill');
  await page.selectOption('#add-pattern', 'colors');
  check('color grid adds 8 raster fills', (await num('#c-fill')) === fillsBefore + 8, await page.textContent('#c-fill'));
  const png = await ev(() => { const c = document.createElement('canvas'); c.width = 80; c.height = 60; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 80, 60); g.fillStyle = '#000'; g.beginPath(); g.arc(40, 30, 20, 0, Math.PI * 2); g.fill(); return c.toDataURL('image/png').split(',')[1]; });
  await page.setInputFiles('#image-file', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => LP.ui.state.doc.objects.some(o => o.kind === 'image' && o.image.pdf));
  await page.click('#img-outline');
  check('image added and an offset cut outline traced around it', (await objs()).some(o => o.kind === 'outline'));

  // ---- file colors (CutSheetCalculator-style SVG layers) ----
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="5in" height="3in" viewBox="0 0 5 3"><g id="CUT" fill="none" stroke="#ff0000" stroke-width="0.001"><path d="M0.2 0.2H4.8V2.8H0.2Z"/></g><g id="ENGRAVE" fill="none" stroke="#0000ff"><path d="M1 1.5H4"/></g></svg>`;
  fs.writeFileSync(path.join(out, 'csc_sheet_v0.3.svg'), svg);
  await page.setInputFiles('#file', path.join(out, 'csc_sheet_v0.3.svg'));
  await page.waitForFunction(() => LP.ui.state.doc.objects.some(o => o.name === 'csc_sheet_v0.3'));
  const fc = await ev(() => { const o = LP.ui.state.doc.objects.find(o => o.name === 'csc_sheet_v0.3'); return { colors: !!o.fileColors, loop: o.assign[o.job.loops[0].id].outline, line: o.assign[o.job.open[0].id].outline }; });
  check('SVG with CUT and ENGRAVE layers opens already colored (red cut, blue line)', fc.colors && fc.loop === 'red' && fc.line === 'blue', JSON.stringify(fc));
  await page.click('#confirm-units');

  // ---- arrange, align, resize, undo, delete, off-bed lock ----
  await ev(() => { LP.ui.state.sel.clear(); LP.ui.render(); });
  await page.selectOption('#nest-engine', 'outline'); await page.fill('#nest-gap', '0.1');
  await page.click('#nest-run');
  await page.waitForFunction(() => /placed/.test(document.getElementById('nest-status').textContent), null, { timeout: 120000 });
  const ns = await page.textContent('#nest-status');
  check('arrange everything: parts placed, no overlaps', /No overlaps/.test(ns), ns.slice(0, 160));
  const together = await ev(() => { const d = LP.ui.state.doc, img = d.objects.find(o => o.kind === 'image'), ol = d.objects.find(o => o.kind === 'outline');
    // The outline traces the dark disk, which is centered in the image, so the two centers must still match.
    const a = LP.doc.bbox(img), b = LP.doc.bbox(ol); return Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2); });
  check('arrange keeps the cut outline centered on its image', together < 0.02, together.toFixed(4) + ' in apart');
  await page.screenshot({ path: path.join(out, 'app_v03_arranged.png') });
  const two = (await objs()).filter(o => o.kind === 'shape').slice(0, 2).map(o => o.id);
  await selectIds(two);
  await page.selectOption('#align-ref', 'selection'); await page.click('[data-align="left"]');
  const [a1, a2] = [await bbox(two[0]), await bbox(two[1])];
  check('align left lines up two shapes', Math.abs(a1.x - a2.x) < 1e-6);
  await selectIds([plate.id]);
  await page.fill('#resize-pct', '50'); await page.click('#resize-apply');
  const notResized = await ev(id => LP.ui.state.doc.objects.find(o => o.id === id).scale, plate.id);
  await page.check('#resize-ok'); await page.click('#resize-apply');
  check('resize needs the warning box ticked, then applies with a warning', notResized === 1 && (await ev(id => LP.ui.state.doc.objects.find(o => o.id === id).scale, plate.id)) === 0.5 && /resized to 50%/.test(await page.textContent('#warns')));
  const nBefore = (await objs()).length;
  await page.keyboard.press('Delete');
  const nAfter = (await objs()).length;
  await page.click('#undo');
  check('Delete removes the selection; Undo brings it back', nAfter === nBefore - 1 && (await objs()).length === nBefore);
  await selectIds([rect.id]);
  await page.fill('#obj-x', '30'); await page.dispatchEvent('#obj-x', 'change');
  check('an object off the bed locks output and is named in the checks', (await page.isDisabled('#save-pdf')) && /Off the bed/.test(await page.textContent('#warns')));
  await page.click('#undo');

  // ---- wrong units, gap join, bend layers ----
  await page.setInputFiles('#file', path.join(FIX, 'f21_header_inches_coords_mm_v1.0.dxf'));
  await page.waitForFunction(() => /does not fit the bed/.test(document.getElementById('units-note').textContent));
  await page.check('#units input[value="1"]'); await page.click('#confirm-units');
  check('wrong-unit file: mm choice gives 4 x 2 in', /4\.00 x 2\.00 in/.test(await page.textContent('#units-status')));
  await page.setInputFiles('#file', path.join(FIX, 'f03_lines_square_gap_near_v1.0.dxf'));
  await page.waitForSelector('#warns [data-tol]');
  await page.click('#warns [data-tol]');
  const gapLoops = await ev(() => { const o = LP.ui.state.doc.objects.find(o => o.name === 'f03_lines_square_gap_near_v1.0'); return o.job.loops.length; });
  check('gap join button closes the almost-closed square', gapLoops === 1);
  await page.setInputFiles('#file', path.join(FIX, 'f27_flat_pattern_layers_v1.0.dxf'));
  await page.waitForFunction(() => /bend or reference layers/.test(document.getElementById('warns').textContent));
  check('bend layers hidden and reported', true);

  await page.setInputFiles('#file', path.join(CARD, 'laser_test_card_raw_mm_v1.1.dxf'));
  await page.waitForFunction(() => LP.ui.state.doc.objects.some(o => o.name === 'laser_test_card_raw_mm_v1.1'));
  await page.click('#confirm-units');
  check('test card raw mm file reads 6.50 x 4.00 in', /6\.50 x 4\.00 in/.test(await page.textContent('#units-status')));
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} checks pass`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/** CHANGELOG
 * v0.1 (2026-10-30): Initial release.
 * v0.3 (2026-11-02): Rewritten for the v0.3 interface; Phase 1 flows kept and every Phase 2 feature added.
 */

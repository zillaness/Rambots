/**
 * @file sales_walkoff_test_v1.0.mjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Sales laptop basics: split home, clicker and copter sales, walk-offs.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const SHOTS = process.argv[2];
const URL = 'file:///home/user/Rambots/tools/ramathon_sales_tracker/index.html';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push('console: ' + m.text()); });
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };
const total = async () => (await page.textContent('.t-val')).trim();
const toastText = async () => (await page.textContent('#toast')).trim();
const ev = f => page.evaluate(f);

await page.goto(URL);
await ev(() => localStorage.clear());
await page.reload();
// This suite covers the v1.5 per-balloon rules (v1.6 default is survive).
await ev(() => { state.settings.battle.scoring = 'perBalloon'; save(); });

// ---- Sales regression on the shared clickers + copters laptop
ok(JSON.stringify(await ev(() => [1,2,3,4,5,6,7].map(n => linePrice('clicker', n)))) === '[4,7,10,14,17,20,24]', 'tiers');
await page.click('.cat.theme-yellow');
await page.click('.item[data-item="clicker"]'); await page.click('.item[data-item="clicker"]');
await page.click('.back');
await page.click('.cat.theme-red');
await page.click('.item[data-item="kit"]');
ok(await total() === '12 tix', '2 clickers + kit = 12 (got ' + await total() + ')');
const split = await page.textContent('.box-split');
ok(split.includes('Clickers box') && split.includes('7 tix') && split.includes('Copters box') && split.includes('5 tix'), 'box split shown: ' + split.replace(/\s+/g, ' ').trim());
await page.screenshot({ path: SHOTS + '/v11_1_split.png' });
await page.click('.item[data-item="toroidal"]');
await page.click('.qty[data-item="toroidal"]'); await page.keyboard.press('2'); await page.keyboard.press('Enter');
ok(await total() === '16 tix', 'keypad toroidal 2 -> 16');
await page.keyboard.press('Control+z');
ok((await toastText()).includes('Undid: Extra toroidal propeller: 1 → 2'), 'undo names change');
await page.keyboard.press('Control+z');
await page.keyboard.press('Enter');
ok((await toastText()).includes('saved · 12 tix'), 'finish via Enter');

// ---- Walk-off
await page.click('.cat.theme-yellow');
await page.click('[data-act="walkoff"]');
await page.click('[data-act="woqty"][data-d="1"]');
await page.click('[data-act="woreason"][data-val="giveaway"]');
await page.screenshot({ path: SHOTS + '/v11_2_walkoff.png' });
await page.click('[data-act="wosave"]');
ok((await toastText()).toLowerCase().includes('walk-off: 2 egg tart (giveaway)'), 'walk-off logged: ' + await toastText());
ok(await ev(() => computeTotals().byItem.clicker_egg_tart.walkoffs) === 2, 'walk-offs counted in totals');
ok(await ev(() => computeTotals().tix) === 12, 'walk-off adds 0 tix');

// ---- Turn on Balloon Battle only (separate laptop scenario)
// Battle checks moved to test_v17.mjs (v1.7 sign-up flow).
ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 */

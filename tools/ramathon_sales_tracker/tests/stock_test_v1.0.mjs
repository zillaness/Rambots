/**
 * @file stock_test_v1.0.mjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Starting stock and stock left for clicker designs and copter parts.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const SHOTS = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ev = f => page.evaluate(f);
const pill = async id => ((await page.$(`.item[data-item="${id}"] .stock`)) ? (await page.textContent(`.item[data-item="${id}"] .stock`)).trim() : '');
const toastText = async () => (await page.textContent('#toast')).trim();
const setStock = async (key, v) => { await page.fill('#stock-' + key, String(v)); await page.dispatchEvent('#stock-' + key, 'change'); };

await page.goto('http://localhost:8766/ramathon-sales-tracker/?booth=sales');
await page.click('[data-modal="settings"]');
for (const [k, v] of [['clicker_oreo', 3], ['part_launcher', 5], ['part_propeller', 2], ['part_ripcord', 10], ['part_toroidal', 1]]) await setStock(k, v);
await page.screenshot({ path: SHOTS + '/vstock_1_settings.png' });
await page.keyboard.press('Escape');

await page.click('.cat.theme-red');
ok(await pill('kit') === '2 left' && await pill('launcher') === '5 left' && await pill('kit_toroidal') === '1 left', `kit limited by propellers (2), launcher 5, toroidal kit 1: ${await pill('kit')} / ${await pill('launcher')} / ${await pill('kit_toroidal')}`);
await page.click('.item[data-item="kit"]');
ok(await pill('kit') === '1 left' && await pill('propeller') === '1 left' && await pill('launcher') === '4 left', 'selling a kit uses a launcher and a propeller (open sale counts)');
await page.click('.item[data-item="kit"]'); await page.click('.item[data-item="kit"]');
ok((await toastText()).includes('Count says no Propellers left') && (await toastText()).includes('Backorder'), 'out-of-stock warning names the part: ' + await toastText());
ok(await pill('kit') === 'None left' && await ev(() => keyLeft('part_propeller')) === -1, 'kit shows None left');
await page.screenshot({ path: SHOTS + '/vstock_2_copters.png' });
await page.keyboard.press('Control+z');
await page.keyboard.press('Enter');

// Walk-off of a launcher comes off the count
await page.click('.cat.theme-red');
await page.click('[data-act="walkoff"]');
await page.click('[data-act="woitem"][data-item="launcher"]');
await page.click('[data-act="wosave"]');
ok(await ev(() => keyLeft('part_launcher')) === 2, 'walk-off launcher: 5 - 2 kits - 1 walk-off = 2');

// Clicker design stock
await page.click('.back'); await page.click('.cat.theme-yellow');
ok(await pill('clicker_oreo') === '3 left' && await pill('clicker_avocado') === '', 'oreo 3 left, untracked designs show nothing');
for (let i = 0; i < 3; i++) await page.click('.photo-item[data-item="clicker_oreo"]');
ok(await pill('clicker_oreo') === 'None left', 'oreo none left after 3');
await page.click('.photo-item[data-item="clicker_oreo"]');
ok((await toastText()).includes('Count says no Oreo left'), 'oreo warning');
await page.keyboard.press('Control+z');
await page.keyboard.press('Enter');

// Void restores, totals show Left + parts table
await page.click('[data-modal="history"]');
await page.locator('[data-act="void"]').first().click(); // latest = oreo sale
ok(await ev(() => keyLeft('clicker_oreo')) === 3, 'voiding the oreo sale gives the 3 back');
await page.keyboard.press('Escape');
await page.click('[data-modal="totals"]');
const txt = (await page.textContent('.dialog')).replace(/\s+/g, ' ');
ok(txt.includes('Copter parts left') && txt.includes('Propellers') && txt.includes('Stock left'), 'totals: parts table + stock stats');
await page.screenshot({ path: SHOTS + '/vstock_3_totals.png', fullPage: true });
ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 */

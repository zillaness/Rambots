/**
 * @file tie_migration_test_v1.1.mjs
 * @version 1.1
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Laptops that never chose a tie rule pick up the current default.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
await page.goto('http://localhost:8766/ramathon-sales-tracker/?booth=battle');
// Simulate a laptop that opened v1.5 earlier: saved pvpTie 'none' without having chosen it
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); s.settings.battle.pvpTie = 'none'; delete s.settings.battle.pvpTieSet; localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); });
await page.reload();
ok(await page.evaluate(() => state.settings.battle.pvpTie) === 'both', 'unchosen old default migrates to each-paid');
// v1.8.5: a laptop saved with knocked-out 0 (old default) switches to the 1 pity card
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); s.settings.battle.consolation = 0; s.settings.battle.scoring = 'survive'; delete s.settings.battle.consolationSet; localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); });
await page.reload();
ok(await page.evaluate(() => state.settings.battle.consolation) === 1, 'unchosen knocked-out 0 migrates to the 1 pity card');
// ...but a laptop where someone chose 0 keeps it
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); s.settings.battle.consolation = 0; s.settings.battle.consolationSet = true; localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); });
await page.reload();
ok(await page.evaluate(() => state.settings.battle.consolation) === 0, 'a chosen 0 stays 0');
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 * v1.1 (2026-10-16): Also covers the knocked-out 0 to 1 migration (tracker v1.8.5).
 */

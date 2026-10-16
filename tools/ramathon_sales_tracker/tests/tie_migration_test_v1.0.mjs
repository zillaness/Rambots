/**
 * @file tie_migration_test_v1.0.mjs
 * @version 1.0
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
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 */

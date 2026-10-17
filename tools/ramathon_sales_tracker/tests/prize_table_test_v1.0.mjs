/**
 * @file prize_table_test_v1.0.mjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Prize Table: card trades, stock pills, most-popular prizes, separate storage per booth link.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const SHOTS = process.argv[2];
const BASE = 'http://localhost:8766/ramathon-sales-tracker/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ev = f => page.evaluate(f);
const total = async () => (await page.textContent('.t-val')).trim();
const toastText = async () => (await page.textContent('#toast')).trim();

await page.goto(BASE + '?booth=prizes');
ok(await ev(() => STORAGE_KEY) === 'rambots_ramathon_sales_v1_prizes', 'prizes link has its own storage key');
ok(await page.isVisible('.prize-item[data-item="prize_grand"]') && !(await page.isVisible('.back')), 'prizes link opens straight to prize buttons');
ok((await page.textContent('.prize-item[data-item="prize_grand"] .i-cards')).trim() === '9 cards', 'grand shows 9 cards');
ok(await ev(() => CATEGORIES.every(c => c.id !== 'plinko')), 'plinko removed');

// Starting stock: grand 3, small 10
await page.click('[data-modal="settings"]');
await page.fill('#pz-stock-prize_grand', '3'); await page.keyboard.press('Enter');
await page.fill('#pz-stock-prize_small', '10'); await page.keyboard.press('Enter');
await page.screenshot({ path: SHOTS + '/v13_1_settings.png' });
await page.keyboard.press('Escape');
ok((await page.textContent('.prize-item[data-item="prize_grand"] .stock')).trim() === '3 left', 'grand shows 3 left');

// Trade 1: grand + small = 10 cards, tagged Kid
await page.click('.prize-item[data-item="prize_grand"]');
await page.click('.prize-item[data-item="prize_small"]');
ok(await total() === '10 cards', 'trade collects 10 cards (got ' + await total() + ')');
ok((await page.textContent('.p-title')).trim() === 'Trade #1', 'panel says Trade #1');
ok((await page.textContent('.prize-item[data-item="prize_grand"] .stock')).trim() === '2 left' && await page.isVisible('.prize-item[data-item="prize_grand"] .stock.low'), 'grand 2 left and marked low');
await page.click('.chip[data-val="kid"]');
await page.screenshot({ path: SHOTS + '/v13_2_trade.png' });
await page.keyboard.press('Enter');
ok((await toastText()).includes('Trade #1 saved · 10 cards'), 'finish trade: ' + await toastText());

// Card price change applies to new trades only
await page.click('[data-modal="settings"]');
await page.fill('#pz-cards-prize_grand', '10'); await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.click('.prize-item[data-item="prize_grand"]');
await page.click('.prize-item[data-item="prize_grand"]');
ok(await total() === '20 cards', 'new grand price 10 x2 = 20');
ok(await ev(() => computeTotals().prizes.cards) === 10, 'old trade keeps its 10 cards');
// Third grand -> stock goes negative -> warning
await page.click('.prize-item[data-item="prize_grand"]');
ok((await toastText()).includes('Count says no Grand prize left'), 'out-of-stock warning: ' + await toastText());
ok((await page.textContent('.prize-item[data-item="prize_grand"] .stock')).trim() === 'None left', 'pill says None left');
await page.keyboard.press('Control+z');
ok(await total() === '20 cards', 'undo third grand');
await page.click('.qty[data-item="prize_grand"]');
await page.keyboard.press('1');
ok((await page.textContent('.kp-price')).includes('= 10 cards'), 'keypad preview in cards');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');

// Totals: most popular first
await page.click('[data-modal="totals"]');
await page.screenshot({ path: SHOTS + '/v13_3_totals.png' });
const firstRow = await page.$eval('h3 + .big-stats + table tbody tr td', td => td.textContent);
ok(firstRow === 'Grand prize', 'most popular prize first: ' + firstRow);
const pz = await ev(() => computeTotals().prizes);
ok(pz.trades === 2 && pz.given === 3 && pz.cards === 20, 'prize totals ' + JSON.stringify(pz));
ok(await ev(() => computeTotals().tix) === 0, 'cards never count as tickets');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
const csv = fs.readFileSync(await dl.path(), 'utf8').trim().split(/\r\n/);
const head = csv[0].replace(/^﻿/, '').split(',');
const rows = csv.slice(1).map(r => r.split(','));
ok(head[18] === 'cards_redeemed' && head.includes('record_id') && rows.every(r => r.length === head.length), 'CSV has cards_redeemed, record_id and even columns');
ok(rows.every(r => r[1].startsWith('T') && r[8] === '0') && rows.reduce((s, r) => s + Number(r[18]), 0) === 20, 'trade rows: T#, 0 tix, 20 cards');
console.log(csv.join('\n'));
await page.keyboard.press('Escape');

// Void trade restores stock
await page.click('[data-modal="history"]');
await page.click('[data-act="void"]');
ok(await ev(() => stockLeft('prize_grand')) === 2, 'void latest trade gives 1 grand back');
await page.keyboard.press('Control+z');
await page.keyboard.press('Escape');

// Separate storage: a sales tab on the same laptop is untouched, no warning banner
const sales = await ctx.newPage();
await sales.goto(BASE + '?booth=sales');
ok(await sales.evaluate(() => state.customers.length) === 0, 'sales link sees none of the prize data');
await sales.click('.cat.theme-red'); await sales.click('.item[data-item="kit"]'); await sales.keyboard.press('Enter');
await page.waitForTimeout(300);
ok(!(await page.isVisible('.banner')) && await ev(() => state.customers.length) === 2, 'prize tab unaffected by sales tab');

// Same booth in two tabs: banner + undo cleared, other tab's sale survives
const sales2 = await ctx.newPage();
await sales2.goto(BASE + '?booth=sales');
await sales.click('.cat.theme-yellow'); await sales.click('.photo-item[data-item="clicker_oreo"]');
await sales2.waitForTimeout(300);
await sales2.click('.cat.theme-red'); await sales2.click('.item[data-item="ripcord"]');
await sales.waitForTimeout(300);
ok(await sales.isVisible('.banner'), 'same-booth second tab shows warning banner');
await sales.keyboard.press('Control+z');
await sales.waitForTimeout(300);
const kinds = await sales2.evaluate(() => state.customers.map(c => c.lines.map(l => l.item).join('+')));
ok(kinds.some(k => k.includes('ripcord')), 'undo in tab A did not erase tab B ripcord: ' + JSON.stringify(kinds));

ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 */

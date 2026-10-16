/**
 * @file cash_bonus_test_v1.0.mjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Tracker v1.8: cash sale button and the free-Pokemon-card-with-purchase reminder (panel, toast, Totals, History, stats, CSV, Combine, Settings, migration).
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const SHOTS = process.argv[2];
const DL = path.join(SHOTS, 'dl_cash_bonus');
fs.mkdirSync(DL, { recursive: true });
const URL = 'file:///home/user/Rambots/tools/ramathon_sales_tracker/index.html?booth=sales';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push('console: ' + m.text()); });
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };
const ev = (f, a) => page.evaluate(f, a);
const text = async sel => ((await page.$(sel)) ? (await page.textContent(sel)).replace(/\s+/g, ' ').trim() : '');
const toastText = () => text('#toast');
const add = async (id, n = 1) => { for (let i = 0; i < n; i++) await page.click(`.item[data-item="${id}"]`); };
const openCat = async theme => { if (await page.$('.back')) await page.click('.back'); await page.click(`.cat.theme-${theme}`); };
async function download(sel) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  const file = path.join(DL, d.suggestedFilename()); await d.saveAs(file); return file;
}
const csvRows = file => ev(t => parseCSV(t), fs.readFileSync(file, 'utf8'));

// ---- Migration: a v1.7 laptop (no cardEvery saved) picks up 1 card per 10 tix
await page.goto(URL);
await ev(() => localStorage.clear());
await ev(() => {
  const old = defaultState();
  delete old.settings.cardEvery;
  old.customers.push({ id: 'old1', kind: 'sale', no: 1, station: 'Sales table', openedAt: new Date().toISOString(),
    closedAt: new Date().toISOString(), lines: [{ item: 'kit', qty: 4 }], age: null, gender: null, voided: false });
  old.nextNo = 2;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(old));
});
await page.reload();
ok(await ev(() => state.settings.cardEvery) === 10, 'v1.7 data loads with 1 card per 10 tix');
ok(await ev(() => computeTotals().bonusCards) === 0, 'sales finished before v1.8 count 0 free cards (20 tix sale stays 0)');
ok(await ev(() => computeTotals().tix) === 20 && await ev(() => computeTotals().cashTix) === 0, 'old sale counts as tickets, no cash');
await ev(() => { clearAll(); });

// ---- Card reminder while ringing up
await openCat('yellow');
ok(await ev(() => document.querySelector('.cashbtn').disabled), 'cash button disabled with an empty sale');
await add('clicker_oreo', 2);
ok(await text('.t-val') === '7 tix', '2 clickers = 7 tix');
const nudge = await text('.g-nudge');
ok(nudge.includes('1 more is only +3 tix') && nudge.includes('+ a free Pokémon card'), 'clicker nudge mentions the free card: ' + nudge);
ok(!(await page.$('#bonus-ask')) && !(await page.$('#bonus')), 'no second Ask and no card box at 7 tix');
await add('clicker_oreo');
ok(await text('.t-val') === '10 tix', '3 clickers = 10 tix');
const box = await text('#bonus');
ok(box.includes('Give 1 free Pokémon card') && box.includes('Say: win more at Plinko or Balloon Battle'), 'card box at 10 tix: ' + box);
ok(!box.includes('free prize'), 'one card is not called a free prize');
await page.screenshot({ path: SHOTS + '/v18_1_card_box.png' });
await openCat('red');
await add('propeller');
ok(!(await text('#bonus')).includes('Ask'), 'no Ask at 11 tix (9 short)');
await page.keyboard.press('Enter');
ok((await toastText()).includes('saved · 11 tix · give 1 free Pokémon card'), 'Done toast repeats the card: ' + await toastText());
ok(await ev(() => document.getElementById('toast').classList.contains('bonus')), 'card toast uses the yellow style');
ok(await ev(() => state.customers.find(c => c.no === 1 && c.kind === 'sale' && c.closedAt).bonusCards) === 1, 'finished sale stores 1 card');

// Ask when a few tix short, then 30 tix = 3 cards = a free prize
await openCat('red');
await add('kit'); await add('launcher');
ok(await text('#bonus-ask') === 'Ask: 2 more tix gets a free Pokémon card', '8 tix asks for 2 more: ' + await text('#bonus-ask'));
await add('kit', 3);
await openCat('yellow');
await add('clicker_creeper', 2);
ok(await text('.t-val') === '30 tix', 'launcher + 4 kits + 2 clickers... = ' + await text('.t-val'));
const big = await text('#bonus');
ok(big.includes('Give 3 free Pokémon cards') && big.includes("Say: that's a free prize at the Prize Table"), '30 tix = 3 cards = a free prize: ' + big);
await page.screenshot({ path: SHOTS + '/v18_2_three_cards.png' });
await page.keyboard.press('Enter');
ok((await toastText()).includes('give 3 free Pokémon cards'), '3-card toast');

// ---- Cash sale
await openCat('red');
await add('kit');
ok(await ev(() => !document.querySelector('.cashbtn').disabled), 'cash button enabled once the sale has an item');
await page.click('.cashbtn');
ok(await ev(() => document.querySelector('.cashbtn').getAttribute('aria-pressed')) === 'true', 'cash button shows pressed');
ok(await text('.t-label') === 'Collect cash' && await text('.t-val') === '$5', 'panel says Collect cash $5: ' + await text('.total'));
await page.keyboard.press('Control+z');
ok((await toastText()).includes('marked cash') && await text('.t-val') === '5 tix', 'Undo puts it back to tickets');
await page.click('.cashbtn');
await openCat('yellow');
await add('clicker_avocado', 2);
ok(await text('.t-val') === '$12' && !(await page.$('.box-split')), 'cash sale across booths: $12, no ticket-box split');
ok((await text('#bonus')).includes('Give 1 free Pokémon card'), 'cash sales still earn the free card');
await page.screenshot({ path: SHOTS + '/v18_3_cash.png' });
await page.keyboard.press('Enter');
ok((await toastText()).includes('saved · $12 cash · give 1 free Pokémon card'), 'cash Done toast: ' + await toastText());

const t = await ev(() => { const x = computeTotals(); return { tix: x.tix, cash: x.cashTix, n: x.cashSales, cards: x.bonusCards, goal: x.byGoal, box: x.byBox }; });
ok(t.tix === 41 && t.cash === 12 && t.n === 1, `ticket boxes 41 (11 + 30), cash 12 in 1 sale: ${JSON.stringify(t)}`);
ok(t.goal.copters === t.box.copters + 5 && t.goal.clickers === t.box.clickers + 7, 'goal counts cash per booth: ' + JSON.stringify(t.goal));
ok(t.cards === 5, '1 + 3 + 1 free cards = 5');
ok(await ev(() => pace().actual) === 53, 'pace counts tickets and cash (41 + 12)');

await page.click('[data-modal="totals"]');
const tot = await text('.dialog');
ok(tot.includes('Cash sales (1)') && tot.includes('$12'), 'Totals shows cash sales');
ok(tot.includes('Free Pokémon cards handed out with purchases: 5'), 'Totals shows free cards');
ok(tot.includes('Of which cash sales') && tot.includes('Free Pokémon cards with purchase'), 'stats rows present');
await page.screenshot({ path: SHOTS + '/v18_4_totals.png', fullPage: true });

// CSV
const file = await download('.dialog [data-act="export"]');
const rows = await csvRows(file);
const h = rows[0];
ok(h.slice(-2).join(',') === 'paid_with,bonus_cards', 'CSV ends with paid_with, bonus_cards');
ok(rows.every(r => r.length === h.length), 'every CSV row has every column');
const col = name => h.indexOf(name);
const s3 = rows.filter(r => r[col('record')] === 'S3');
ok(s3.length === 2 && s3.every(r => r[col('paid_with')] === 'cash'), 'cash sale rows say cash');
ok(s3.map(r => r[col('bonus_cards')]).join('|') === '1|', 'bonus_cards on the first row of a sale only');
ok(rows.filter(r => r[col('record')] === 'S2').every(r => r[col('paid_with')] === 'tickets'), 'ticket sale rows say tickets');
await page.keyboard.press('Escape');

// History
await page.click('[data-modal="history"]');
const hist = await text('.hist');
ok(hist.includes('· cash') && hist.includes('$12 cash') && hist.includes('3 free cards'), 'History tags cash and cards: ' + hist.slice(0, 160));
// Void the cash sale: out of cash, goal and cards
await page.click('.h-row:first-child [data-act="void"]');
const tv = await ev(() => { const x = computeTotals(); return [x.cashTix, x.cashSales, x.bonusCards, pace().actual]; });
ok(JSON.stringify(tv) === '[0,0,4,41]', 'voided cash sale leaves cash, cards and pace: ' + JSON.stringify(tv));
await page.keyboard.press('Control+z');
await page.keyboard.press('Escape');

// ---- Combine: an old v1.7 export plus this laptop's v1.8 export
const oldCsv = path.join(DL, 'ramathon_sales_old_v17.csv');
fs.writeFileSync(oldCsv, [
  'station,record,status,opened_at,closed_at,category,item,qty,item_tickets,record_total_tickets,age,gender,battle_mode,player,balloons_popped,won,cards_paid,walkoff_reason,cards_redeemed,record_id,laptop_id,exported_at,battle_outcome',
  'Laptop 2,S1,sold,2026-10-17 10:40:00,2026-10-17 10:41:00,Copters,Full kit,2,10,10,,,,,,,,,,oldrec1,zz99,2026-10-17 11:00:00,',
].join('\r\n'));
await page.click('[data-modal="totals"]');
await page.click('.dialog [data-modal="combine"]');
await page.setInputFiles('#combine-files', [oldCsv, file]);
await page.waitForFunction(() => view.combine.files.length === 2);
const cr = await ev(() => { const r = combineResult(); return { cash: r.cashTix, cards: r.bonusCards, copters: r.byCat.copters, clickers: r.byCat.clickers }; });
ok(cr.cash === 12 && cr.cards === 5, 'Combine counts cash and free cards: ' + JSON.stringify(cr));
ok(cr.copters === 10 + 1 + 4 * 5 + 3 + 5 && cr.clickers === 10 + 7 + 7, 'Combine adds old and new sales, cash included: ' + JSON.stringify(cr));
const comb = await text('.dialog');
ok(comb.includes('Cash sales: $12') && comb.includes('Sales gave 5 free with purchases') && comb.includes('(tickets only)'), 'Combine notes cash and cards');
const merged = await download('[data-act="combinedownload"]');
const mh = (await csvRows(merged))[0];
ok(mh.includes('paid_with') && mh.includes('bonus_cards'), 'combined CSV keeps the new columns when an old file is first');
await page.screenshot({ path: SHOTS + '/v18_5_combine.png', fullPage: true });
await page.keyboard.press('Escape');

// ---- Settings: card rule changes apply to new sales only
await page.click('[data-modal="settings"]');
await page.fill('#bonus-every', '5');
await page.dispatchEvent('#bonus-every', 'change');
ok(await ev(() => state.settings.cardEvery) === 5 && (await toastText()).includes('1 free card per 5 tix'), 'Settings: 1 card per 5 tix');
await page.keyboard.press('Escape');
ok(await ev(() => computeTotals().bonusCards) === 5, 'finished sales keep their card count after the rule changes');
await openCat('red');
await add('kit');
ok((await text('#bonus')).includes('Give 1 free Pokémon card'), '5 tix earns a card at 1 per 5');
await page.click('[data-modal="settings"]');
await page.fill('#bonus-every', '0');
await page.dispatchEvent('#bonus-every', 'change');
await page.keyboard.press('Escape');
ok(!(await page.$('#bonus')) && !(await page.$('#bonus-ask')) && !(await text('.g-nudge')).includes('free'), '0 turns the reminder off');
await page.keyboard.press('Enter');
ok(!(await toastText()).includes('free'), 'no card in the toast when off');

// ---- Prize Table panel has no cash button
const prz = await ctx.newPage();
await prz.goto(URL.replace('booth=sales', 'booth=prizes'));
await prz.click('.prize-item[data-item="prize_small"]');
ok(!(await prz.$('.cashbtn')) && !(await prz.$('#bonus')), 'Prize Table panel: no cash button, no card box');
await prz.close();

// ---- Phone width: panel with cash + card box fits
await page.setViewportSize({ width: 390, height: 844 });
await ev(() => { state.settings.cardEvery = 10; save(); render(); });
await openCat('yellow');
await add('clicker_oreo', 3);
await page.click('.cashbtn');
const overflow = await ev(() => document.documentElement.scrollWidth - window.innerWidth);
ok(overflow <= 0, 'no sideways scroll at 390 px (' + overflow + ')');
await page.screenshot({ path: SHOTS + '/v18_6_phone.png', fullPage: true });

ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial suite for tracker v1.8 (cash sale button, free card with purchase).
 */

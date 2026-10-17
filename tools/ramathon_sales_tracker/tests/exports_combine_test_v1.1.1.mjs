/**
 * @file exports_combine_test_v1.1.1.mjs
 * @version 1.1.1
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Sales stats, export names, record ids, backorders CSV, and Combine across three laptops without double counting.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const SHOTS = process.argv[2];
const DL = SHOTS + '/dl'; fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
const BASE = 'http://localhost:8766/ramathon-sales-tracker/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ev = (pg, f) => pg.evaluate(f);
const total = async pg => (await pg.textContent('.t-val')).trim();
const toastText = async pg => (await pg.textContent('#toast')).trim();
async function download(pg, sel) {
  const [d] = await Promise.all([pg.waitForEvent('download'), pg.click(sel)]);
  const file = path.join(DL, d.suggestedFilename()); await d.saveAs(file); return file;
}
const csvRows = f => fs.readFileSync(f, 'utf8').replace(/^﻿/, '').trim().split(/\r\n/).map(l => l.split(','));
const pad = n => String(n).padStart(2, '0');
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---------- Sales laptop
await page.goto(BASE + '?booth=sales');
// Event window: started 60 min ago, ends in 90 min (150 min total)
const nowD = new Date();
await page.click('[data-modal="settings"]');
await page.fill('#ev-date', ymd(nowD)); await page.dispatchEvent('#ev-date', 'change');
await page.fill('#ev-start', hm(new Date(nowD - 60 * 60000))); await page.dispatchEvent('#ev-start', 'change');
await page.fill('#ev-end', hm(new Date(+nowD + 90 * 60000))); await page.dispatchEvent('#ev-end', 'change');
ok(await page.inputValue('#goal-clickers') === '500' && await page.inputValue('#goal-copters') === '500' && await page.inputValue('#goal-battle') === '200', 'default goals 500 / 500 / 200');
await page.screenshot({ path: SHOTS + '/v14_1_settings.png' });
await page.keyboard.press('Escape');

// Copters: photos, ask box, upgrade, extra prop
await page.click('.cat.theme-red');
await page.waitForTimeout(1500);
const cop = await page.$$eval('.photo-item.cat-copters', els => els.map(b => ({ id: b.dataset.item, w: (b.querySelector('img') || {}).naturalWidth || 0, letter: (b.querySelector('.ph-none') || {}).textContent || '' })));
ok(cop.filter(x => x.w > 0).length === 6, 'copter photos: all 6 load ' + JSON.stringify(cop.map(x => x.id + ':' + x.w)));
await page.click('.item[data-item="kit"]');
ok(await page.isVisible('.ask') && (await page.textContent('.ask')).includes('toroidal'), 'kit in cart shows toroidal + propeller ask');
await page.screenshot({ path: SHOTS + '/v14_2_copter_ask.png' });
await page.click('[data-act="upgrade"]');
ok(await total(page) === '6 tix' && await ev(page, () => current().lines.map(l => l.item + l.qty).join()) === 'kit_toroidal1', 'upgrade turns kit into toroidal kit (+1)');
ok((await toastText(page)) === '' || true, 'noop');
ok(!(await page.isVisible('[data-act="upgrade"]')) && await page.isVisible('.askbtn[data-item="propeller"]'), 'after upgrade only the propeller ask remains');
ok(await page.isVisible('.askbtn[data-item="toroidal"]'), 'ask also offers an extra toroidal propeller');
await page.click('.askbtn[data-item="propeller"]');
ok(await total(page) === '7 tix', 'extra propeller from ask (+1)');
await page.keyboard.press('Enter');

// Clickers: combo breakdown + nudge
await page.click('.cat.theme-yellow');
for (const d of ['egg_tart', 'oreo', 'creeper', 'avocado', 'oreo']) await page.click(`.photo-item[data-item="clicker_${d}"]`);
const g = (await page.textContent('.group-row')).replace(/\s+/g, ' ');
ok(g.includes('Clickers ×5') && g.includes('17 tix') && g.includes('3 for 10 + 2 for 7') && g.includes('3.40 each'), 'combo breakdown: ' + g);
ok(g.includes('1 more is only +3 tix (6 for 20)'), 'upsell nudge');
await page.screenshot({ path: SHOTS + '/v14_3_clicker_combo.png' });
await page.click('.photo-item[data-item="clicker_dumpling"]');
ok(!(await page.isVisible('.g-nudge')), 'no nudge at a full 3-pack (6)');
await page.keyboard.press('Enter');

// Pace chip: goal 1000 on this laptop, 60/150 of the way = target 400, actual 27
await page.evaluate(() => { lastPaceTick = 0; tick(); });
const chip = (await page.textContent('#pace-chip')).replace(/\s+/g, ' ');
ok(chip.includes('behind') && chip.includes('27 of 1000') && /target 4\d\d by now/.test(chip), 'pace chip: ' + chip);
await page.click('#pace-chip');
const paceTxt = (await page.textContent('.dialog')).replace(/\s+/g, ' ');
ok(paceTxt.includes('Clickers') && paceTxt.includes('Copters') && paceTxt.includes('tix per minute'), 'pace modal per booth + needed rate');
await page.screenshot({ path: SHOTS + '/v14_4_pace.png' });
await page.keyboard.press('Escape');

// Export #1 (early backup)
await page.click('[data-modal="totals"]');
const early = await download(page, '[data-act="export"]');
ok(/^ramathon_sales_sales_sales-table_[a-z0-9]{4}_\d{4}-\d{2}-\d{2}_\d{6}\.csv$/.test(path.basename(early)), 'export name: ' + path.basename(early));
const er = csvRows(early);
const ix = ['record_id', 'laptop_id', 'exported_at'].map(k => er[0].indexOf(k));
ok(ix.every(i => i > 0) && er.slice(1).every(r => r[ix[0]] && r[ix[1]] && r[ix[2]]), 'rows carry record_id, laptop_id, exported_at');
await page.keyboard.press('Escape');
await page.waitForTimeout(1100); // later export stamp

// More sales after the backup + void the first sale
await page.click('.cat.theme-red'); await page.click('.item[data-item="launcher"]'); await page.keyboard.press('Enter');
await page.click('[data-modal="history"]');
await page.locator('[data-act="void"]').last().click(); // oldest = copter sale #1 (7 tix)
await page.keyboard.press('Escape');

// Backorder (requires contact)
await page.click('.cat.theme-yellow');
await page.click('[data-act="backorder"][data-cat="clickers"]');
await page.click('[data-act="boitem"][data-item="clicker_burger"]');
await page.click('[data-act="boqty"][data-d="1"]');
await page.fill('#bo-name', 'Pat Lee');
await page.click('[data-act="bosave"]');
ok((await toastText(page)).includes('phone or email'), 'backorder needs contact');
await page.fill('#bo-contact', 'pat@example.com');
await page.fill('#bo-note', 'any color');
await page.screenshot({ path: SHOTS + '/v14_5_backorder.png' });
await page.click('[data-act="bosave"]');
ok((await toastText(page)).includes('Backorder #1 saved · 2 Burger'), 'backorder saved: ' + await toastText(page));
await page.click('.back');

// Totals: stats + three exports
await page.click('[data-modal="totals"]');
const st = (await page.textContent('table.stats')).replace(/\s+/g, ' ');
ok(st.includes('Avg tix per clicker') && st.includes('3 for 10 deals') && st.includes('Toroidal upgrade rate') && st.includes('Busiest 30 minutes') && st.includes('Requested: Burger'), 'stats table sections');
await page.screenshot({ path: SHOTS + '/v14_6_totals.png', fullPage: true });
const late = await download(page, '[data-act="export"]');
const stats = await download(page, '[data-act="exportstats"]');
const bo = await download(page, '[data-act="exportbackorders"]');
ok(path.basename(stats).startsWith('ramathon_stats_') && csvRows(stats).some(r => r[4] === 'Avg tix per clicker'), 'stats CSV: ' + path.basename(stats));
ok(fs.readFileSync(bo, 'utf8').includes('pat@example.com') && !fs.readFileSync(late, 'utf8').includes('pat@example.com'), 'contact only in backorders CSV');
await page.keyboard.press('Escape');

// ---------- Battle laptop + Prize laptop exports
const bat = await ctx.newPage();
await bat.goto(BASE + '?booth=battle');
await bat.fill('#q-name-0', 'Ava'); await bat.click('[data-act="qadd"]'); await bat.click('[data-act="qaddgo"]');
await bat.click('.queue-card .huge[data-act="qstart"]');
await bat.click('[data-act="endmatch"]'); await bat.click('[data-act="scorehouse"][data-n="2"]:not([data-ko])');
await bat.click('[data-modal="totals"]');
const batFile = await download(bat, '[data-act="export"]');
const prz = await ctx.newPage();
await prz.goto(BASE + '?booth=prizes');
await prz.click('.prize-item[data-item="prize_medium"]'); await prz.keyboard.press('Enter');
await prz.click('[data-modal="totals"]');
const przFile = await download(prz, '[data-act="export"]');
ok(path.basename(batFile).includes('_battle_') && path.basename(przFile).includes('_prizes_'), 'file names carry the booth');

// ---------- Combine on the sales laptop: early + late + battle + prizes (+ stats file, skipped)
await page.click('[data-modal="settings"]');
await page.click('[data-act="open"][data-modal="combine"]');
await page.setInputFiles('#combine-files', [early, late, batFile, przFile, stats]);
await page.waitForSelector('#combine-plinko');
await page.fill('#combine-plinko', '80'); await page.dispatchEvent('#combine-plinko', 'change');
const cmb = (await page.textContent('.dialog')).replace(/\s+/g, ' ');
console.log(cmb.slice(0, 900));
// Sales: clickers 17 + 20? -> clicker sale = 6 clickers = 20 tix; copter sale #1 (7) voided; launcher 3. Battle 5. Plinko 80.
const r = await page.evaluate(() => combineResult());
ok(r.byCat.clickers === 20 && r.byCat.copters === 3 && r.byCat.battle === 5, 'combined per booth (void respected, no double count): ' + JSON.stringify(r.byCat));
ok(r.laptops === 3 && r.dropped > 0, `3 laptops, ${r.dropped} duplicate rows ignored`);
ok(cmb.includes('108') && cmb.includes('goal 1300'), 'event total 20+3+5+80 = 108 vs goal 1300');
ok(r.prizes['Other medium prize'] === 1 && r.cardsPaid === 6 && r.cardsRedeemed === 3, 'cards paid 6 / redeemed 3 (Medium prize), prize counted');
ok(cmb.includes('not a sales CSV'), 'stats file skipped with a note');
await page.screenshot({ path: SHOTS + '/v14_7_combine.png', fullPage: true });
const merged = await download(page, '[data-act="combinedownload"]');
const mr = csvRows(merged);
const ids = mr.slice(1).map(x => x[mr[0].indexOf('record_id')] + '|' + x[mr[0].indexOf('item')] + '|' + x[mr[0].indexOf('player')]);
ok(new Set(ids).size === ids.length && path.basename(merged).startsWith('ramathon_combined_3-laptops_'), 'merged CSV has no duplicate rows: ' + path.basename(merged));

ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 * v1.1 (2026-10-16): Shorter clicker Ask wording; Medium prize is 3 cards (v1.8.1).
 * v1.1.1 (2026-10-16): Medium placeholder renamed Other medium prize (v1.8.3).
 */

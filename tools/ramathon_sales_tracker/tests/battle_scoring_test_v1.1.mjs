/**
 * @file battle_scoring_test_v1.1.mjs
 * @version 1.1
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Balloon Battle scoring modes: survive default, knocked-out row, presets, rules card, CSV outcome column.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const SHOTS = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ev = f => page.evaluate(f);
// v1.7 flow: sign up (1 name = vs House, 2 = vs Player); no weapons, so skip the weapon pop-up.
const queue = async (...names) => {
  await page.click(`[data-act="qmode"][data-val="${names.length === 2 ? 'pvp' : 'house'}"]`);
  for (let i = 0; i < names.length; i++) await page.fill(`#q-name-${i}`, names[i]);
  await page.click('[data-act="qadd"]');
  await page.click('[data-act="qaddgo"]');
};
const pvp = async (a, b) => { await page.click(`[data-act="pvppop"][data-p="0"][data-n="${a}"]`); await page.click(`[data-act="pvppop"][data-p="1"][data-n="${b}"]`); };
const cards = () => ev(() => lastMatch().players.map(p => p.cards).join());
const kos = () => ev(() => lastMatch().players.map(p => p.knockedOut).join());

await page.goto('http://localhost:8766/ramathon-sales-tracker/?booth=battle');
await ev(() => localStorage.clear()); await page.reload();
ok(await ev(() => state.settings.battle.scoring) === 'survive', 'default scoring: per balloon, must survive');
// This suite chains instant rematches; v1.7 allows one in a row by default.
await ev(() => { state.settings.battle.rematchOnce = false; save(); });

// Settings: survive mode pressed, preset listed, worst case 12 cards / 10 tix
await page.click('[data-modal="settings"]');
ok(await page.isVisible('[data-act="scoringmode"][data-val="survive"][aria-pressed="true"]'), 'survive mode selected');
const s3 = (await page.textContent('[data-act="scoringpreset"][data-id="s3"]')).replace(/\s+/g, ' ');
ok(s3.includes('12 cards / 10 tix (1.2 per tix)'), 'survive preset worst case: ' + s3);
const note = (await page.textContent('.dialog')).replace(/\s+/g, ' ');
ok(note.includes('vs Player 12 cards for 10 tix (1.20 per ticket)') && note.includes('vs House 9 cards for 5 tix'), 'current worst-case note');
ok(!(await page.isVisible('[data-act="pvptie"]')), 'tie rule hidden in survive mode');
await page.locator('.dialog').screenshot({ path: SHOTS + '/v16_1_settings.png' });
await page.keyboard.press('Escape');

// Clock waits for GO
await queue('Ava', 'Ben');
await page.click('.queue-card .huge[data-act="qstart"]');
await page.waitForTimeout(1300);
let t = (await page.textContent('#match-timer')).trim();
ok(t === 'Ready · 2:00' && await page.isVisible('#match-timer.ready'), 'clock waits: ' + t);
ok(await page.isVisible('[data-act="gomatch"]') && await page.isVisible('[data-act="endmatch"]'), 'GO button + enter-result link');
await page.screenshot({ path: SHOTS + '/v16_2_ready.png' });
await page.click('[data-act="gomatch"]');
await page.waitForTimeout(1300);
t = (await page.textContent('#match-timer')).trim();
ok(/^1:5\d$/.test(t), 'countdown after GO: ' + t);
ok(!(await page.isVisible('[data-act="gomatch"]')) && await page.isVisible('button.huge[data-act="endmatch"]'), 'Match over button after GO');
await page.keyboard.press('Control+z');
ok(await ev(() => playingMatch().goAt) === null && (await page.textContent('#toast')).includes('Started the clock for match #1'), 'undo GO says what it undid');
await page.click('[data-act="gomatch"]');
ok(await ev(() => !!playingMatch().goAt), 'GO again');
// survives reload mid-match
await page.reload();
await page.waitForTimeout(1100);
ok(/^1:5\d$/.test((await page.textContent('#match-timer')).trim()), 'clock keeps running after reload');

// PvP survive: 2-2 on time pays 6 / 6
await page.click('[data-act="endmatch"]');
await pvp(2, 2);
let prev = (await page.textContent('.pvp-preview')).trim();
ok(prev.includes('Ava: 2 bundles (6 cards)') && prev.includes('Ben: 2 bundles (6 cards)'), 'preview 2-2: ' + prev);
ok((await page.textContent('.note')).includes('if you still have a balloon at the end'), 'rule line under PvP scoring');
await page.click('[data-act="pvpsave"]');
ok(await cards() === '6,6' && await kos() === 'false,false', '2-2 time-out: 6 / 6, both survived');

// 3-1: the knockout winner gets 9, the knocked-out player gets the 1 pity card even though they popped 1
await page.click('[data-act="rematch"][data-instant="1"]'); await page.click('[data-act="gomatch"]'); await page.click('[data-act="endmatch"]');
await pvp(1, 3);
prev = (await page.textContent('.pvp-preview')).trim();
ok(prev.includes('Ava (knocked out): 1 card') && prev.includes('Ben: 3 bundles (9 cards)'), 'preview KO: ' + prev);
await page.screenshot({ path: SHOTS + '/v16_3_pvp_ko.png' });
await page.click('[data-act="pvpsave"]');
ok(await cards() === '1,9' && await kos() === 'true,false', '1-3 knockout: 1 / 9');
ok((await page.textContent('.result')).includes('popped 1 · knocked out'), 'result card says knocked out');

// vs House: survived row and knocked-out row
await queue('Cy');
await page.click('.queue-card .huge[data-act="qstart"]'); await page.click('[data-act="gomatch"]'); await page.click('[data-act="endmatch"]');
ok(await page.locator('[data-act="scorehouse"]:not([data-ko])').count() === 4 && await page.locator('[data-act="scorehouse"][data-ko="1"]').count() === 3, 'house: 4 survived buttons + 3 knocked-out buttons');
await page.screenshot({ path: SHOTS + '/v16_4_house_survive.png' });
await page.click('[data-act="scorehouse"][data-n="2"]:not([data-ko])');
ok(await cards() === '6' && await kos() === 'false', 'house survived, popped 2: 6');
await page.click('[data-act="rematch"][data-instant="1"]'); await page.click('[data-act="gomatch"]'); await page.click('[data-act="endmatch"]');
await page.click('[data-act="scorehouse"][data-n="1"][data-ko="1"]');
ok(await cards() === '1' && await kos() === 'true', 'house knocked out after popping 1: 1 pity card');

// Knocked-out pity card: 1 by default (v1.8.5); 0 still works when chosen
await page.click('[data-modal="settings"]');
ok(await ev(() => state.settings.battle.consolation) === 1, 'knocked-out default is 1');
ok((await page.textContent('.dialog')).replace(/\s+/g, ' ').includes('vs Player 12 cards for 10 tix'), 'worst case with 1 for knocked out stays 12 (2-2 beats 9 + 1)');
await page.fill('#set-consolation', '0'); await page.keyboard.press('Enter');
ok(await ev(() => state.settings.battle.consolation === 0 && state.settings.battle.consolationSet === true), 'knocked-out set to 0 and marked as chosen');
await page.keyboard.press('Escape');
await page.click('[data-act="rematch"][data-instant="1"]'); await page.click('[data-act="endmatch"]');
await page.click('[data-act="scorehouse"][data-n="0"][data-ko="1"]');
ok(await cards() === '0', 'knocked out with 0 chosen: 0 cards');
await page.click('[data-modal="settings"]');
await page.fill('#set-consolation', '1'); await page.keyboard.press('Enter');
await page.keyboard.press('Escape');

// Rules card + script
await page.click('[data-act="open"][data-modal="rules"]');
const rules = (await page.textContent('.dialog.rules')).replace(/\s+/g, ' ');
ok(rules.includes('only keep them if your robot still has a balloon when the match ends') && rules.includes('Lose all 3 balloons: 1 card for playing') && rules.includes('but only if your robot survives to the end'), 'rules + script describe survive');
await page.locator('.dialog.rules').screenshot({ path: SHOTS + '/v16_5_rules.png' });
await page.keyboard.press('Escape');

// CSV battle_outcome column
await page.click('[data-modal="totals"]');
const st = (await page.textContent('table.stats')).replace(/\s+/g, ' ');
ok(st.includes('3 per balloon, must survive to the end + 1 if knocked out'), 'stats scoring text');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
const csv = fs.readFileSync(await dl.path(), 'utf8');
const head = csv.split('\r\n')[0].replace(/^﻿/, '').split(',');
const oc = head.indexOf('battle_outcome');
const outs = csv.split('\r\n').slice(1).map(r => r.split(',')[oc]).filter(Boolean);
ok(oc > 0 && outs.includes('Survived') && outs.includes('Knocked out') && outs.includes('Tie / Survived'), 'CSV battle_outcome: ' + JSON.stringify(outs));
ok(!csv.includes('Ava') && !csv.includes('Cy,'), 'player names not exported');
await page.keyboard.press('Escape');

// Other modes still work: winner-only preset and outcome mode
await page.click('[data-modal="settings"]');
await page.click('[data-act="scoringpreset"][data-id="w3"]');
ok(await ev(() => state.settings.battle.scoring) === 'perBalloon' && await page.isVisible('[data-act="pvptie"]'), 'winner-only preset switches mode');
await page.keyboard.press('Escape');
await queue('Dee', 'Eli');
await page.click('.queue-card .huge[data-act="qstart"]'); await page.click('[data-act="endmatch"]');
await pvp(1, 3); await page.click('[data-act="pvpsave"]');
ok(await cards() === '0,9' && await kos() === ',', 'winner-only 1-3: 0 / 9, no survive flag');
await page.click('[data-modal="settings"]');
await page.click('[data-act="scoringpreset"][data-id="out"]');
await page.keyboard.press('Escape');
await page.click('[data-act="rematch"][data-instant="1"]'); await page.click('[data-act="endmatch"]');
await page.click('[data-act="outcome"][data-code="ko0"]');
ok(await cards() === '9,1', 'outcome KO: 9 / 1');
await page.click('[data-modal="settings"]');
await page.click('[data-act="scoringpreset"][data-id="s3"]');
ok(await ev(() => state.settings.battle.scoring === 'survive' && state.settings.battle.consolation === 1), 'survive preset restores 3 per balloon, 1 when knocked out');
await page.keyboard.press('Escape');

// Payout bar reflects everything
const bar = (await page.textContent('.payout-bar')).replace(/\s+/g, ' ');
ok(bar.includes('vs House') && bar.includes('vs Player'), 'payout bar: ' + bar);

// Phone width: ready screen fits
await page.setViewportSize({ width: 390, height: 844 });
await queue('Fay');
await page.click('.queue-card .huge[data-act="qstart"]');
const over = await ev(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok(!over, 'no horizontal scroll on phone (ready screen)');
await page.screenshot({ path: SHOTS + '/v16_6_phone_ready.png' });
ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 * v1.1 (2026-10-16): Knocked-out pity card is 1 by default; 0 still works when chosen (tracker v1.8.5).
 */

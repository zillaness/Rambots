/**
 * @file battle_flow_test_v1.0.mjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Balloon Battle v1.7 flow: sign-up, weapon unlocks, queue, clock, rematch, pairing, CSV, Combine, migration, phone.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const SHOTS = process.argv[2];
const DL = SHOTS + '/dl17'; fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ev = f => page.evaluate(f);
const toastText = async () => (await page.textContent('#toast')).trim();
const tixTotal = () => ev(() => computeTotals().tix);
async function download(sel) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  const file = path.join(DL, d.suggestedFilename()); await d.saveAs(file); return file;
}
// Sign up: weapons = [[player, weapon, taps]] (1 tap = unlock, 2 taps = has sticker)
async function signup(mode, names, weapons = [], demo = []) {
  await page.click(`[data-act="qmode"][data-val="${mode}"]`);
  for (let i = 0; i < names.length; i++) await page.fill(`#q-name-${i}`, names[i]);
  for (const [p, w, taps] of weapons) for (let t = 0; t < (taps || 1); t++) await page.click(`.panel [data-act="qweap"][data-p="${p}"][data-w="${w}"]`);
  for (const [p, field, val] of demo) await page.click(`.panel [data-act="qdemo"][data-p="${p}"][data-field="${field}"][data-val="${val}"]`);
  await page.click('[data-act="qadd"]');
  if (await page.isVisible('.dialog.upsell')) await page.click('[data-act="qaddgo"]');
}
const queued = () => ev(() => queuedMatches().map(m => m.players.map(p => p.name).join('+')).join(','));
const rows = () => page.locator('.qlist .qrow');

await page.goto('http://localhost:8766/ramathon-sales-tracker/?booth=battle');
await ev(() => localStorage.clear()); await page.reload();
ok(await ev(() => JSON.stringify([bs().match, bs().rematch, bs().weaponPrices, bs().rematchOnce, bs().rematchMaxWaiting])) === '[5,5,{"spikes":1,"saw":2},true,2]', 'defaults: 5 match, 5 instant rematch, spikes 1, saw 2, once, max 2 waiting');

// Sign-up panel
ok(await page.isVisible('[data-act="qmode"][data-val="house"].on') && (await page.textContent('.panel .ask-line')).includes('wheel spikes for 1 ticket or buzz saw for 2 tickets'), 'mode picker + Ask line');
ok((await page.textContent('.panel .script')).includes('only keep them if your robot still has a balloon'), 'short scoring script on the sign-up panel');
await page.fill('#q-name-0', 'Ava');
await page.click('.panel [data-act="qweap"][data-p="0"][data-w="saw"]');
ok((await page.textContent('[data-act="qadd"]')).includes('collect 7 tix'), 'saw unlock adds 2: collect 7');
await page.click('[data-act="qadd"]');
ok(!(await page.isVisible('.dialog.upsell')), 'no weapon pop-up when a weapon is picked');
let t = await toastText();
ok(t.includes('Collect 7 tix: Ava 7') && t.includes('new unlock: Buzz saw') && t.includes('#1 in line, next up'), 'sign-up toast: ' + t);
ok(await ev(() => document.activeElement.id) === 'q-name-0', 'focus back on the name box');

// vs Player, no weapons -> pop-up asks; add spikes for Ben there
await page.click('[data-act="qmode"][data-val="pvp"]');
ok(await page.isVisible('#q-name-1'), 'vs Player shows two players');
await page.fill('#q-name-0', 'Ben');
await page.keyboard.press('Enter');
ok(await ev(() => document.activeElement.id) === 'q-name-1', 'Enter on player 1 moves to player 2');
await page.keyboard.type('Cy');
await page.keyboard.press('Enter');
ok(await page.isVisible('.dialog.upsell') && (await page.textContent('.dialog.upsell')).includes('Ask about weapons'), 'pop-up when a player has no weapon');
await page.screenshot({ path: SHOTS + '/v17_1_upsell.png' });
await page.click('.dialog.upsell [data-act="qweap"][data-p="0"][data-w="spikes"]');
ok((await page.textContent('[data-act="qaddgo"]')).includes('collect 11 tix'), 'pop-up total updates: 11');
await page.keyboard.press('Enter');
ok(!(await page.isVisible('.dialog.upsell')) && await queued() === 'Ava,Ben+Cy', 'Enter in pop-up adds: ' + await queued());
t = await toastText();
ok(t.includes('Collect 11 tix: Ben 6 · Cy 5') && /#2 in line, ~4 min/.test(t), 'pvp toast with wait: ' + t);

// Sticker: two taps = has it, free
await signup('house', ['Dee'], [[0, 'saw', 2]]);
ok(await ev(() => { const m = queuedMatches()[2]; return m.players[0].tix === 5 && m.players[0].have.join() === 'saw'; }), 'already-unlocked weapon is free (5 tix)');

// Solos: Eli (kid) and Fay -> pair
await signup('solo', ['Eli'], [[0, 'spikes']], [[0, 'age', 'kid']]);
await signup('solo', ['Fay'], [[0, 'spikes', 2]]);
ok((await rows().nth(3).textContent()).includes('solo · wants an opponent'), 'solo tag in queue');
ok(await page.isVisible('[data-act="pair"]') && (await page.textContent('[data-act="pair"]')).includes('Pair with Fay'), 'pair offer on Eli');
ok(await tixTotal() === 7 + 11 + 5 + 6 + 5, 'tix counted at sign-up: ' + await tixTotal());
await page.screenshot({ path: SHOTS + '/v17_2_queue.png' });
await page.click('[data-act="pair"]');
ok(await queued() === 'Ava,Ben+Cy,Dee,Eli+Fay', 'paired into one match: ' + await queued());
ok(await tixTotal() === 34 && await ev(() => state.matches.find(m => m.players[0].name === 'Fay' && m.status === 'paired') != null), 'paired tickets counted once (34)');

// Wait times next to names
const waits = await page.locator('.q-wait').allTextContents();
ok(waits[0] === 'next up' && waits[1] === '~4 min' && waits[2] === '~8 min', 'wait next to names: ' + waits.join(' | '));

// Push down, refund
await page.click(`[data-act="qdown"] >> nth=0`);
ok(await queued() === 'Ben+Cy,Ava,Dee,Eli+Fay', 'Ava pushed down one');
await page.click(`[data-act="qrefund"] >> nth=2`);
ok((await toastText()).includes('Hand back 5 tix: Dee 5') && await queued() === 'Ben+Cy,Ava,Eli+Fay' && await tixTotal() === 29, 'refund Dee: 29 tix left');
await page.keyboard.press('Control+z');
ok(await queued() === 'Ben+Cy,Ava,Dee,Eli+Fay' && (await toastText()).includes('Refunded #3'), 'undo refund says what it undid');
await page.click(`[data-act="qrefund"] >> nth=2`);

// Start next: pinned match, Ready
await page.click('.queue-card .huge[data-act="qstart"]');
ok((await page.textContent('#match-timer')).trim() === 'Ready · 2:00', 'called up, clock Ready');
ok(await page.isVisible('.queue-card') && await rows().count() === 2, 'queue stays visible under the match');
ok(await page.isDisabled('[data-act="qstart"] >> nth=0'), 'Start disabled while a match is on');
// keep signing up during the match
await signup('house', ['Gus']);
ok(await page.isVisible('#match-timer') && await rows().count() === 3, 'sign-ups keep working during a match');
await page.click('[data-act="gomatch"]');
await page.waitForTimeout(1200);
ok(/^1:5\d$/.test((await page.textContent('#match-timer')).trim()), 'running');
const w0 = (await page.locator('.q-wait').first().textContent()).trim();
ok(w0 === '~4 min', 'first in line waits ~ time left + turnaround: ' + w0);
await page.screenshot({ path: SHOTS + '/v17_3_playing.png' });
await page.click('[data-act="pausematch"]');
const p1 = (await page.textContent('#match-timer')).trim();
await page.waitForTimeout(1300);
ok(p1.endsWith('· paused') && (await page.textContent('#match-timer')).trim() === p1 && await page.isVisible('#match-timer.paused'), 'pause holds: ' + p1);
await page.click('[data-act="resumematch"]');
await page.click('[data-act="editclock"]');
await page.click('[data-act="clockadj"][data-d="60"]');
await page.click('[data-act="clocksave"]');
ok(/^2:5\d$/.test((await page.textContent('#match-timer')).trim()), 'edit clock +1:00: ' + (await page.textContent('#match-timer')).trim());
await page.click('[data-act="restartmatch"]');
ok((await page.textContent('#match-timer')).trim() === 'Ready · 2:00' && await ev(() => playingMatch().restarts) === 1, 'restart: back to Ready, logged');
ok(await tixTotal() === 34, 'restart charges nothing');

// Change weapons on the current match: Cy unlocks a saw
await page.click('.mini-row [data-act="mweapons"]');
await page.click('.dialog.upsell [data-act="mweap"][data-p="1"][data-w="saw"]');
ok((await page.textContent('[data-act="mweapsave"]')).includes('collect 2 more tix'), 'weapon change shows what to collect');
await page.click('[data-act="mweapsave"]');
ok((await toastText()).includes('Collect 2 more tix') && await tixTotal() === 36, 'weapon added mid-match: 36');

// Not ready: back to queue front, tix kept
await page.click('[data-act="backqueue"]');
ok(await queued() === 'Ben+Cy,Ava,Eli+Fay,Gus' && await tixTotal() === 36, 'back to the front of the queue, tix kept');
await page.click('.queue-card .huge[data-act="qstart"]');
await page.click('[data-act="gomatch"]');
await page.click('[data-act="endmatch"]');
await page.click('[data-act="pvppop"][data-p="0"][data-n="2"]'); await page.click('[data-act="pvppop"][data-p="1"][data-n="1"]');
await page.click('[data-act="pvpsave"]');
ok(await ev(() => lastMatch().players.map(p => p.cards).join()) === '6,3', 'survive scoring 2-1: 6 / 3');

// Result card: 3 matches waiting -> instant blocked, rematch back in line works
ok(await page.isDisabled('[data-act="rematch"][data-instant="1"]') && (await page.textContent('[data-act="rematch"][data-instant="1"]')).includes('3 matches waiting'), 'instant rematch blocked: line too long');
await page.screenshot({ path: SHOTS + '/v17_4_result.png' });
await rows().last().scrollIntoViewIfNeeded();
const lb = await rows().last().boundingBox();
ok(lb && lb.y + lb.height <= 768, 'queue rows reachable under the result card (scroll)');
await page.locator('.arena').evaluate(el => { el.scrollTop = 0; });
await page.click('[data-act="rmwho"][data-val="1"]');
ok((await page.textContent('[data-act="rematch"][data-instant="0"]')).includes('5 tix'), 'only Cy: 5 tix');
await page.click('[data-act="rematch"][data-instant="0"]');
ok(await queued() === 'Ava,Eli+Fay,Gus,Cy' && await ev(() => { const m = queuedMatches()[3]; return m.mode === 'house' && m.players[0].tix === 5 && m.players[0].have.join() === 'saw'; }), 'Cy back in line vs House, saw kept free');
ok((await page.textContent('.result')).includes('Rematch signed up as #'), 'result card closes its rematch buttons');

// Instant rematch once, when allowed
await page.click('[data-modal="settings"]');
await page.fill('#set-rmwait', '5'); await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.click('.queue-card .huge[data-act="qstart"]'); // Ava vs House
await page.click('[data-act="gomatch"]'); await page.click('[data-act="endmatch"]');
await page.click('[data-act="scorehouse"][data-n="2"]:not([data-ko])');
ok(!(await page.isDisabled('[data-act="rematch"][data-instant="1"]')), 'instant rematch allowed with 3 waiting when max is 5');
await page.click('[data-act="rematch"][data-instant="1"]');
ok(await ev(() => { const m = playingMatch(); return m.rematch && m.players[0].tix === 5 && m.players[0].have.join() === 'saw'; }) && (await toastText()).includes('Collect 5 tix: Ava 5'), 'instant rematch plays now at 5, saw stays unlocked');
await page.click('[data-act="endmatch"]');
await page.click('[data-act="scorehouse"][data-n="0"][data-ko="1"]');
ok(await page.isDisabled('[data-act="rematch"][data-instant="1"]') && (await page.textContent('[data-act="rematch"][data-instant="1"]')).includes('Already had their instant rematch'), 'only once in a row');

// CSV: statuses, weapon rows, no names
await page.click('[data-modal="totals"]');
const st = (await page.textContent('table.stats')).replace(/\s+/g, ' ');
ok(st.includes('Buzz saw unlocks2 (4 tix)') && st.includes('Refunds1 (5 tix)') && st.includes('Solo sign-ups paired up1') && st.includes('Clock restarts1') && st.includes('Weapons used, unlocked earlier (free)3') && st.includes('Avg wait, sign-up to start'), 'battle stats: ' + st.slice(st.indexOf('Matches played'), st.indexOf('Matches played') + 700));
const csvFile = await download('[data-act="export"]');
const csv = fs.readFileSync(csvFile, 'utf8').replace(/^﻿/, '');
const lines = csv.trim().split(/\r\n/).map(l => l.split(','));
const head = lines[0]; const col = k => head.indexOf(k);
const statuses = new Set(lines.slice(1).map(r => r[col('status')]));
ok(['played', 'queued', 'refunded', 'paired'].every(x => statuses.has(x)), 'CSV statuses: ' + [...statuses].join(' '));
const items = lines.slice(1).map(r => r[col('item')] + ':' + r[col('item_tickets')]);
ok(items.includes('Buzz saw:2') && items.includes('Wheel spikes:1') && items.includes('Buzz saw (unlocked earlier):0'), 'CSV weapon rows');
ok(!/Ava|Ben|Eli|Gus/.test(csv), 'player names never exported');
await page.keyboard.press('Escape');

// Combine counts queued, skips refunded / paired: equals this laptop's total
await page.click('[data-modal="settings"]');
await page.click('[data-act="open"][data-modal="combine"]');
await page.setInputFiles('#combine-files', [csvFile]);
await page.waitForSelector('#combine-plinko');
const cr = await ev(() => combineResult().byCat.battle);
ok(cr === await tixTotal(), `Combine battle total ${cr} = laptop total ${await tixTotal()}`);
await page.keyboard.press('Escape');

// Rules card
await page.click('[data-act="open"][data-modal="rules"]');
const rules = (await page.textContent('.dialog.rules')).replace(/\s+/g, ' ');
ok(rules.includes('Unlock a weapon: wheel spikes +1, buzz saw +2. Pay once') && rules.includes('Instant rematch plays right away for 5, once,') && rules.includes('Controls script'), 'rules card');
await page.keyboard.press('Escape');

// History shows queue states
await page.click('[data-modal="history"]');
const hist = (await page.textContent('.dialog')).replace(/\s+/g, ' ');
ok(hist.includes('REFUNDED') && hist.includes('in queue') && hist.includes('paired into #4') && hist.includes('Buzz saw (unlocked earlier)'), 'history shows refunded / in queue / paired');
await page.keyboard.press('Escape');

// Custom match length applies to the next match called up
await page.click('[data-modal="settings"]');
await page.fill('#set-length', '1.5'); await page.keyboard.press('Enter');
await page.keyboard.press('Escape');

// Weapon price edit applies to new sign-ups
await page.click('[data-modal="settings"]');
await page.fill('#set-wp-saw', '3'); await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.click('[data-act="qmode"][data-val="house"]');
await page.click('.panel [data-act="qweap"][data-p="0"][data-w="saw"]');
ok((await page.textContent('[data-act="qadd"]')).includes('collect 8 tix'), 'saw price 3 applies to the next sign-up');
await page.click('.panel [data-act="qweap"][data-p="0"][data-w="saw"]'); await page.click('.panel [data-act="qweap"][data-p="0"][data-w="saw"]');

// Reload keeps the queue and a running clock
await page.click('.queue-card .huge[data-act="qstart"]');
ok((await page.textContent('#match-timer')).trim() === 'Ready · 1:30', 'custom length 1.5 min');
await page.click('[data-act="gomatch"]');
const before = await queued();
await page.reload();
await page.waitForTimeout(1100);
ok(await queued() === before && /^1:2\d$/.test((await page.textContent('#match-timer')).trim()), 'queue and clock survive reload');

// Migration from v1.6: old name queue dropped, running v1.6 match keeps counting
await ev(() => {
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
  s.queue = [{ id: 'x', name: 'Old', weapons: 1, addedAt: new Date().toISOString() }];
  const m = s.matches.find(x => x.id === s.matchId);
  delete m.runAt; m.leftMs = null; m.goAt = new Date(Date.now() - 30000).toISOString(); delete m.paidAt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(300);
ok(await ev(() => state.queue.length) === 0 && /^(0:5\d|1:0\d)$/.test((await page.textContent('#match-timer')).trim()), 'v1.6 data migrates: ' + (await page.textContent('#match-timer')).trim());

// Phone: pinned match + queue, no sideways scroll
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
ok(!(await ev(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'phone: no horizontal scroll');
await page.screenshot({ path: SHOTS + '/v17_5_phone.png', fullPage: true });
await page.setViewportSize({ width: 1366, height: 768 });
await page.click('[data-act="qmode"][data-val="pvp"]');
await page.fill('#q-name-0', 'Hal');
await page.click('.panel [data-act="qweap"][data-p="0"][data-w="spikes"]');
await page.click('.panel [data-act="qweap"][data-p="1"][data-w="saw"]');
await page.click('.panel [data-act="qweap"][data-p="1"][data-w="saw"]');
await page.locator('.panel').screenshot({ path: SHOTS + '/v17_6_signup_panel.png' });
ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 */

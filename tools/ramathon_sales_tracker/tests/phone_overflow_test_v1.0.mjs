/**
 * @file phone_overflow_test_v1.0.mjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description No horizontal scroll at phone width on every booth screen.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 */
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const q of ['', '?booth=sales', '?booth=battle', '?booth=prizes']) {
  await page.goto('http://localhost:8766/ramathon-sales-tracker/' + q);
  await page.waitForTimeout(300);
  for (const scr of q === '?booth=sales' ? ['home', 'copters', 'clickers'] : ['home']) {
    if (scr === 'copters') await page.click('.cat.theme-red').catch(() => {});
    if (scr === 'clickers') { await page.click('.back').catch(() => {}); await page.click('.cat.theme-yellow').catch(() => {}); }
    const res = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const bad = [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > W + 1)
        .map(el => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').join('.')} r=${Math.round(el.getBoundingClientRect().right)}`);
      return { W, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 6) };
    });
    console.log(q || 'plain', scr, JSON.stringify(res));
  }
}
await browser.close();

/** CHANGELOG
 * v1.0 (2026-10-16): Initial commit from the build session (tracker v1.7.1).
 */

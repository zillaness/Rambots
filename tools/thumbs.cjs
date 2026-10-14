/**
 * @file thumbs.cjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-14
 * @lastUpdated 2026-10-14
 * @description Screenshots the top of each HTML study sheet for its index card (called by build_site.py).
 * @aiUpdate Update @lastUpdated and @version. Append changelog at bottom.
 *
 * Usage: node tools/thumbs.cjs '[["path/to/page.html", "out.jpg"], ...]'
 */
'use strict';
const { pathToFileURL } = require('url');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('thumbs.cjs: Playwright is not installed; skipping HTML screenshots.');
  process.exit(0);
}

(async () => {
  const jobs = JSON.parse(process.argv[2] || '[]');
  const opts = {};
  if (process.env.PLAYWRIGHT_BROWSERS_PATH === '/opt/pw-browsers') {
    // Cloud containers ship a pinned Chromium; use it instead of downloading one.
    opts.executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  }
  let browser;
  try {
    browser = await chromium.launch(opts);
  } catch (e) {
    browser = await chromium.launch();
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 });
  for (const [src, out] of jobs) {
    // Wait for web fonts, but never hang the build if they are unreachable.
    await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: out, type: 'jpeg', quality: 80 });
    console.log('thumb', out);
  }
  await browser.close();
})();

/** CHANGELOG
 * v1.0 (2026-10-14): Initial release.
 */

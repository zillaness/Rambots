/**
 * @file render_infographic_v1.0.cjs
 * @version 1.0
 * @author Sam Cao
 * @created 2026-10-18
 * @lastUpdated 2026-10-18
 * @description Renders the Ram-a-thon 2026 infographic HTML to a PNG with Playwright's Chromium (.cjs because the repo package.json is ESM).
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 *
 * Usage (from this folder, with Playwright installed):
 *   node render_infographic_v1.0.cjs ramathon_2026_infographic_v1.2.3.html ramathon_2026_infographic_v1.2.3.png 1920
 * The page is a fixed 1080px wide; the third argument is its height. The script
 * prints the footer position so you can check nothing runs past the bottom edge.
 */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const [src, out, hArg] = process.argv.slice(2);
  const H = parseInt(hArg || '1920', 10);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(src));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const fit = await page.evaluate(() => {
    const f = document.querySelector('footer').getBoundingClientRect();
    return { pageHeight: document.documentElement.scrollHeight, footerBottom: Math.round(f.bottom) };
  });
  console.log(JSON.stringify(fit), fit.pageHeight > H ? 'OVERFLOW: content runs past the bottom' : 'fits');
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: H } });
  await browser.close();
})();

/** CHANGELOG
 * v1.0 (2026-10-18): Initial release.
 */

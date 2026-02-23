/**
 * BSides Demo — Playwright Turnstile click test
 * Opens https://bsides.letsgochristo.com/, clicks the Turnstile checkbox,
 * and reports whether it passed.
 */

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    // Mask common bot-detection signals
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  });

  // Spoof navigator.webdriver before any page scripts run
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  console.log('→ Navigating to https://bsides.letsgochristo.com/ ...');
  await page.goto('https://bsides.letsgochristo.com/', { waitUntil: 'load' });

  // Tag this session so the Worker can tell automated vs. human traffic apart
  await context.addCookies([{
    name: 'demo-source',
    value: 'playwright-native',
    domain: 'bsides.letsgochristo.com',
    path: '/',
  }]);

  console.log('→ Waiting for Turnstile widget ...');
  const widget = await page.waitForSelector('.cf-turnstile', { timeout: 15000 });

  console.log('→ Letting Turnstile fully render (6 s) ...');
  await page.waitForTimeout(6000);

  // Screenshot before the click
  const screenshotBefore = path.join(__dirname, 'turnstile-before.png');
  await page.screenshot({ path: screenshotBefore, fullPage: false });
  console.log(`   Screenshot saved: ${screenshotBefore}`);

  const box = await widget.boundingBox();
  console.log(`   Widget box: x=${box.x.toFixed(0)} y=${box.y.toFixed(0)} w=${box.width.toFixed(0)} h=${box.height.toFixed(0)}`);

  // Scroll the widget into view and click the checkbox area (left ~20 px, vertically centered)
  await widget.scrollIntoViewIfNeeded();
  const clickX = box.x + 20;
  const clickY = box.y + box.height / 2;
  console.log(`→ Clicking at (${clickX.toFixed(0)}, ${clickY.toFixed(0)}) ...`);
  await page.mouse.move(clickX - 50, clickY, { steps: 5 }); // natural mouse movement
  await page.waitForTimeout(300);
  await page.mouse.move(clickX, clickY, { steps: 8 });
  await page.waitForTimeout(200);
  await page.mouse.click(clickX, clickY);

  // Screenshot after the click
  await page.waitForTimeout(2000);
  const screenshotAfter = path.join(__dirname, 'turnstile-after.png');
  await page.screenshot({ path: screenshotAfter, fullPage: false });
  console.log(`   Screenshot saved: ${screenshotAfter}`);

  console.log('→ Waiting for Turnstile token (up to 25 s) ...');
  let passed = false;
  let token = '';
  for (let i = 0; i < 50; i++) {
    token = await page.$eval('[name="cf-turnstile-response"]', el => el.value).catch(() => '');
    if (token && token.length > 10) { passed = true; break; }
    await page.waitForTimeout(500);
  }

  // Final screenshot
  const screenshotFinal = path.join(__dirname, 'turnstile-final.png');
  await page.screenshot({ path: screenshotFinal, fullPage: false });
  console.log(`   Screenshot saved: ${screenshotFinal}`);

  if (passed) {
    console.log('\n✅  TURNSTILE PASSED');
    console.log(`   Token (first 60 chars): ${token.substring(0, 60)}…`);
  } else {
    console.log('\n❌  TURNSTILE DID NOT PASS');
    console.log('   (Bot detected, or a visual challenge was shown — check the screenshots)');
  }

  await page.waitForTimeout(4000);
  await browser.close();
})();

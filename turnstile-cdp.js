/**
 * Approach 1: Connect to a real Google Chrome via CDP.
 * A real Chrome has no automation fingerprints — no navigator.webdriver,
 * no cdc_ Runtime domain leaks, no Playwright-specific signals.
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const PROFILE_DIR = '/tmp/bsides-chrome-profile';

(async () => {
  // Kill any existing Chrome debug instances on this port
  try { execSync(`lsof -ti:${DEBUG_PORT} | xargs kill -9 2>/dev/null`); } catch {}

  // Launch a real Chrome with remote debugging
  console.log('→ Launching real Google Chrome with remote debugging ...');
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore', detached: true });
  chrome.unref();

  // Wait for the debug port to be ready
  for (let i = 0; i < 20; i++) {
    try {
      execSync(`curl -s http://localhost:${DEBUG_PORT}/json/version`, { timeout: 2000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Connect Playwright to the running Chrome
  console.log('→ Connecting Playwright to Chrome via CDP ...');
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  console.log('→ Navigating to https://bsides.letsgochristo.com/ ...');
  await page.goto('https://bsides.letsgochristo.com/', { waitUntil: 'load' });

  console.log('→ Waiting for Turnstile widget ...');
  const widget = await page.waitForSelector('.cf-turnstile', { timeout: 15000 });
  console.log('→ Letting Turnstile render (6 s) ...');
  await page.waitForTimeout(6000);

  const box = await widget.boundingBox();
  console.log(`   Widget box: x=${box.x.toFixed(0)} y=${box.y.toFixed(0)} w=${box.width.toFixed(0)} h=${box.height.toFixed(0)}`);

  // Click the checkbox — left side, vertically centered
  const clickX = box.x + 20;
  const clickY = box.y + box.height / 2;
  console.log(`→ Mouse move + click at (${clickX.toFixed(0)}, ${clickY.toFixed(0)}) ...`);

  // Simulate human-like mouse path
  await page.mouse.move(200, 300, { steps: 5 });
  await page.waitForTimeout(150);
  await page.mouse.move(clickX - 30, clickY + 10, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.move(clickX, clickY, { steps: 6 });
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();

  // Screenshot after click
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'cdp-after-click.png') });

  // Poll for Turnstile token
  console.log('→ Waiting for Turnstile token (up to 25 s) ...');
  let passed = false;
  let token = '';
  for (let i = 0; i < 50; i++) {
    token = await page.$eval('[name="cf-turnstile-response"]', el => el.value).catch(() => '');
    if (token && token.length > 10) { passed = true; break; }
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(__dirname, 'cdp-final.png') });

  if (passed) {
    console.log('\n✅  TURNSTILE PASSED (CDP approach)');
    console.log(`   Token (first 60 chars): ${token.substring(0, 60)}…`);
  } else {
    console.log('\n❌  TURNSTILE DID NOT PASS (CDP approach)');
  }

  await page.waitForTimeout(3000);
  await browser.close();

  // Clean up Chrome
  try { execSync(`lsof -ti:${DEBUG_PORT} | xargs kill -9 2>/dev/null`); } catch {}
})();

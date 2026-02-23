const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  await page.goto('https://bsides.letsgochristo.com/', { waitUntil: 'load' });

  // Wait for Turnstile frame
  let tsFrame = null;
  for (let i = 0; i < 30; i++) {
    tsFrame = page.frames().find(f => f.url().includes('challenges.cloudflare.com'));
    if (tsFrame) break;
    await page.waitForTimeout(500);
  }
  console.log('Turnstile frame URL:', tsFrame?.url());

  // Give the frame content time to render
  await page.waitForTimeout(5000);

  if (tsFrame) {
    // Dump the entire body HTML of the Turnstile frame
    const html = await tsFrame.evaluate(() => document.body.innerHTML).catch(e => `ERROR: ${e.message}`);
    console.log('\n--- Turnstile frame body (first 3000 chars) ---');
    console.log(html.substring(0, 3000));

    // List all interactive elements
    const elements = await tsFrame.evaluate(() => {
      const all = [...document.querySelectorAll('input, button, [role], label, [tabindex], .ctp-checkbox-label')];
      return all.map(e => ({
        tag: e.tagName, type: e.type, role: e.getAttribute('role'),
        class: e.className, id: e.id, tabindex: e.tabIndex,
        visible: e.offsetParent !== null, text: e.textContent?.trim().substring(0, 80),
      }));
    }).catch(e => `ERROR: ${e.message}`);
    console.log('\n--- Interactive elements in Turnstile frame ---');
    console.log(JSON.stringify(elements, null, 2));

    // Also check if there are nested iframes inside the Turnstile frame
    const nestedIframes = await tsFrame.evaluate(() =>
      [...document.querySelectorAll('iframe')].map(f => ({ src: f.src, id: f.id }))
    ).catch(e => `ERROR: ${e.message}`);
    console.log('\n--- Nested iframes inside Turnstile frame ---');
    console.log(JSON.stringify(nestedIframes, null, 2));
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();

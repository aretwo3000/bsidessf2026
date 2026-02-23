# BSides SF 2026 — "The Great Credential Caper" · Context File

> This file captures everything done so far across sessions so any new Claude session can pick up without prior conversation history.

---

## What this project is

A live conference demo app for a BSides SF 2026 talk titled **"The Great Credential Caper"**.

It simulates an **account takeover (ATO) attack** against a fictional theatrical streaming service called **Back Stage Pass**. The stack is Cloudflare Pages + Workers + KV — no traditional server.

Deployed at: `https://bsides.letsgochristo.com/`

---

## File structure

```
bsides-demo/
├── public/
│   ├── index.html            # The "target" — login page with Cloudflare Turnstile
│   ├── dashboard.html        # Post-takeover page (shows "AI Agent Login Detected")
│   └── log.html              # Live attack monitor (polls /api/log every 3 s)
├── functions/
│   └── api/
│       ├── login.js          # POST /api/login — validates Turnstile + checks creds + logs to KV
│       └── log.js            # GET /api/log (fetch log) + DELETE /api/log (reset)
├── wrangler.toml             # Cloudflare config + KV binding
├── package.json
│
│   ── Demo scripts ──
├── turnstile-test.js         # ❌ Playwright-native attempt (BLOCKED by Turnstile)
├── turnstile-bypass.js       # ✅ CDP bypass — full end-to-end ATO (WORKS)
├── turnstile-cdp.js          # ✅ CDP proof-of-concept (Turnstile only, no login)
├── inspect-page.js           # Scratch inspector (can delete)
│
│   ── Screenshots ──
├── turnstile-before.png      # Playwright attempt: widget before click
├── turnstile-after.png       # Playwright attempt: "Verification failed"
├── turnstile-final.png       # Playwright attempt: widget reset
├── cdp-after-click.png       # CDP attempt: green checkmark "Success!"
├── cdp-final.png             # CDP attempt: still showing Success
├── demo-turnstile-passed.png # Full bypass: Turnstile passed
├── demo-creds-entered.png    # Full bypass: creds typed in
├── demo-final.png            # Full bypass: landed on dashboard
│
├── BSIDES.md                 # ← this file
└── README.md                 # Deployment instructions only
```

---

## Demo credentials

- Username: `admin`
- Password: `Password123`

These are set as Cloudflare environment variables (`DEMO_USERNAME`, `DEMO_PASSWORD`) in `wrangler.toml`.

---

## How the demo app works

### `/` — Login page (`index.html`)
- Themed as a vintage theatre marquee (purple/gold/orange)
- Has username + password fields
- Has a **Cloudflare Turnstile** "Managed" widget (`data-sitekey` is already live in the file)
- On submit: POSTs `{ username, password, turnstile }` to `/api/login`

### `/api/login` (`functions/api/login.js`)
1. Validates the Turnstile token against Cloudflare's siteverify API
2. Checks credentials against env vars
3. Reads **Bot Management** data from `request.cf.botManagement` (score, verifiedBot, ja3Hash) — requires Bot Management add-on to populate
4. Reads **source tag** from `demo-source` cookie — automated scripts set this; human browsers don't
5. **Logs every attempt to KV** — including IP, country, user agent, Turnstile result, bot score, JA3 hash, source tag, and the final result
6. Returns `{ success: true/false }`

### `/dashboard.html` — Post-takeover page
- Shows an explicit **"Account Accessed — AI Agent Login Detected"** alert banner
- Displays fake subscription data (Visa ••••4231, 47 shows watched, etc.)
- This is what the audience sees as the "victim's perspective" of ATO

### `/log.html` — Live attack monitor
- Green-on-black terminal aesthetic
- Auto-refreshes every 3 seconds via `GET /api/log`
- Columns: Time, **Source** (human / cdp-bypass / playwright-native), Username, Password (masked), IP/Country, Turnstile, **Bot Score** (color-coded), Result badge (`🔴 TAKEOVER` / `WRONG CREDS` / `BLOCKED`), User Agent
- **Bot Score** column: red (1-29 = bot), amber (30-69 = uncertain), green (70-99 = human-like). Shows `—` if Bot Management isn't enabled.
- **Source** column: green = `human`, red = `cdp-bypass`, amber = `playwright-native`
- **This should be open on a second screen during the live demo**

### Reset between demo runs
```bash
npm run reset-log
# or
curl -X DELETE https://bsides.letsgochristo.com/api/log
```

---

## Session 1 — Codebase review + Playwright attempt (Sonnet 4.6)

### Codebase read-through
Full understanding of all files. The app is functional and deployed. README covers deployment only — no presentation narrative exists yet.

### Playwright-native attempt (`turnstile-test.js`) — BLOCKED

**Goal:** Open a Playwright-managed browser, navigate to the site, click the Turnstile checkbox, confirm whether it passed.

**Key finding — Turnstile iframe structure:**
Cloudflare Turnstile injects its widget iframe via JavaScript. The iframe `src` attribute in the DOM stays blank; the actual frame URL (`challenges.cloudflare.com/cdn-cgi/challenge-platform/…`) only appears in `page.frames()`. The iframe is sandboxed cross-origin so Playwright cannot read its DOM via `frame.evaluate()`.

**Approach used:** Locate `.cf-turnstile` widget div on the parent page, get its bounding box, simulate natural mouse movement to the checkbox position (~x+20, y-center), click.

**Anti-detection measures applied (all failed):**
- `--disable-blink-features=AutomationControlled` launch arg
- `navigator.webdriver` spoofed to `undefined` via `addInitScript`
- `navigator.plugins` and `navigator.languages` spoofed
- `window.chrome = { runtime: {} }` injected
- Realistic Chrome user agent string
- `locale: 'en-US'`, `timezoneId: 'America/Los_Angeles'`

**Result: ❌ Turnstile blocked Playwright immediately.**

Screenshots: `turnstile-before.png` (unchecked), `turnstile-after.png` ("Verification failed"), `turnstile-final.png` (reset).

---

## Session 2 — Turnstile bypass + full ATO + telemetry (Opus 4.6)

### Research findings

Extensive research across GitHub, Reddit, and security blogs revealed the key detection mechanisms and bypass techniques:

**Why Playwright gets caught:**
1. **`navigator.webdriver`** — Playwright sets this to `true`; JS-level spoofing is detectable.
2. **CDP `Runtime.Enable` leak** — Playwright sends this command on connect, which Turnstile detects.
3. **`screenX`/`screenY` CDP bug** — When CDP dispatches `Input.dispatchMouseEvent`, the resulting `MouseEvent.screenX`/`screenY` are relative to the iframe (small values ~0-100) instead of the screen (values in the hundreds). Cloudflare checks this via `postMessage()` between the Turnstile iframe and the parent window. This is a Chromium bug acknowledged by Google (issue #40280325).

**Bypass approaches ranked (from research):**

| Approach | Works? | Notes |
|---|---|---|
| **Real Chrome + CDP connect** | ✅ Yes | No automation fingerprints at launch time |
| **Camoufox** (Python) | ✅ Yes | Firefox-based, C++-level fingerprint injection |
| **puppeteer-real-browser** | ✅ Yes | Auto-clicks Turnstile, includes screenX fix |
| **2Captcha / CapSolver API** | ✅ Yes | Outsources solving; ~$3/1k solves |
| **rebrowser-playwright** | ⚠️ Partial | Fixes Runtime.Enable but not screenX/screenY |
| **Playwright + stealth addons** | ❌ No | Standard JS spoofing insufficient |
| **Cloudflare test sitekeys** | ✅ Dev only | Always-pass keys for testing (`1x00000000000000000000AA`) |

### The winning approach — Real Chrome + CDP

**How it works:**
1. Launch Google Chrome ourselves with `--remote-debugging-port=9222` and a fresh `--user-data-dir`
2. Connect Playwright to it via `chromium.connectOverCDP('http://localhost:9222')`
3. The browser has **zero automation fingerprints** because Chrome was not launched by Playwright
4. Turnstile's behavioral analysis sees a normal browser + normal mouse click → passes

**Why this works but Playwright-native doesn't:**
- Chrome launched by Playwright gets injected with automation hooks at startup (`navigator.webdriver`, CDP `Runtime.Enable`, `cdc_` markers in the DOM)
- Chrome launched independently has none of these — it's a perfectly normal browser
- Playwright connects afterward via CDP, but the browser's initial fingerprint is already clean
- The CDP `screenX`/`screenY` bug doesn't seem to trigger on this approach (possibly because the mouse events go through Chrome's own input pipeline when connected via CDP to a user-launched instance, or Turnstile's check for this is less aggressive in Managed mode)

### Full ATO demo script (`turnstile-bypass.js`) — CONFIRMED WORKING

**Script:** `turnstile-bypass.js`

**Run:**
```bash
# Kill any stale Chrome + clean profile first
lsof -ti:9222 | xargs kill -9 2>/dev/null
rm -rf /tmp/bsides-chrome-profile
node turnstile-bypass.js
```

**What it does (6 steps):**
1. Launches real Google Chrome with `--remote-debugging-port=9222` and a fresh temp profile
2. Connects Playwright to Chrome via CDP
3. Navigates to `https://bsides.letsgochristo.com/`
4. Sets `demo-source=cdp-bypass` cookie (so the Worker tags this as automated traffic)
5. Waits for Turnstile widget → simulates human-like mouse path → clicks checkbox → **Turnstile passes** (green checkmark)
6. Types `admin` / `Password123` with per-keystroke delays → clicks "Enter the Stage" → **lands on dashboard** (`/dashboard?user=admin`)

**Console output on success:**
```
╔══════════════════════════════════════════════════╗
║  🔴  ACCOUNT TAKEOVER SUCCESSFUL                ║
║  Landed on dashboard — credentials accepted.    ║
╚══════════════════════════════════════════════════╝
```

**Screenshots produced:**
- `demo-turnstile-passed.png` — Turnstile green checkmark "Success!"
- `demo-creds-entered.png` — "admin" in username, dots in password, Turnstile still green
- `demo-final.png` — Dashboard showing "ACCOUNT ACCESSED — AI AGENT LOGIN DETECTED", "Welcome back, admin", Visa ••••4231, etc.

**Tested and confirmed working multiple consecutive times.**

### Side-by-side demo narrative

For the live talk, you have two scripts that tell the story:

1. **`node turnstile-test.js`** — Playwright launches its own Chromium → clicks Turnstile → **"Verification failed"** (red). Turnstile wins.
2. **`node turnstile-bypass.js`** — Real Chrome via CDP → clicks Turnstile → **"Success!"** (green) → types creds → **lands on dashboard**. Attacker wins.

The `/log.html` attack monitor (on a second screen) shows both attempts in real time, with source tagging to distinguish them.

### Cloudflare Turnstile Analytics — first look (Feb 22, 2026)

Reviewed the Turnstile Analytics dashboard after running both scripts + some manual browsing. Key findings:

**Challenge outcomes:**
- 46 challenges issued, 9 solved, 37 unsolved
- **19.57% "Likely human"** / **80.43% "Likely bot"** — Turnstile's analytics backend *flags* the traffic as mostly bot, even though challenges still get solved

**Source breakdown (Cloudflare's view):**

| Dimension | Value | Count | What it is |
|---|---|---|---|
| Source browser | Chrome | 37 | Real Chrome (CDP bypass + manual) |
| Source browser | HeadlessChrome | 9 | Playwright-native (detected as headless) |
| Source OS | Mac OS X | 37 | Real Chrome |
| Source OS | Linux | 9 | Playwright's bundled Chromium |
| Source IP | 162.196.90.174 | 37 | Primary test IP |

**Solve rates:**
- 9 challenges solved, all **Non-interactive** (Turnstile never escalated to a visual puzzle)
- 0 Interactive solves, 0 Pre-clearance solves
- Token validation: 2 siteverify requests, 2 valid, 0 invalid

**Key insight for the talk:** Turnstile's analytics layer classifies 80% of the traffic as "likely bot," but the **enforcement layer** (the actual challenge) still lets the CDP approach through. Detection without enforcement = the gap attackers exploit.

### Traffic tagging system (deployed Feb 22)

**Problem:** Cloudflare's Turnstile Analytics can only filter by: hostname, source browser, country, user agent, ASN, OS, IP. No custom dimensions. This makes it hard to separate Max's manual testing from automated script runs.

**Solution — two layers:**

1. **Our attack log (`/log.html`):** Scripts set a `demo-source` cookie before submitting the form. The Worker reads it and logs a `source` field:
   - `cdp-bypass` — from `turnstile-bypass.js`
   - `playwright-native` — from `turnstile-test.js`
   - `human` — no cookie (manual browser use)

2. **Cloudflare Turnstile Analytics:** Filter by `Source browser = HeadlessChrome` for Playwright attempts. For CDP bypass vs. manual, the cleanest approach is **temporal isolation** — run tests on a day with zero manual traffic so all data in that window is automated.

**Plan for next test session:** Wait 24 hours (so the current mixed data ages out of the "last 24 hours" view), then run only the scripts with no manual page visits. This gives clean automated-only data in Turnstile Analytics.

### Bot Management integration (deployed Feb 22, not yet enabled)

The Worker and log monitor now support Cloudflare Bot Management:

- **Worker (`login.js`)** reads `request.cf.botManagement.score`, `.verifiedBot`, and `.ja3Hash` on every request
- **Log monitor (`log.html`)** displays a color-coded **Bot Score** column (red/amber/green)
- If Bot Management is not enabled on the Cloudflare zone, the column shows `—` gracefully

**Next step:** Enable Bot Management in the Cloudflare dashboard, then re-run the bypass to see what bot score a real Chrome controlled via CDP gets. Prediction: high score (human-like) because real Chrome has legitimate JA3/JA4 TLS fingerprints.

**Narrative for the talk:** Even if Turnstile's analytics flag traffic as "likely bot," without Bot Management **enforcing** on bot scores, the attack succeeds. Bot Management would close the gap — it could block at the Worker level regardless of Turnstile passing.

---

## Talk outline (created Feb 22)

Full outline is in **`TALK-OUTLINE.md`**. Summary:

**Conference abstract:** "The Great Credential Caper: How to Perform — and Then Defend Against (the Nearly Impossible to Defend Against) — Account Takeover Attacks"

**Abstract source:** [Google Doc](https://docs.google.com/document/d/1pM5kkIhCpuAdv4mUpIbDV5Sga6YTCcrs3rHjcLqLKDE/)

### Structure (40 min + Q&A)

| Part | Title | Minutes | Content |
|---|---|---|---|
| 1 | The Problem | 5 | British Airways, 23andMe, Roku, PayPal breaches. What credential stuffing is. Why it's getting worse (AI, anti-detect browsers, residential proxies, cheap combo lists). |
| 2 | Live Demo — The Attack | 15 | Demo 1: Playwright gets blocked by Turnstile. Demo 2: CDP bypass succeeds — full ATO. Escalation: what this looks like at scale with combo lists + proxies + GoLogin. Optional: show Turnstile Analytics / Bot Management scores. |
| 3 | Why Defenses Fail | 5 | CAPTCHAs bypassed. Bot scoring fooled by real Chrome. Rate limiting defeated by proxy rotation. WAF has nothing to match. 2FA enrollment too low. |
| 4 | What Actually Works | 10 | **Tier 1:** Passkeys (eliminate the credential — the real answer) vs. authenticator apps (second lock, but password still exists). **Tier 2:** Breached credential monitoring (HIBP, Enzoic, SpyCloud). **Tier 3:** Risk-based MFA, account-level anomaly detection, post-login trip wires. **Tier 4:** Per-account rate limiting, proof-of-work challenges. |
| 5 | The Uncomfortable Truth | 5 | No silver bullet. Value vs. friction framework: what are you protecting, how valuable is it, what friction will users accept? Spectrum from low-value consumer (breach checks + optional TOTP) to high-value (mandatory passkeys + behavioral analytics). Close: "stop relying on the checkbox." |

### Key themes
- **Passkeys vs. authenticator apps:** Passkeys eliminate the credential (nothing to stuff). Authenticator apps add a second lock but the password still exists and is still vulnerable. Authenticator apps are the bridge; passkeys are the destination.
- **Value vs. friction:** No universal answer. Defense depends on what you're protecting, how valuable it is to an attacker, and how much friction your users will tolerate. Pick the friction ceiling, then stack every defense that fits under it.
- **Detection vs. enforcement gap:** Turnstile analytics flag 80% of traffic as "likely bot" but the challenge still passes. Detection without enforcement = the gap attackers exploit.

---

## Research — reCAPTCHA Enterprise Bypass (external article)

Source: https://medium.com/@kentavr00000009 (Oct 2025)

While we're using **Cloudflare Turnstile**, this article covers Google reCAPTCHA Enterprise bypass in extensive detail. The techniques and mental models are nearly identical — and directly useful for the talk's "Why Defenses Fail" narrative.

---

### Key distinctions: reCAPTCHA v2 vs v3 vs Enterprise

| Version | Interaction | Detection | Bypass difficulty |
|---|---|---|---|
| **v2** | Checkbox + image challenges | Basic behavioral signals | Low — solvers handle in 10-30s |
| **v3** | Invisible, behavioral score 0.0-1.0 | Full session behavioral analysis | Above average — must simulate real session |
| **Enterprise** | Either v2 or v3 mode, backend is far richer | Browser fingerprints, IP rep, Google account history, ML model | Very high — needs full-stack evasion |

**Parallel to Turnstile:** Turnstile's Managed mode is essentially reCAPTCHA v2-equivalent. Our demo shows it's bypassed the same way — the checkbox passes when a real browser with clean fingerprints is used.

---

### What reCAPTCHA Enterprise (and Turnstile) actually analyze

1. **Browser fingerprints** — canvas, WebGL, fonts, audio context, plugins, User-Agent, screen resolution
2. **`navigator.webdriver`** — presence immediately flags automation
3. **Behavioral signals** — mouse trajectory to the checkbox, click timing, scroll patterns, time on page
4. **CDP artifacts** — `Runtime.Enable` command, `cdc_` DOM markers injected by Playwright
5. **screenX/screenY values** — when CDP dispatches `Input.dispatchMouseEvent`, the values are iframe-relative (small numbers) instead of screen-relative (hundreds). Cloudflare's Turnstile iframe detects this via `postMessage()`. This is a **Chromium bug #40280325** — the reason vanilla Playwright fails.
6. **IP reputation** — known bot/proxy ranges are flagged
7. **Token binding** — tokens are domain + session bound, expire in ~2 minutes, single-use

---

### Bypass methods (ranked by effectiveness for our attack profile)

**1. Real browser + CDP connect (our approach - WORKS)**
- Launch Chrome ourselves, connect Playwright afterward
- Browser has zero automation fingerprints at launch time
- Turnstile/reCAPTCHA sees: real Chrome binary, real user profile, human-like mouse movements
- **This is exactly what `turnstile-bypass.js` does** - and why it works

**2. Camoufox (Python)**
- Firefox-based, injects anti-detection at C++ level (not JS)
- Can't be detected by JS fingerprinting — the spoofing happens before any JS runs
- Great for reCAPTCHA Enterprise v3 which does deep session analysis

**3. puppeteer-real-browser**
- Specifically built to solve the screenX/screenY CDP bug
- Auto-handles Turnstile clicks
- Node.js drop-in if CDP approach ever stops working

**4. Human CAPTCHA solving services (2Captcha, SolveCaptcha, Anti-Captcha)**
- Human operators ($1.50-$3 per 1,000 solves via 2Captcha)
- AI-based solvers ($0.55 per 1,000 via SolveCaptcha) using CV/neural networks
- At scale: send the sitekey + page URL via API → get back a token → inject into `g-recaptcha-response` hidden field
- The article includes working Python, PHP, and Node.js code samples for this flow
- **Talk angle:** At credential stuffing scale (millions of attempts), attackers don't run bypass scripts — they call a $0.55/1k API. Turnstile becomes a ~$0.001 per attempt surcharge on an attack.

**5. Camoufox / rebrowser-playwright / stealth plugins**
- Partially fix the problem at JS level
- rebrowser-playwright fixes `Runtime.Enable` CDP fingerprint but NOT the screenX/screenY issue
- Standard Playwright + stealth = not enough. Still fails. (This is what we proved in Session 1.)

---

### How to identify if a site uses reCAPTCHA Enterprise (relevant for talk's recon slide)

Look for in page source:
```html
<!-- Enterprise -->
<script src="https://www.google.com/recaptcha/enterprise.js" async defer></script>

<!-- Standard v2/v3 -->
<script src="https://www.google.com/recaptcha/api.js" ...></script>
```

In DevTools Network tab:
- Enterprise: requests to `/recaptcha/enterprise/` or `recaptchaenterprise.googleapis.com`
- Standard: requests to `/recaptcha/api2/`

In JS:
- Enterprise: `grecaptcha.enterprise.render(...)` or `grecaptcha.enterprise.execute(...)`
- Standard: just `grecaptcha`

For Turnstile, look for:
- `challenges.cloudflare.com` iframes in page.frames()
- `data-sitekey` attribute on `.cf-turnstile` div

---

### The defender's fundamental problem (key talk narrative point)

From the article:
> *"reCAPTCHA Enterprise is a technological arms race between Google and developers. Even if a bot manages to get the correct answer to an image (using a neural network), Enterprise may suspect something based on the aggregate signals. Consequently, the token may either not be generated at all or, upon server verification, be found to have a low score."*

**But** — our demo shows that using a real browser + CDP, those aggregate signals look clean. The behavioral analysis sees:
- Real Chrome binary (not Chromium bundled with Playwright)
- Legitimate TLS fingerprints (JA3/JA4)
- Human-like mouse trajectory (our bezier curve approach)
- No `navigator.webdriver` flag
- No `Runtime.Enable` CDP fingerprint

**Result:** Turnstile passes. reCAPTCHA Enterprise would also pass. The detection layer generates the right internal flags (80% "likely bot" in our analytics), but the enforcement layer — the challenge — still passes when the fingerprints are clean.

**This is the talk's core argument:** Detection ≠ enforcement. The gap between "we flagged it" and "we blocked it" is where credential stuffing attacks live.

---

### Solver service pricing (for scale argument in talk)

| Service | Method | Price per 1,000 solves | Speed |
|---|---|---|---|
| 2Captcha | Human crowdsourcing | ~$1.50-3.00 | 15-30s |
| Anti-Captcha | Human + automation | ~$5.00 | 5-20s |
| SolveCaptcha | AI neural networks | ~$0.55 | 5-10s |
| DeathByCaptcha | Human | ~$2.89 | 20-40s |
| NopeCHA | AI + browser extension | ~$0.50-2.00/sub | 5-15s |

**Talk punchline:** Cloudflare charges ~$1/1,000 for Turnstile validation (Bot Management Enterprise). Attackers can solve it for $0.55/1,000. The defender's infrastructure costs more than the attacker's bypass.

---

## Research — Bypassing Arkose Labs on iOS ("Orchestrated Visual Relay")

Source: https://dev.to/neverlow512/breaking-the-unbreakable-bypassing-arkose-labs-on-ios-2mnj (April 2025)
GitHub: https://github.com/Neverlow512/Breaking-the-Unbreakable-iOS-Captcha-Research

**Context:** Researcher bypassed Arkose Labs CAPTCHA inside an obscured iOS WKWebView while building a Tinder account automation framework. Standard Appium couldn't see inside the WebView DOM — so they invented a completely different bypass approach.

---

### Why this is relevant to the talk

This is a **different CAPTCHA** (Arkose Labs, not Turnstile), on a **different platform** (iOS native app, not web browser), using a **different bypass technique** (visual relay + OCR, not CDP). But it demonstrates the same thesis:

> **When one attack surface is hardened, attackers pivot to a completely different surface. The CAPTCHA itself isn't the problem — the assumption that it can't be bypassed is.**

Our demo: *CDP fingerprint attack on web Turnstile*
Their demo: *Visual relay attack on mobile Arkose Labs*

Same outcome. Completely different vectors.

---

### The "Orchestrated Visual Relay" technique

The WebView was obscured — Appium couldn't read the DOM, couldn't interact with elements. Dead end for traditional automation. So they went **above** the DOM:

**Components:**
- **Appium** - takes screenshots, taps screen coordinates (not DOM elements)
- **OpenCV/Pillow** - template matching to locate the CAPTCHA within the screenshot, crop it
- **Tesseract OCR** - reads text from the screenshot ("Verify", "Try Again", "Verification Complete")
- **External CAPTCHA solver API** - receives the cropped puzzle image, returns which cells to click
- **Python orchestrator** - state machine managing the full loop

**The loop:**
1. Screenshot the screen
2. OCR reads state ("Select dice with X", "Try Again", "Verification Complete")
3. If puzzle: send cropped image to solver API → get cell indices → tap those coordinates
4. If "Try Again": re-tap, loop
5. If "Verify": tap confirm, loop
6. If "Verification Complete": done

**Results:**
- Individual puzzle solve rate: >95%
- End-to-end (full multi-stage CAPTCHA): ~80%
- Failures from: latency triggering timing detection, OCR hiccups, robotic timing patterns

---

### Key insight for the talk

> *"Implementation Matters — Even a sophisticated CAPTCHA like Arkose Labs can be solved. Hiding the DOM stopped basic Appium inspection but was irrelevant to a visual attack capturing screenshots."*
> *"Client-Side Isn't Enough — Any fancy fingerprinting or analysis happening inside that WebView during the solve was largely bypassed because the actual solving happened externally."*

**Translation:** Every CAPTCHA relies on some mix of:
1. Behavioral signals (how you interact)
2. Environment signals (what browser/device you're using)
3. Visual puzzle difficulty (can you solve it)

Attackers will find the weakest link. If behavioral + environment are locked down → go visual. If visual is automated → go audio. If all three are locked → pay a human solver service.

There is no "unbreakable." Only "expensive enough to not be worth it."

---

### Arkose Labs vs Turnstile vs reCAPTCHA Enterprise (comparison for talk)

| CAPTCHA | Primary defense | Our bypass vector | Their bypass vector |
|---|---|---|---|
| Cloudflare Turnstile | Browser fingerprints + behavioral | Real Chrome + CDP (clean fingerprints) | — |
| reCAPTCHA Enterprise | Full-stack ML + IP reputation + behavioral | Real browser + session warmup + proxy | Human/AI solver APIs |
| Arkose Labs (mobile) | Visual puzzle + DOM obscurity | — | Screenshot + OCR + solver API (Visual Relay) |

**All three are bypassable. The vector changes. The outcome doesn't.**

---

## What still needs to be done

### Bot Management testing
Enable Bot Management → re-run scripts on a clean day (no manual traffic) → capture bot scores → see if the CDP approach still looks human to Cloudflare's ML.

### Slides
Talk outline exists (`TALK-OUTLINE.md`) but no slide deck yet. Could build in Google Slides, Keynote, or reveal.js.

### Possible demo enhancements
- Add a short delay/animation to the bypass script so the audience can follow each step on screen
- Consider running both scripts back-to-back in a single wrapper for a seamless demo flow

---

## Quick start

```bash
cd /Users/max/dev/bsides-demo

# Run the BLOCKED Playwright attempt (for contrast)
node turnstile-test.js

# Run the SUCCESSFUL CDP bypass (the main demo)
lsof -ti:9222 | xargs kill -9 2>/dev/null; rm -rf /tmp/bsides-chrome-profile
node turnstile-bypass.js

# Reset the attack log between runs
npm run reset-log

# Deploy changes
npm run deploy

# Local dev server
npm run dev   # http://localhost:8788
```

**Dependencies:** `wrangler`, `playwright`, `rebrowser-playwright` (installed but unused — CDP approach was sufficient). Playwright's Chromium browser is installed. Google Chrome must be installed at `/Applications/Google Chrome.app/` for the CDP bypass.

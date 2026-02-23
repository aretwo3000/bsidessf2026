# BSides SF 2026 — Research Resources

External articles, papers, and references for "The Great Credential Caper" talk.

---

## CAPTCHA Bypass Research

### 1. reCAPTCHA Enterprise Bypass: Full Review
- **URL:** https://medium.com/@kentavr00000009/recaptcha-enterprise-bypass-full-review-recognition-bypassing-and-what-captcha-solvers-can-b0f88d70d31f
- **Author:** Kentavr (Medium)
- **Date:** October 2025
- **Summary:** Comprehensive breakdown of reCAPTCHA v2/v3/Enterprise detection mechanisms, bypass techniques (human solvers, AI/CV, browser emulation), and solver service pricing comparison.
- **Key takeaways:**
  - Enterprise analyzes: canvas/WebGL fingerprints, `navigator.webdriver`, mouse trajectory, CDPArtifacts, IP reputation, Google account history
  - Solver services: 2Captcha ($1.50-3/1k), SolveCaptcha ($0.55/1k AI), Anti-Captcha ($5/1k)
  - At scale, Turnstile becomes a $0.001/attempt surcharge on an attack
  - Includes working Python/PHP/Node.js code for solver API integration
- **Relevance:** "Why Defenses Fail" section, scale argument, cost comparison slide

### 2. Breaking The Unbreakable: Bypassing Arkose Labs on iOS
- **URL:** https://dev.to/neverlow512/breaking-the-unbreakable-bypassing-arkose-labs-on-ios-2mnj
- **Author:** Neverlow512
- **Date:** April 2025 (case study from October 2024)
- **GitHub:** https://github.com/Neverlow512/Breaking-the-Unbreakable-iOS-Captcha-Research
- **Summary:** Researcher bypassed Arkose Labs CAPTCHA in an obscured iOS WKWebView using "Orchestrated Visual Relay" — Appium screenshots + Tesseract OCR + external solver API + coordinate tapping. No DOM access needed.
- **Key takeaways:**
  - When DOM is inaccessible, attack moves to the screen layer (screenshots + coordinate taps)
  - OCR reads CAPTCHA state ("Verify", "Try Again", "Verification Complete") — no DOM needed
  - 95%+ per-puzzle success, ~80% end-to-end (timing latency main failure mode)
  - "Client-side isn't enough" — any fingerprinting in the WebView is bypassed because solving happens externally
- **Relevance:** Shows bypass vectors are platform-agnostic; supports "there is no unbreakable" thesis

### 3. Part 1: Frida Diagnostics for Obscured iOS WebViews
- **URL:** https://dev.to/neverlow512/frida-vs-obscured-webview-diagnosing-the-path-to-an-ios-captcha-automation-part-1-5017
- **Author:** Neverlow512
- **Date:** April 2025
- **Summary:** How they diagnosed the obscured WKWebView using Frida, discovered the `window.webkit.messageHandlers` bridge used to relay solved tokens, before pivoting to the Visual Relay approach.
- **Relevance:** Context for article #2 above

---

## Our Own Research / Demo Findings

### Cloudflare Turnstile Bypass — Chromium CDP Approach
- **Repo:** `/Users/max/dev/bsides-demo/`
- **Key script:** `turnstile-bypass.js`
- **Finding:** Real Chrome launched externally + Playwright connecting via CDP = clean fingerprints → Turnstile passes. Playwright-launched Chromium = immediately detected.
- **Root cause:** Chromium bug #40280325 — CDP `Input.dispatchMouseEvent` sets `screenX`/`screenY` relative to iframe, not screen. Turnstile detects via `postMessage()`.
- **Turnstile analytics:** 80% traffic flagged as "likely bot" by analytics layer, but enforcement (the challenge) still passes clean-fingerprint sessions.

### Cloudflare Turnstile Analytics (Feb 22, 2026)
- 46 challenges issued, 9 solved (19.57% "Likely human" / 80.43% "Likely bot")
- Chrome = 37 (CDP bypass + manual), HeadlessChrome = 9 (Playwright-native)
- **Detection without enforcement = the gap.** This is the core talk finding.

---

## Bot Mitigation Products / Services

| Product | Company | Type | Notes |
|---|---|---|---|
| Turnstile | Cloudflare | CAPTCHA | Managed/Invisible modes. Bypassed via real Chrome+CDP |
| Bot Management | Cloudflare | Bot scoring (JA3/JA4 + behavioral) | Closes the enforcement gap Turnstile leaves open |
| reCAPTCHA Enterprise | Google | CAPTCHA + behavioral scoring | Most sophisticated, still bypassable via real browser |
| Arkose Labs FunCaptcha | Arkose Labs | Visual puzzle CAPTCHA | Bypassed via visual relay on iOS |
| 2Captcha / ruCaptcha | — | Human solver service | $1.50-3/1k. API-based. |
| SolveCaptcha | — | AI solver service | $0.55/1k. Neural network-based. |
| Anti-Captcha | — | Human + AI solver | $5/1k. Enterprise-focused. |
| GoLogin / Multilogin | — | Anti-detect browser | Spoofs fingerprints at scale for credential stuffing |
| Residential proxy networks | Various | IP rotation | Defeats IP-based rate limiting |

---

## Breach / Credential Stuffing Context

### Major ATO Incidents (for talk intro)
- **British Airways (2018):** 500k customers, credit card + personal data, £183M GDPR fine
- **23andMe (2023):** 6.9M genetic profiles via credential stuffing against reused passwords
- **Roku (2024):** 576k accounts via credential stuffing, some used to buy hardware fraudulently
- **PayPal (2023):** 35k accounts, credential stuffing, SSNs + financial data exposed

### Combo List Economics
- Leaked credential databases (e.g., Have I Been Pwned has 14B+ records)
- Combo lists (email:password pairs tested across sites) sell for $10-50 on dark web forums
- Attack cost: combo list + proxy pool + CAPTCHA solver = pennies per attempt at scale

---

## Defensive Resources

### Passkeys / FIDO2
- **FIDO Alliance:** https://fidoalliance.org/
- **passkeys.dev:** https://passkeys.dev/ — Developer implementation guide
- **WebAuthn spec:** https://www.w3.org/TR/webauthn/

### Breached Credential Monitoring
- **Have I Been Pwned API:** https://haveibeenpwned.com/API/v3
- **Enzoic:** https://www.enzoic.com/ — Real-time breach credential checks
- **SpyCloud:** https://spycloud.com/ — Continuous breach monitoring

### Bot Detection / Defense
- **Cloudflare Bot Management docs:** https://developers.cloudflare.com/bots/
- **Cloudflare Turnstile docs:** https://developers.cloudflare.com/turnstile/

---

## To Add

- [ ] ChatGPT Agent bypassing Turnstile (July 2025 incident — source/link needed)
- [ ] GoLogin / Multilogin anti-detect browser research
- [ ] Residential proxy network economics article
- [ ] Passkeys adoption statistics (2025)

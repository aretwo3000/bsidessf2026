# The Great Credential Caper — Slide Deck
## BSides SF 2026 | ~35 slides | 40 min + Q&A

**Design language:** Dark background (near-black `#0d0d0d`), accent color deep red/crimson (`#cc2200`), secondary gold (`#f5c842`), white body text. Font: bold sans-serif for headers (e.g., Inter Black or Bebas Neue), clean readable for body. Terminal/monospace for code blocks. Theater/heist aesthetic — we're the villain turned professor.

---

## PART 1 — THE PROBLEM (Slides 1-7, ~5 min)

---

### SLIDE 1 — Title
**Type:** Full-bleed hero image

**Headline:**
```
THE GREAT
CREDENTIAL CAPER
```
**Subhead:** How to Perform — and Then Defend Against — Account Takeover Attacks

**Bottom:** BSides SF 2026 | @letsgochristo

**Design notes:** Theatrical marquee aesthetic. Neon lights, dark stage curtains, spotlight. Like a Broadway heist show poster. Use the generated title-card image.

**Speaker notes:**
> "Good [morning/afternoon]. I'm going to show you something today that I think will ruin the way you feel about that little checkbox that says 'I'm not a robot.' By the end of this talk, you'll never trust it again — and I think that's a good thing."

---

### SLIDE 2 — "It Happened Again" (and Again, and Again)
**Type:** Dark slide, 4-panel breach cards

**Layout:** 2x2 grid of breach cards, each with:
- Company logo / name
- Year
- # accounts compromised
- Attack type: "Credential Stuffing"

**Content:**
```
British Airways     |  2018  |  500K customers   |  Credential-based attack
23andMe            |  2023  |  6.9M accounts    |  Credential stuffing
Roku               |  2024  |  576K accounts    |  Credential stuffing
PayPal             |  2023  |  35K accounts     |  Credential stuffing
```

**Bottom line:** "These aren't sophisticated zero-days. They're username + password combos from old breaches, tried on new sites."

**Speaker notes:**
> "These companies have real security teams, real budgets, real defenses. They still lost. Not because of a novel exploit. Because someone took a list of stolen passwords and tried them. That's it. Credential stuffing."

---

### SLIDE 3 — What Is Credential Stuffing?
**Type:** Simple flow diagram

**Flow:**
```
Old Breach Database
        ↓
Combo List (email:password pairs)
        ↓
Automated Login Bot → [Target Site Login Page]
        ↓
❌ Wrong Password → next
✅ Reused Password → ACCOUNT TAKEOVER
```

**Side stat box:** "65% of people reuse passwords across multiple sites." (Bitwarden 2023 survey)

**Speaker notes:**
> "The attack is embarrassingly simple. Someone leaked your password from LinkedIn in 2016. You used that same password on your streaming service, your bank, your email. The attacker doesn't need to hack you — they already have your password. They just need to find where else it works."

---

### SLIDE 4 — The Economics of Scale
**Type:** Numbers-heavy, punchy

**Big numbers layout:**
```
COMBO LIST:    $10-50 (dark web)
PROXY POOL:    $30 (residential IPs)
CAPTCHA SOLVER: $0.55 / 1,000 solves
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL ATTACK COST:    ~$50
ATTEMPTS:             10,000
SUCCESS RATE:         0.5-2%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAKEOVERS:    50-200 accounts
VALUE/ACCOUNT (streaming): $15-200
POTENTIAL RETURN:   $750 - $40,000
```

**Speaker notes:**
> "The economics are the scariest part. The attacker's entire infrastructure costs less than dinner for two. The returns are... not dinner for two."

---

### SLIDE 5 — Why It's Getting Worse
**Type:** 4 threat vector cards, horizontal row

**Cards:**
1. 🤖 **AI makes bots human-like** — mouse movements, timing, natural language
2. 🎭 **Anti-detect browsers** — GoLogin, Multilogin: unique fingerprint per session
3. 🌐 **Residential proxy networks** — millions of clean home IPs. Your rate limits mean nothing.
4. 📋 **Combo lists are enormous** — Collection #1: 773M unique emails. HIBP: 14B+ records.

**Speaker notes:**
> "In 2018, a bot looked like a bot. Today, with a $200/month anti-detect browser subscription and a residential proxy network, the bot looks exactly like a person in Chicago opening their laptop. Defenders are playing checkers with the same board, attackers switched to chess."

---

### SLIDE 6 — "But We Have Cloudflare Turnstile"
**Type:** Full-bleed screenshot of the Back Stage Pass login page

**Callout bubble:** "The checkbox is supposed to stop bots."

**Bottom text:** "Let me show you something."

**Speaker notes:**
> "Most companies at some point say 'we turned on Cloudflare Turnstile' or 'we have reCAPTCHA' and they feel safe. Today I built a fake streaming service with exactly that protection. I want to show you what happens to it."

---

### SLIDE 7 — Meet Back Stage Pass
**Type:** Product intro slide

**Left:** Screenshot of `bsides.letsgochristo.com` login page (purple marquee design)

**Right:**
```
BACK STAGE PASS
A fictional premium streaming service

Protected by:
✓ Cloudflare Turnstile (bot detection)
✓ Managed widget (the checkbox)

Target credentials:
  username: admin
  password: Password123
```

**Speaker notes:**
> "Back Stage Pass. Premium streaming service, Cloudflare Turnstile protection, nice purple design I'm quite proud of. This is our target. On the second screen you can see the live attack monitor — every login attempt logged in real time."

---

## PART 2 — LIVE DEMO (Slides 8-17, ~15 min)
*Most of this section is live screen, slides are minimal context setters*

---

### SLIDE 8 — Demo 1 Setup: "The Naive Approach"
**Type:** Terminal aesthetic, dark

**Headline:** `$ node turnstile-test.js`

**What it does:**
```
→ Playwright launches its own Chromium
→ Navigates to bsides.letsgochristo.com
→ Finds the Turnstile widget
→ Simulates human mouse movement
→ Clicks the "I'm not a robot" checkbox
```

**Prediction box (gold):** "WILL CLOUDFLARE CATCH IT?"

**Speaker notes:**
> "I've got two scripts. First one: Playwright, the most popular browser automation tool, doing its best to look human. Anti-detection plugins loaded. Realistic user agent. Human-like mouse movement. Let's run it."
>
> [RUN DEMO 1]

---

### SLIDE 9 — [LIVE SCREEN] Demo 1 Running
**Type:** Transition to live demo — blank or just "DEMO 1" title card

*(No content — screen share takes over)*

---

### SLIDE 10 — Demo 1 Result: BLOCKED
**Type:** Red alert slide

**Big text:** ❌ VERIFICATION FAILED

**Screenshot:** Playwright attempt showing "Verification failed" in the Turnstile widget

**Log screenshot:** log.html showing the BLOCKED entry

**Speaker notes:**
> "Blocked. Instantly. Turnstile saw through it immediately. HeadlessChrome browser, Linux OS, no real mouse history — flagged. This is what 'best practice' automation looks like to Cloudflare: a bot. Okay so we're safe, right?"

---

### SLIDE 11 — [PAUSE] How Does Turnstile Know?
**Type:** Technical breakdown, 3 columns

**Headline:** "What Turnstile Is Actually Checking"

| BROWSER FINGERPRINTS | BEHAVIORAL SIGNALS | CDP ARTIFACTS |
|---|---|---|
| Canvas fingerprint | Mouse trajectory | `navigator.webdriver = true` |
| WebGL fingerprint | Click timing | `Runtime.Enable` CDP call |
| Audio context | Time on page | `cdc_*` DOM markers |
| Screen resolution | Scroll patterns | screenX/screenY iframe bug* |
| Plugin list | Keyboard events | — |

**Footnote:** *Chromium bug #40280325 — CDP mouse events report coordinates relative to iframe, not screen. Cloudflare detects this via postMessage().

**Speaker notes:**
> "Turnstile isn't just looking at whether you can click a checkbox. It's analyzing everything about your browser environment. And critically — when Playwright launches Chromium, it injects a bunch of automation signals that Cloudflare can read. There's a specific Chromium bug that leaks mouse coordinate data in a way only automated browsers do. Turnstile checks for it."

---

### SLIDE 12 — Demo 2 Setup: "The Real Approach"
**Type:** Terminal aesthetic, green accent

**Headline:** `$ node turnstile-bypass.js`

**What it does:**
```
→ Launches REAL Google Chrome (not Playwright's Chromium)
→ Connects Playwright via Chrome DevTools Protocol (CDP)
→ Chrome launched with ZERO automation fingerprints
→ Navigates to bsides.letsgochristo.com
→ Simulates human mouse path → clicks checkbox
→ Types credentials with per-keystroke delays
→ Submits login
```

**Key difference (highlighted):**
```
Demo 1: Playwright launches Chromium  → fingerprints injected at startup
Demo 2: Chrome launched independently → no fingerprints, then CDP connects after
```

**Speaker notes:**
> "Here's the thing. If you don't let Playwright launch the browser — if you launch real Chrome yourself and then connect Playwright to it afterward — Chrome doesn't get the automation fingerprints injected. It's a perfectly normal browser. And THEN you connect your automation. Let's see what happens."
>
> [RUN DEMO 2]

---

### SLIDE 13 — [LIVE SCREEN] Demo 2 Running
**Type:** Transition to live demo

*(No content — screen share takes over)*

---

### SLIDE 14 — Demo 2 Result: ACCOUNT TAKEOVER
**Type:** Red/gold dramatic reveal

**Big text:**
```
🔴 ACCOUNT TAKEOVER SUCCESSFUL
```

**Screenshots stacked:**
1. Turnstile green checkmark: "Success!"
2. Dashboard: "ACCOUNT ACCESSED — AI AGENT LOGIN DETECTED"
3. log.html: 🔴 TAKEOVER | source: cdp-bypass

**Speaker notes:**
> "Green checkmark. Credentials accepted. We're on the dashboard. The robot just clicked 'I'm not a robot' — successfully — in front of 400 security engineers. The attack monitor shows the full takeover. Took 30 lines of JavaScript."

---

### SLIDE 15 — The Key Insight
**Type:** Simple, bold

**Big headline:**

```
The browser IS real.
The click IS human-like.
Cloudflare CAN'T tell the difference.
```

**Below:** "The attack doesn't need to be sophisticated. It needs to be real."

**Speaker notes:**
> "This is the key insight. We didn't 'hack' Cloudflare. We didn't find a vulnerability. We just... used a real browser. Cloudflare is checking for bots — but we ARE using a real browser. The detection has no surface to grab onto."

---

### SLIDE 16 — At Scale: What This Looks Like For Real Attackers
**Type:** Architecture diagram

**Components:**
```
Combo List (10K credentials)
         ↓
Credential Stuffing Framework
    ├── GoLogin (unique fingerprint per session)
    ├── Residential Proxy Pool (IP rotation)
    ├── SolveCaptcha API ($0.55/1k solves)
    └── 50 parallel Chrome instances
         ↓
Target Login Endpoints (any site)
         ↓
0.5-2% success rate → 50-200 TAKEOVERS
```

**Cost callout:** "$50 total. A few hours. Repeatable at will."

**Speaker notes:**
> "What we just did manually with one credential — real attackers do with 50 parallel Chrome instances, rotating through unique fingerprints and IP addresses, automatically solving CAPTCHAs for half a cent each. With 10,000 credentials and a 1% success rate, that's 100 account takeovers. From a $50 investment."

---

### SLIDE 17 — (Optional) Turnstile Analytics: Detection Without Enforcement
**Type:** Screenshot + callout

**Left:** Turnstile Analytics screenshot showing 80.43% "Likely bot"
**Right:** Callout boxes:
- "Analytics: 80% flagged as bot 🔴"
- "Challenge enforcement: PASSED ✅"
- Arrow: **This gap is where ATO attacks live**

**Speaker notes:**
> "Here's something wild. After running these tests, I pulled the Turnstile Analytics dashboard. It knows 80% of the traffic is probably a bot. The detection layer works. But the enforcement layer — the challenge — still passes. Cloudflare is sitting there going 'that's probably a bot... come on in.' That gap between detection and enforcement is the attack surface."

---

## PART 3 — WHY THE USUAL DEFENSES FAIL (Slides 18-22, ~5 min)

---

### SLIDE 18 — CAPTCHAs: An Arms Race You Can't Win
**Type:** Split slide

**Left:** "What CAPTCHAs check"
- Browser fingerprints
- Behavioral signals
- Environment signals

**Right:** "What attackers bring"
- Real browsers (identical fingerprints to humans)
- AI-generated mouse movements
- $0.55/1k human solver APIs as fallback

**Bottom:** "The defender needs it to work every time. The attacker needs it to work once per $0.001."

---

### SLIDE 19 — Bot Scoring: Legitimate Browsers Look Legitimate
**Type:** Simple table

| Signal | What Bot Management Checks | What Attacker Has |
|---|---|---|
| TLS fingerprint (JA3/JA4) | Is this Chrome? | ✅ Real Chrome |
| HTTP/2 framing | Normal browser behavior? | ✅ Real Chrome |
| IP reputation | Residential? Clean ASN? | ✅ Residential proxy |
| Behavioral | Human mouse patterns? | ✅ AI-generated |

**Bottom:** "Real Chrome is real Chrome. There's nothing to detect."

---

### SLIDE 20 — Rate Limiting: Defeated by Geometry
**Type:** Visual diagram

**Graphic:** One attacker → 50 different IPs → each makes 1-2 attempts

**Text:** "Rate limiting by IP fails when every IP is different. Rate limiting by account is the only thing that works — and almost no one does it."

---

### SLIDE 21 — WAF: Nothing to Match
**Type:** Code block comparison

```
# SQL Injection (WAF catches this)
username=' OR '1'='1

# Credential Stuffing (WAF sees nothing)
username=jsmith@gmail.com&password=Summer2019!
```

**Text:** "A valid credential POST is indistinguishable from a human login. There's no payload to block."

---

### SLIDE 22 — "But We Have 2FA!"
**Type:** Stats slide

```
Average 2FA enrollment (optional): ~28% of users
         ↓
72% of your users: NO 2FA
         ↓
Those 72% are fully vulnerable
```

**Plus:**
- SMS 2FA: vulnerable to SIM swap
- TOTP apps: still requires a password that can be stuffed
- Product teams push back on mandatory 2FA (friction → churn)

**Speaker notes:**
> "Optional 2FA is a defense for 28% of your users on a good day. The attacker stuffs the other 72% and moves on."

---

## PART 4 — WHAT ACTUALLY WORKS (Slides 23-31, ~10 min)

---

### SLIDE 23 — The Defense Stack
**Type:** Tiered pyramid graphic

```
TIER 1: ELIMINATE THE CREDENTIAL
         Passkeys / WebAuthn
              ↑
TIER 2: DETECT THE COMPROMISE EARLY
     Breach monitoring | Dark web monitoring
              ↑
TIER 3: DETECT THE BEHAVIOR, NOT THE BOT
  Risk-based MFA | Anomaly detection | Trip wires
              ↑
TIER 4: MAKE THE ECONOMICS WORSE
  Per-account rate limiting | Proof-of-work
```

**Speaker notes:**
> "Here's the thing: none of these alone is enough. You stack them. Let's go through each tier."

---

### SLIDE 24 — Tier 1: Passkeys — Eliminate the Lock
**Type:** Hero slide, bold

**Headline:** "No Password = Nothing to Stuff"

**Diagram:**
```
TRADITIONAL:   [Password] ← Stolen in breach → Stuffed on other sites
PASSKEYS:      [Private Key on Device] → Never leaves device → Nothing to steal
```

**Bottom callout:**
- ✅ Google Password Manager (Android + Chrome)
- ✅ iCloud Keychain (Apple devices)
- ✅ 1Password, Bitwarden (cross-platform)
- ✅ YubiKey (hardware, never leaves device)

**Speaker notes:**
> "Passkeys are the only defense that makes credential stuffing mathematically impossible. There's no shared secret. The private key never leaves your device. There's nothing in a breach database, because there's nothing to steal."

---

### SLIDE 25 — Passkeys vs. Authenticator Apps (Honest Comparison)
**Type:** Side-by-side comparison table

| | Passkeys | Authenticator Apps (TOTP) |
|---|---|---|
| Password still exists? | ❌ No | ✅ Yes |
| Can be credential stuffed? | ❌ No | ✅ Yes (password still stuffable) |
| Phishing resistant? | ✅ Yes (site-bound) | ⚠️ Partial |
| Ease of rollout? | 🔶 Complex migration | ✅ Easy |
| User familiarity? | 🔶 Still new | ✅ Well understood |
| Should you do it? | Yes, start now | Yes, do it Monday |

**Bottom line:**
> "Authenticator apps are the bridge. Passkeys are the destination. Start the bridge this week. Plan the destination."

---

### SLIDE 26 — Tier 2: Breached Credential Monitoring
**Type:** API flow diagram

```
User Login Attempt
       ↓
Hash the password (k-anonymity)
       ↓
Check against HIBP API
       ↓
  Known breach?
  YES → Force password reset immediately
  NO  → Proceed with login
```

**Stats box:**
- HIBP API: free, NIST 800-63B recommended
- Enzoic / SpyCloud: real-time breach database, paid
- Catches the attack at the source: the credential itself is known-compromised

**Speaker notes:**
> "This one is criminally underused. Have I Been Pwned has 14 billion breached passwords. At login, you check if the submitted password appears in any known breach. If it does — force a reset. Attack neutralized before it starts. The HIBP API is free. NIST literally recommends it. There's no excuse."

---

### SLIDE 27 — Tier 3: Risk-Based MFA
**Type:** Decision tree

```
Login Attempt
      ↓
Risk signals present?
  - New device fingerprint
  - Unusual geography
  - Dormant account (>90 days)
  - Impossible travel
      ↓
  HIGH RISK: Challenge with MFA
  LOW RISK: Let through (no friction)
```

**Key point:** "Don't MFA every login. MFA the suspicious ones. Users tolerate security when it's invisible most of the time."

---

### SLIDE 28 — Tier 3: Post-Login Trip Wires
**Type:** Alert cards

**Headline:** "Assume they got in. Now what?"

**Trip wire events to monitor:**
```
🚨 Email address changed
🚨 Password changed immediately after login
🚨 New payment method added
🚨 PII section accessed for the first time
🚨 Bulk data export requested
🚨 Shipping address changed
```

**Response:** Step-up verification (confirm via original email + phone) — not just "are you sure?"

**Speaker notes:**
> "Even if the attacker gets past every front-door defense, they still have to do something with the account. Changing email, adding a card, extracting data — these are unusual for legitimate users and easy to trip on."

---

### SLIDE 29 — Tier 4: Per-Account Rate Limiting
**Type:** Simple contrast slide

**DON'T (IP-based):**
```
IP 1.2.3.4 → 5 attempts → BLOCKED
IP 5.6.7.8 → 5 attempts → passes
IP 9.10.11.12 → 5 attempts → passes
...
[50 IPs × 5 attempts = 250 attempts, zero rate limits triggered]
```

**DO (account-based):**
```
jsmith@gmail.com → 1 attempt → OK
jsmith@gmail.com → 2nd attempt → delay
jsmith@gmail.com → 5th attempt → locked + email alert
```

**Text:** "Rate limit per account. The attacker's IP rotation doesn't matter if the account locks after 5 tries."

---

### SLIDE 30 — Tier 4: Proof-of-Work
**Type:** Math slide

```
Proof-of-work challenge: 50ms computation per login attempt

Single user: imperceptible
100 logins: 5 seconds total — no problem

Attacker with 100,000 attempts: 
100,000 × 50ms = 5,000 seconds of compute
Across 50 parallel instances: still costly

Raises attacker cost without impacting real users
```

**Speaker notes:**
> "Hashcash-style proof-of-work doesn't stop attackers — it raises their cost. Combined with CAPTCHA and account rate limiting, you make the attack expensive enough that easier targets look more attractive."

---

## PART 5 — THE UNCOMFORTABLE TRUTH (Slides 31-35, ~5 min)

---

### SLIDE 31 — There Is No Silver Bullet
**Type:** Bold, honest

**Big text:**
```
Every defense except passkeys
is mitigation, not elimination.

The attacker will always have:
→ Real browsers
→ Real IPs
→ Real credentials
```

**Bottom:** "The question isn't 'how do I stop credential stuffing?' It's 'how do I make my accounts not worth stuffing?'"

---

### SLIDE 32 — What To Do Monday Morning
**Type:** Action list, checkboxes

```
☐ 1. Check if you're verifying passwords against breach databases
      → Integrate HIBP API. A few hours. Do it.

☐ 2. Check your MFA enrollment rate
      → If it's <50%, you have a problem. Push authenticator apps hard.

☐ 3. Start a passkey rollout
      → Optional first. Every passkey user is unstuffable.

☐ 4. Add post-login trip wires
      → Alert on email/password changes, new payment methods, unusual access.

☐ 5. Stop buying more CAPTCHA
      → We proved today it won't save you.
```

---

### SLIDE 33 — The Value vs. Friction Framework
**Type:** Spectrum diagram

**Axis:** Low Friction ←────────────────→ High Friction

```
CONSUMER STREAMING              HEALTHCARE / BANKING
     ↓                                    ↓
Breach checks                      Mandatory passkeys
+ Optional authenticator app       + Hardware key option
+ Post-login trip wires            + Behavioral analytics
+ Account rate limiting            + Zero password fallback
```

**The question:** "What are you protecting? How valuable is it? How much friction will your users accept?"

**Speaker notes:**
> "There's no universal answer. A streaming service with 50M users cannot mandate Yubikeys. A crypto exchange absolutely should. Pick the friction ceiling your users and your product will tolerate. Then stack every defense that fits under it."

---

### SLIDE 34 — Close
**Type:** Dark, theatrical — callback to the opening

**Big text:**
```
"The Great Credential Caper isn't great
because it's clever.

It's great because it's simple."
```

**Below:**
> A real browser. A list of passwords. A checkbox click.
>
> The defense isn't a better wall.
> It's making the credential worthless
> before the attacker reaches the wall.

---

### SLIDE 35 — Final CTA + Resources
**Type:** Clean resource slide

```
THANK YOU

Demo app:    bsides.letsgochristo.com
Code:        github.com/letsgochristo/bsides-demo
Research:    RESOURCES.md (in the repo)

Breach monitoring: haveibeenpwned.com/API
Passkeys:          passkeys.dev
Talk abstract:     [Google Doc link]

@letsgochristo
```

**Speaker notes:**
> "The demo app is live. The code is open. If you want to try the bypass yourself, it's all there. Thanks — I'll take questions."

---

## CANVA BUILD GUIDE

### How to build this in Canva (for ChatGPT + Canva session)

**Prompt for ChatGPT to use with Canva:**

```
I need to build a 35-slide cybersecurity conference presentation in Canva for a BSides SF 2026 talk called "The Great Credential Caper."

Design language:
- Dark background: #0d0d0d (near black)
- Primary accent: #cc2200 (deep crimson red)
- Secondary accent: #f5c842 (gold/yellow)
- Body text: white (#ffffff)
- Code blocks: monospace font, #00ff88 (green) on #1a1a1a
- Headers: Bold sans-serif (Bebas Neue or Inter Black)
- Body: Inter Regular or similar clean sans
- Overall vibe: theater marquee meets hacker terminal. Dark and dramatic.

Create a custom template/theme with:
1. A "hero" slide layout (full-bleed dark image, big centered title)
2. A "content" slide layout (dark bg, left-align headline, body area, accent bar on left)
3. A "two-column" layout (dark bg, two equal columns with white divider)
4. A "code/terminal" layout (dark bg, green monospace text box filling most of slide)
5. A "stats/numbers" layout (big bold red numbers, dark bg)

Slides to build [see SLIDES.md for full content for each]:
- Slides 1-7: Part 1 "The Problem"
- Slides 8-17: Part 2 "Live Demo" (several are just title cards for transitions)
- Slides 18-22: Part 3 "Why Defenses Fail"
- Slides 23-30: Part 4 "What Actually Works"
- Slides 31-35: Part 5 "The Uncomfortable Truth"
```

### Specific Canva slide notes by section:

**Title slide (Slide 1):**
Use the generated theatrical hero image as background. Text overlay: "THE GREAT CREDENTIAL CAPER" in Bebas Neue or bold condensed font, white. Subtitle below in smaller Inter.

**Breach cards (Slide 2):**
2x2 grid layout. Each card: dark gray background with thin crimson border. Company name bold white, year in gold, stat in large white, "Credential Stuffing" label in red badge.

**Flow diagrams (Slides 3, 26, 27):**
Use Canva's flowchart elements. Dark backgrounds for boxes, crimson arrows, white text. Keep it clean — 4-6 steps max per diagram.

**Code/terminal slides (Slides 8, 12):**
Near-black background (#0d0d0d), green (#00ff88) monospace text. Add subtle scanline texture if available. Use Canva's "code block" element or a dark rectangle with Code New Roman / Source Code Pro font.

**Stats slides (Slide 4):**
Big bold numbers in gold/crimson. Minimal decoration. Let the numbers breathe.

**Table slides (Slides 19, 25):**
Alternating row colors: #1a1a1a and #222222. Header row: crimson bg, white bold text. Checkmarks/X marks as actual emoji or icon elements.

**Pyramid slide (Slide 23):**
Build as stacked trapezoids in Canva shapes. Bottom tier = lightest red, top tier = darkest. White text labels.

---

## SPEAKER NOTES CHEAT SHEET

### Timing guide
- Aim for ~8 slides/minute in Part 1
- Parts 2 is mostly live screen time, slides are just context cards
- Parts 3-4 are your technical depth — take your time
- Part 5 is your emotional close — slow down

### Demo contingency
**If turnstile-bypass.js fails on stage:**
> "Technology, right? This is why security teams actually need to be concerned — the real attackers don't have a conference audience watching them. They get unlimited retries."
> 
> Then show the screenshots saved in the repo (`demo-turnstile-passed.png`, `demo-final.png`) as evidence it works.

**If the site is down:**
> Run on localhost: `npm run dev` and use `http://localhost:8788` — update the script URL.

### Energy notes
- Part 1: Build tension. These breaches should feel real and nearby.
- Part 2: This is the show. Bring theater energy. The audience should feel the "wait, that actually worked?!" moment.
- Part 3: Fast and punchy. One slide per failed defense. Don't dwell.
- Part 4: Shift from villain to professor. Slower, more earnest.
- Part 5: Human and honest. "No silver bullet" should feel like a real conversation, not a cop-out.

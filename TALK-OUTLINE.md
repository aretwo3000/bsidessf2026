# The Great Credential Caper
## How to Perform — and Then Defend Against (the Nearly Impossible to Defend Against) — Account Takeover Attacks
### BSides SF 2026 — Talk Outline

---

## PART 1: The Problem (5 min)

### Open with the stakes
- British Airways breach — $250M fine. Credential-based attack.
- 23andMe — 6.9M accounts compromised via credential stuffing (2023)
- Roku — 576K accounts taken over, sold on dark markets (2024)
- PayPal — 35K accounts stuffed (2023)
- These aren't sophisticated zero-days. These are username + password combos from old breaches, tried on new sites. That's it.

### What is credential stuffing?
- Attacker buys combo lists (breached email/password pairs) — billions available
- Automates login attempts against target sites
- Any account where the user reused their password is vulnerable
- Successful logins → account takeover → sell access, steal payment info, drain accounts

### Why it's getting worse, not better
- AI tools make automation more human-like
- Anti-detect browsers (GoLogin, Multilogin, AdsPower) create unique fingerprints per session
- Residential proxy networks provide millions of clean IPs
- Combo lists are cheap and massive (Collection #1 alone had 773M unique emails)
- The economics: attack cost is near zero, payoff per successful takeover is high

---

## PART 2: Live Demo — The Attack (15 min)

### Setup
- **Screen 1:** The attacker's terminal / browser
- **Screen 2:** Live attack monitor (`/log.html`) — the audience watches attempts in real time

### Target: "Back Stage Pass" — a fictional premium streaming service
- Show the login page (`bsides.letsgochristo.com`)
- Point out: Cloudflare Turnstile is protecting it (bot detection checkbox)
- "This is what most companies think is enough."

### Demo 1: Naive automation gets caught
```bash
node turnstile-test.js
```
- Playwright launches its own Chromium
- Clicks the Turnstile checkbox
- **Result: "Verification failed"** — red error, blocked instantly
- Show `/log.html` — attempt logged as BLOCKED
- "Okay, so Turnstile works. We're safe, right?"

### Demo 2: Real Chrome bypass — Turnstile falls
```bash
node turnstile-bypass.js
```
- Script launches a real Google Chrome (not Playwright's Chromium)
- Connects via Chrome DevTools Protocol
- Clicks the same Turnstile checkbox
- **Result: Green checkmark — "Success!"**
- Types `admin` / `Password123`
- Clicks "Enter the Stage"
- **Lands on dashboard — "ACCOUNT ACCESSED — AI AGENT LOGIN DETECTED"**
- Show `/log.html` — attempt logged as 🔴 TAKEOVER, source: `cdp-bypass`

### The reveal: why this works
- Playwright injects automation fingerprints at browser launch (`navigator.webdriver`, CDP `Runtime.Enable` leak, `cdc_` markers)
- A real Chrome launched independently has NONE of those signals
- Turnstile sees a normal browser, a normal mouse click, a normal human → passes
- The attacker doesn't need to be sophisticated. 30 lines of code.

### Escalation: what this looks like at scale (talk through, no live demo)
- Swap in a combo list of 10K breached credentials instead of `admin/Password123`
- Route each attempt through a different residential IP (Bright Data, SOAX, etc.)
- Use GoLogin or Multilogin for unique browser fingerprints per attempt
- Run 50 parallel sessions, low-and-slow (2-3 attempts/min per IP)
- Success rate on reused passwords: historically 0.5-2% → 50-200 takeovers from 10K pairs
- Total cost: ~$50 in proxies + a free combo list
- Time: a few hours

### (Optional) Show Cloudflare Turnstile Analytics
- Even when Turnstile passes the challenge, the analytics dashboard flags 80% of the traffic as "Likely bot"
- **But it still let the challenge through** — detection without enforcement
- Show Bot Management scores (if enabled by demo day): real Chrome gets a high human-likeness score

---

## PART 3: Why the Usual Defenses Fail (5 min)

### CAPTCHAs / Turnstile
- Designed to distinguish humans from bots at the browser level
- But the browser IS a real browser — anti-detect browsers are indistinguishable
- We just proved it: same browser, same click, different launch method → passes
- Arms race the defender cannot win

### Bot scoring / Bot Management
- Looks at TLS fingerprint (JA3/JA4), HTTP/2 framing, behavioral signals
- Real Chrome has legitimate fingerprints → high "human" score
- Residential IPs have clean reputation → not flagged
- The attacker doesn't look different from a user

### Rate limiting by IP
- Residential proxy networks have millions of IPs
- Each IP makes 1-2 attempts → never trips rate limits
- Attacker can spread across ASNs, geographies, ISPs

### WAF rules
- Pattern matching on payloads — but the payload is a normal login POST
- No SQL injection, no XSS — just a username and password
- Nothing to match on

### "But we have 2FA!"
- Most sites don't enforce it — it's optional, and <30% of users enable it
- SMS 2FA is vulnerable to SIM swap
- Friction means product teams push back on mandatory enrollment
- Even with 2FA: the 70% of users without it are still vulnerable

---

## PART 4: What Actually Works (10 min)

### Tier 1: Eliminate the credential (the real answer)

**Passkeys / WebAuthn — "there's no lock to pick"**
- No password exists → nothing to stuff → credential stuffing is mathematically impossible
- Your device holds a private key; the server only has the public key. Nothing shared, nothing to leak.
- Phishing-resistant, replay-resistant, per-site unique
- Where passkeys live today:
  - **Google Password Manager** — syncs across Android + Chrome
  - **iCloud Keychain** — syncs across Apple devices
  - **Hardware keys** (Yubikey, Titan Key) — private key never leaves the physical device
  - **Password managers** (1Password, Dashlane, Bitwarden) — now support passkey storage
- Supported by Apple, Google, Microsoft — built into every major OS and browser
- The only defense that makes the attack category disappear, not just harder
- Challenge: adoption is still early, migration is complex, not all users have compatible devices

**Authenticator apps (TOTP) — "the lock is still pickable, but there's a second lock"**
- Google Authenticator, Authy, Microsoft Authenticator, etc.
- Generate a rotating 6-digit code as a second factor
- Important distinction from passkeys: the password still exists and can still be stuffed — the authenticator is a second layer on top
- The attacker can't complete the login without the code, but the credential is still vulnerable
- Realistic "do this Monday" advice — much easier to roll out than passkeys
- Weakness: most users don't enable it unless forced (<30% voluntary enrollment)
- Better than nothing, but it's mitigation — passkeys are elimination

### Tier 2: Detect the compromise before the attack

**Breached credential monitoring**
- Check every login attempt against known breach databases (Have I Been Pwned API, Enzoic, SpyCloud)
- If the email/password pair has appeared in a breach → force password reset immediately
- NIST 800-63B recommends this
- Cheap ($0-$3.50/month for HIBP API), extremely effective, criminally underused
- Catches the attack at the source: the credential itself is known-compromised

**Dark web monitoring**
- Services like SpyCloud, Recorded Future, Flare actively scrape dark web markets for stolen credentials
- Can alert when your users' credentials appear for sale
- Proactive: reset before the attacker buys the list

### Tier 3: Detect the behavior, not the bot

**Risk-based / adaptive MFA**
- Don't MFA every login (friction)
- Challenge only when risk signals are present: new device, new location, dormant account, impossible travel
- Balances security with user experience
- Most identity providers support this (Okta, Auth0, Azure AD)

**Account-level anomaly detection**
- Stop trying to detect the BOT — detect the BEHAVIOR
- New device fingerprint on a dormant account
- Login from an unusual geography
- Immediate access to payment info or PII after login
- Session behavior that doesn't match the user's history (page navigation patterns, time-on-page)

**Post-login trip wires**
- Even if they get in, detect what they DO:
  - Changing email, phone, or password immediately after login
  - Adding new payment methods
  - Exporting account data
  - Accessing sensitive sections for the first time
- These actions are unusual for legitimate users and should trigger step-up verification

### Tier 4: Make the economics worse for attackers

**Credential stuffing-specific rate limiting**
- Rate limit per ACCOUNT, not per IP (defeats proxy rotation)
- Progressive delays: 1st failed attempt = instant, 5th = 30 sec wait, 10th = account locked + email alert
- Track login velocity across the entire endpoint: a spike in failed logins across many accounts = stuffing attack in progress

**Proof-of-work challenges**
- Make each login attempt computationally expensive (e.g., Hashcash-style)
- Negligible cost for a single login, but multiplied across 100K attempts = significant cost to the attacker
- Shifts the economics: attack is no longer free

---

## PART 5: The Uncomfortable Truth + Call to Action (5 min)

### Be honest with the audience
- There is no silver bullet
- Every defense except passkeys is mitigation, not elimination
- The attacker will always have real browsers, real IPs, and real credentials
- The industry's obsession with "stop the bot at the login page" is a losing strategy
- The defense has to be everywhere: before the attack (breach monitoring), at the login (risk-based MFA), and after the login (behavior monitoring)

### What to do Monday morning
1. **Check if your login endpoint is checking passwords against breach databases.** If not, integrate HIBP API — it's a few hours of work and immediately neutralizes the most common attack vector.
2. **Look at your MFA enrollment rate.** If it's <50%, you have a credential stuffing problem whether you know it or not. Push authenticator app enrollment hard — it's the fastest win.
3. **Start a passkey rollout.** Even optional at first. Every user on passkeys is one account that can never be stuffed. Authenticator apps are the bridge; passkeys are the destination.
4. **Add post-login trip wires.** Alert on email/password changes, new payment methods, unusual data access. This catches what the front door defenses miss.
5. **Stop buying more CAPTCHA.** It's not going to save you. We proved that today.

### The honest framework: value vs. friction
- There's no universal answer. It depends on three things:
  1. **What are you protecting?** A streaming account vs. a bank account vs. a health record — wildly different risk profiles
  2. **How valuable is it to an attacker?** Payment info, PII, crypto wallets → high value → high effort from attackers → you need stronger defenses
  3. **Who are your users and what friction will they accept?** A developer tool can mandate Yubikeys. A consumer streaming app with 50M users cannot. A healthcare portal might legally need to.
- The right answer is a spectrum:
  - Low-value consumer service → breached credential checks + optional authenticator app + post-login trip wires
  - Mid-value (e-commerce, streaming with payment data) → risk-based MFA + breach monitoring + passkey option
  - High-value (banking, healthcare, crypto) → mandatory passkeys or hardware keys, no password fallback, behavioral analytics
- "Pick the friction your users will tolerate, then stack every defense that fits under that ceiling."

### Close
- "The Great Credential Caper isn't great because it's clever. It's great because it's simple. A real browser, a list of passwords, and a checkbox click. That's all it takes."
- "The defense isn't a better wall. It's making the credential worthless before the attacker ever gets to the wall."
- "Know what you're protecting, know who you're protecting it for, and choose accordingly. But whatever you choose — stop relying on the checkbox."

---

## Timing

| Section | Minutes |
|---|---|
| Part 1: The Problem | 5 |
| Part 2: Live Demo | 15 |
| Part 3: Why Defenses Fail | 5 |
| Part 4: What Actually Works | 10 |
| Part 5: Truth + Call to Action | 5 |
| **Total** | **40 min** |
| Q&A | 10-15 min |

---

## Demo checklist (day of)

```bash
# Before the talk
cd /Users/max/dev/bsides-demo
npm run reset-log                    # clean attack log
open https://bsides.letsgochristo.com/log.html   # second screen

# Demo 1: Playwright gets blocked
node turnstile-test.js

# Demo 2: CDP bypass succeeds
lsof -ti:9222 | xargs kill -9 2>/dev/null
rm -rf /tmp/bsides-chrome-profile
node turnstile-bypass.js
```

Make sure Google Chrome is installed and no other Chrome instances are using port 9222.

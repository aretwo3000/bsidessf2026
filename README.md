# BSides SF 2026 Demo — "The Great Credential Caper"
## bsides.letsgochristo.com

Cloudflare Pages + Workers + KV. No server needed.

## Quick Deploy (15 min)

### 1. Create KV namespace
```bash
cd /Users/max/dev/bsides-demo
wrangler kv namespace create "ATTACK_LOG"
wrangler kv namespace create "ATTACK_LOG" --preview
```
Copy the two IDs into `wrangler.toml`.

### 2. Set up Turnstile
1. dash.cloudflare.com → Turnstile → Add Site
2. Domain: `bsides.letsgochristo.com`, Widget type: **Managed**
3. Copy Site Key → paste into `public/index.html` (replace `REPLACE_WITH_TURNSTILE_SITE_KEY`)
4. Copy Secret Key:
```bash
wrangler pages secret put TURNSTILE_SECRET
```

### 3. Deploy
```bash
npm install
wrangler pages deploy public --project-name=bsides-demo
```
Then in Cloudflare Pages dashboard: set custom domain `bsides.letsgochristo.com` + bind KV.

### 4. Test locally
```bash
npm run dev   # http://localhost:8788
```

## Demo URLs
- `/` — Login page (the target)
- `/dashboard.html` — Post-takeover page
- `/log.html` — Live attack monitor (show this on second screen!)

## Reset between demo runs
```bash
curl -X DELETE https://bsides.letsgochristo.com/api/log
```

## Demo credentials
- Username: `admin`
- Password: `Password123`

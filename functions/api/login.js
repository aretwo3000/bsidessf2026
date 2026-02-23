/**
 * POST /api/login
 * BSides SF 2026 Demo — The Great Credential Caper
 */
export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || '';
  const country = request.headers.get('CF-IPCountry') || '??';
  const ts = Date.now();

  // Tag source: automated scripts set a "demo-source" cookie before submitting
  const cookies = request.headers.get('Cookie') || '';
  const sourceMatch = cookies.match(/demo-source=([^;]+)/);
  const source = sourceMatch ? decodeURIComponent(sourceMatch[1]) : 'human';

  // Bot Management (requires Enterprise or PAYG with Bot Management add-on)
  const cf = request.cf || {};
  const botManagement = cf.botManagement || {};
  const botScore = botManagement.score ?? null;           // 1 = bot, 99 = human
  const botVerified = botManagement.verifiedBot ?? null;  // known good bot (Google, etc.)
  const ja3Hash = botManagement.ja3Hash ?? cf.ja3Hash ?? null;

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ success: false, message: 'Invalid request.' }, 400); }

  const { username, password, turnstile: turnstileToken } = body;

  // Validate Cloudflare Turnstile
  let turnstilePassed = false;
  if (turnstileToken) {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: turnstileToken, remoteip: ip }),
    });
    turnstilePassed = (await verifyRes.json()).success === true;
  }

  // Check credentials
  const validUsername = env.DEMO_USERNAME || 'admin';
  const validPassword = env.DEMO_PASSWORD || 'Password123';
  const credentialsValid = username?.toLowerCase() === validUsername.toLowerCase() && password === validPassword;
  const success = turnstilePassed && credentialsValid;

  // Log to KV
  try {
    let existing = [];
    try { const raw = await env.ATTACK_LOG.get('entries'); if (raw) existing = JSON.parse(raw); } catch {}
    existing.unshift({ ts, username: username || '', password: password || '', ip, ua, country, turnstilePassed, credentialsValid, success, botScore, botVerified, ja3Hash, source });
    if (existing.length > 200) existing = existing.slice(0, 200);
    await env.ATTACK_LOG.put('entries', JSON.stringify(existing));
  } catch(e) { console.error('KV error:', e); }

  if (!turnstilePassed) return jsonResponse({ success: false, message: 'Security check failed. Please try again.' });
  if (!credentialsValid) return jsonResponse({ success: false, message: 'Invalid username or password.' });
  return jsonResponse({ success: true, message: 'Login successful.', user: username });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}

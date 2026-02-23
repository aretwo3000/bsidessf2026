/**
 * GET /api/log — fetch attack log
 * DELETE /api/log — reset log
 */
export async function onRequestGet({ env }) {
  try {
    const raw = await env.ATTACK_LOG.get('entries');
    return new Response(JSON.stringify({ entries: raw ? JSON.parse(raw) : [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
    });
  } catch(e) {
    return new Response(JSON.stringify({ entries: [], error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestDelete({ env }) {
  await env.ATTACK_LOG.put('entries', '[]');
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// Mantém o projeto Supabase gratuito ativo (ele pausa após dias sem uso e o app fica fora do ar).
// Chamado 1x por dia pelo Cron da Vercel (vercel.json). Faz uma consulta leve e pública.
const SUPABASE_URL = 'https://fxfpvqzyfopemdxllosn.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_0J8z-SBeN0CJC2jBc0OYmg_QoEobzU9';

export default async function handler(req, res) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/server_now`, {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' },
      body: '{}',
    });
    const body = await r.text();
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabase: r.status, at: body });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
}

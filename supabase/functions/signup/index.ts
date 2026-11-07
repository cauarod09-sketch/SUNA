// SUNA · Edge Function `signup`
// Cria a conta já ativa (sem e-mail de confirmação), mas SOMENTE para e-mails com compra aprovada.
// O app chama esta função no cadastro e, em seguida, faz login com e-mail e senha.
// A trava do banco (gatilho suna_gate_signup em auth.users) continua valendo como segunda barreira.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return json({ error: 'server' }, 503);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid' }, 400);
  }
  const name = String(body?.name ?? '').trim().slice(0, 80);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (name.length < 2) return json({ error: 'name' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json({ error: 'email' }, 400);
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return json({ error: 'weak_password' }, 400);

  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { data: bought, error: pe } = await admin.from('purchases').select('id').eq('email', email).eq('status', 'approved').limit(1);
  if (pe) return json({ error: 'server' }, 500);
  if (!bought?.length) return json({ error: 'no_purchase' }, 403);

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('already') || m.includes('registered') || m.includes('exists')) return json({ error: 'exists' }, 409);
    if (m.includes('password')) return json({ error: 'weak_password' }, 400);
    if (m.includes('suna_no_purchase') || m.includes('database error')) return json({ error: 'no_purchase' }, 403);
    return json({ error: 'server' }, 500);
  }
  return json({ ok: true });
});

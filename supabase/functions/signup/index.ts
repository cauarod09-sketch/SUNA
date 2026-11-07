// SUNA · Edge Function `signup`
// Cria a conta já ativa, sem e-mail de confirmação e sem verificação de compra.
// O acesso ao app é distribuído só para quem comprou (fora do app); o Supabase apenas guarda contas e registros.
// O app chama esta função no cadastro e, em seguida, faz login com e-mail e senha.
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
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('already') || m.includes('registered') || m.includes('exists')) return json({ error: 'exists' }, 409);
    if (m.includes('password')) return json({ error: 'weak_password' }, 400);
    return json({ error: 'server' }, 500);
  }
  return json({ ok: true });
});

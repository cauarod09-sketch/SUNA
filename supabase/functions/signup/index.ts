// SUNA · Edge Function `signup` (acesso livre — decisão do produto, autorizada pela dona do app em 24/11/2026)
// Garante que exista uma conta ativa com este e-mail e esta senha:
//  • e-mail novo  → cria a conta já ativa (sem e-mail de confirmação);
//  • e-mail que já existe → atualiza a senha para a informada.
// Assim qualquer e-mail + senha sempre entra. Atenção: quem souber o e-mail de uma usuária consegue entrar na conta dela.
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
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const name = String(body?.name ?? '').trim().slice(0, 80) || email.split('@')[0].slice(0, 80);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'email' }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: 'weak_password' }, 400);

  const admin = createClient(url, service, { auth: { persistSession: false } });

  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (!created.error) return json({ ok: true, created: true });

  const m = created.error.message.toLowerCase();
  if (!(m.includes('already') || m.includes('registered') || m.includes('exists'))) {
    if (m.includes('password')) return json({ error: 'weak_password' }, 400);
    return json({ error: 'server' }, 500);
  }

  // E-mail já cadastrado: libera o acesso atualizando a senha para a informada.
  const { data: id, error: le } = await admin.rpc('suna_user_id_by_email', { p_email: email });
  if (le || !id) return json({ error: 'server' }, 500);
  const upd = await admin.auth.admin.updateUserById(String(id), { password, email_confirm: true });
  if (upd.error) {
    if (upd.error.message.toLowerCase().includes('password')) return json({ error: 'weak_password' }, 400);
    return json({ error: 'server' }, 500);
  }
  return json({ ok: true, created: false });
});

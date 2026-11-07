// SUNA · Edge Function `purchase-webhook`
// Recebe a notificação da plataforma de pagamento e registra/revoga a compra em `public.purchases`.
// O app NUNCA libera acesso por conta própria: só o que chega aqui (ou é inserido no painel) vale.
//
// Plataformas suportadas:
//  • Hotmart  — header `X-HOTMART-HOTTOK` igual ao secret HOTMART_HOTTOK.
//  • Kiwify   — query `?signature=` = HMAC-SHA1 do corpo bruto com o secret KIWIFY_TOKEN.
//  • Genérico — header `x-suna-token` igual ao secret SUNA_WEBHOOK_TOKEN,
//               corpo JSON { "email": "...", "order_id": "...", "status": "approved" | "refunded" | "chargeback" | "canceled" }.
// Opcional: SUNA_PRODUCT_IDS="123,abc" restringe a produtos específicos (Hotmart product.id / Kiwify Product.product_id).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type Status = 'approved' | 'refunded' | 'chargeback' | 'canceled';

const enc = new TextEncoder();

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(algo: 'SHA-1' | 'SHA-256', secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: algo }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

// deno-lint-ignore no-explicit-any
type Json = any;

function hotmart(body: Json): { email: string; orderId: string; status: Status | null; productId: string } {
  const ev = String(body?.event ?? '').toUpperCase();
  const map: Record<string, Status> = {
    PURCHASE_APPROVED: 'approved',
    PURCHASE_COMPLETE: 'approved',
    PURCHASE_REFUNDED: 'refunded',
    PURCHASE_CHARGEBACK: 'chargeback',
    PURCHASE_CANCELED: 'canceled',
    PURCHASE_PROTEST: 'chargeback',
  };
  return {
    email: String(body?.data?.buyer?.email ?? ''),
    orderId: String(body?.data?.purchase?.transaction ?? ''),
    status: map[ev] ?? null,
    productId: String(body?.data?.product?.id ?? ''),
  };
}

function kiwify(body: Json): { email: string; orderId: string; status: Status | null; productId: string } {
  const st = String(body?.order_status ?? '').toLowerCase();
  const map: Record<string, Status> = { paid: 'approved', approved: 'approved', refunded: 'refunded', chargedback: 'chargeback', canceled: 'canceled' };
  return {
    email: String(body?.Customer?.email ?? ''),
    orderId: String(body?.order_id ?? ''),
    status: map[st] ?? null,
    productId: String(body?.Product?.product_id ?? ''),
  };
}

function generic(body: Json): { email: string; orderId: string; status: Status | null; productId: string } {
  const st = String(body?.status ?? '').toLowerCase();
  const ok: Status[] = ['approved', 'refunded', 'chargeback', 'canceled'];
  return {
    email: String(body?.email ?? ''),
    orderId: String(body?.order_id ?? ''),
    status: ok.includes(st as Status) ? (st as Status) : st === 'paid' ? 'approved' : null,
    productId: String(body?.product_id ?? ''),
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const hottok = Deno.env.get('HOTMART_HOTTOK') ?? '';
  const kiwifyToken = Deno.env.get('KIWIFY_TOKEN') ?? '';
  const genericToken = Deno.env.get('SUNA_WEBHOOK_TOKEN') ?? '';
  if (!url || !service || (!hottok && !kiwifyToken && !genericToken)) return new Response('Webhook não configurado', { status: 503 });

  const raw = await req.text();
  const reqUrl = new URL(req.url);

  // 1) Autenticação da origem
  let source: 'hotmart' | 'kiwify' | 'generic' | null = null;
  const hotHeader = req.headers.get('x-hotmart-hottok') ?? '';
  const kiwiSig = reqUrl.searchParams.get('signature') ?? '';
  const genHeader = req.headers.get('x-suna-token') ?? '';
  if (hottok && hotHeader && safeEqual(hotHeader, hottok)) source = 'hotmart';
  else if (kiwifyToken && kiwiSig && safeEqual(kiwiSig.toLowerCase(), await hmacHex('SHA-1', kiwifyToken, raw))) source = 'kiwify';
  else if (genericToken && genHeader && safeEqual(genHeader, genericToken)) source = 'generic';
  if (!source) return new Response('Unauthorized', { status: 401 });

  // 2) Leitura do evento
  let body: Json;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  const parsed = source === 'hotmart' ? hotmart(body) : source === 'kiwify' ? kiwify(body) : generic(body);
  const email = parsed.email.trim().toLowerCase();
  if (!parsed.status) return Response.json({ ok: true, ignored: 'evento sem efeito no acesso' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return new Response('E-mail inválido', { status: 400 });
  if (!parsed.orderId || parsed.orderId.length > 200) return new Response('Pedido inválido', { status: 400 });

  const allowed = (Deno.env.get('SUNA_PRODUCT_IDS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(parsed.productId)) return Response.json({ ok: true, ignored: 'outro produto' });

  // 3) Grava (idempotente por plataforma + pedido)
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await admin
    .from('purchases')
    .upsert({ email, source, order_id: parsed.orderId, status: parsed.status, raw: body }, { onConflict: 'source,order_id' });
  if (error) return new Response('Erro ao gravar', { status: 500 });

  return Response.json({ ok: true, status: parsed.status });
});

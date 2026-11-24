// Camada de dados da SUNA.
// Produção: Supabase (Auth + Postgres com RLS). A data do servidor decide o dia liberado.
// Demonstração (VITE_DEMO_MODE=true): tudo fica no navegador, sem servidor. Não publicar assim.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEMO_MODE, SUPABASE_ANON_KEY, SUPABASE_URL, TOTAL_DAYS } from '../config';
import { rawJourneyDay, spDateKey } from './time';
import type { AccessState, BootstrapResult, DayPatch, DayRecord, Profile } from './types';
import { emptyRecord } from './types';

export interface Session {
  userId: string;
  email: string;
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'OTHER';

export interface Backend {
  mode: 'supabase' | 'demo';
  getSession(): Promise<Session | null>;
  onAuth(cb: (event: AuthEvent, session: Session | null) => void): () => void;
  /**
   * Acesso livre: entra com qualquer e-mail + senha. Se a conta não existir, é criada;
   * se existir com outra senha, a senha é atualizada. Lança OfflineError sem conexão com o servidor.
   */
  enter(email: string, password: string, name?: string): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  bootstrap(): Promise<BootstrapResult>;
  serverNow(): Promise<number>;
  saveDay(day: number, patch: DayPatch): Promise<void>;
  updateProfile(patch: Partial<Pick<Profile, 'name' | 'onboarding_done' | 'gpt_opened_at'>>): Promise<void>;
}

/** Erros com mensagem pronta para a usuária. */
export class FriendlyError extends Error {}

/** Servidor inalcançável (sem internet, rede ruim ou servidor fora do ar). O app segue funcionando no aparelho. */
export class OfflineError extends Error {}

const TIMEOUT_MS = 12_000;

export function withTimeout<T>(p: PromiseLike<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise<T>((ok, fail) => {
    const t = setTimeout(() => fail(new OfflineError('timeout')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        ok(v);
      },
      (e) => {
        clearTimeout(t);
        fail(e);
      },
    );
  });
}

/** Erro de rede/servidor (não é erro de dados da usuária). */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof OfflineError) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const err = e as { name?: string; message?: string; status?: number; code?: string } | null;
  if (!err) return false;
  const msg = String(err.message ?? '').toLowerCase();
  if (err.name === 'AuthRetryableFetchError' || err.name === 'TypeError') return true;
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed') || msg.includes('timeout')) return true;
  if (typeof err.status === 'number' && (err.status === 0 || err.status >= 500)) return true;
  return false;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tenta de novo em falhas de rede (até 3 tentativas). */
async function retry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isNetworkError(e)) throw e;
      if (i < 2) await wait(800 * (i + 1));
    }
  }
  throw new OfflineError(String((last as Error)?.message ?? 'offline'));
}

const DAY_COLUMNS =
  'day,mood,conversation_at,challenge_revealed_at,challenge_done_at,meal,activity,group_update,habits,water_ml,sleep_hours,note,objective,achievements,challenge_text';

function normalizeRecord(row: Record<string, unknown>): DayRecord {
  const base = emptyRecord(Number(row.day));
  return {
    ...base,
    ...row,
    day: Number(row.day),
    habits: (row.habits as Record<string, boolean>) || {},
    water_ml: row.water_ml == null ? null : Number(row.water_ml),
    sleep_hours: row.sleep_hours == null ? null : Number(row.sleep_hours),
    note: (row.note as string) ?? '',
    objective: (row.objective as string) ?? '',
    achievements: (row.achievements as string) ?? '',
    challenge_text: (row.challenge_text as string) ?? '',
  } as DayRecord;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Este e-mail já tem uma conta. Entre pela tela de login ou recupere sua senha.';
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('password should be at least') || m.includes('weak password') || m.includes('weak_password'))
    return 'Sua senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  return 'Não foi possível concluir agora. Tente novamente em instantes.';
}

// ---------------------------------------------------------------------------
// SUPABASE (produção)
// ---------------------------------------------------------------------------
function supabaseBackend(): Backend {
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    // Fluxo implícito: o link de confirmação/recuperação funciona mesmo se aberto em outro navegador.
  });
  const redirect = () => `${window.location.origin}/`;

  return {
    mode: 'supabase',
    async getSession() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      return u ? { userId: u.id, email: u.email ?? '' } : null;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        const s = session?.user ? { userId: session.user.id, email: session.user.email ?? '' } : null;
        const e: AuthEvent =
          event === 'PASSWORD_RECOVERY' ? 'PASSWORD_RECOVERY' : event === 'SIGNED_OUT' ? 'SIGNED_OUT' : event === 'SIGNED_IN' ? 'SIGNED_IN' : 'OTHER';
        cb(e, s);
      });
      return () => data.subscription.unsubscribe();
    },
    async enter(email, password, name) {
      const cleanEmail = email.trim().toLowerCase();
      const signIn = async () => {
        const { data, error } = await withTimeout(sb.auth.signInWithPassword({ email: cleanEmail, password }));
        if (error) {
          if (isNetworkError(error)) throw error;
          return null; // senha diferente ou conta inexistente → libera pelo servidor
        }
        const u = data.user!;
        return { userId: u.id, email: u.email ?? cleanEmail };
      };

      // 1) Caminho rápido: a conta já existe com esta senha.
      const first = await retry(signIn);
      if (first) return first;

      // 2) Acesso livre: cria a conta ou atualiza a senha, e entra.
      const res = await retry(async () => {
        const r = await withTimeout(
          fetch(`${SUPABASE_URL}/functions/v1/signup`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY },
            body: JSON.stringify({ name: (name ?? '').trim(), email: cleanEmail, password }),
          }),
        );
        if (r.status >= 500 || r.status === 0) throw new OfflineError(`status ${r.status}`);
        return r;
      });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? '';
        if (code === 'weak_password') throw new FriendlyError(translateAuthError('weak password'));
        if (code === 'email') throw new FriendlyError('Digite um e-mail válido.');
        if (code === 'exists')
          throw new FriendlyError('Este e-mail já tem uma conta com outra senha. Entre com a senha que você criou no cadastro.');
        throw new FriendlyError(translateAuthError('erro'));
      }
      const second = await retry(signIn);
      if (!second) throw new FriendlyError(translateAuthError('erro'));
      return second;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async requestPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirect() });
      if (error) throw new FriendlyError(translateAuthError(error.message));
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new FriendlyError(translateAuthError(error.message));
    },
    async bootstrap() {
      const t0 = Date.now();
      const { data, error } = await withTimeout(sb.rpc('suna_bootstrap'));
      if (error) throw new OfflineError(error.message);
      const rtt = Date.now() - t0;
      const payload = data as { server_now: string; access: AccessState; profile: Profile | null };
      const res = await withTimeout(sb.from('day_records').select(DAY_COLUMNS).order('day'));
      if (res.error) throw new OfflineError(res.error.message);
      const records = (res.data ?? []).map((r) => normalizeRecord(r as Record<string, unknown>));
      return { serverNow: new Date(payload.server_now).getTime() + rtt / 2, access: 'ok', profile: payload.profile, records };
    },
    async serverNow() {
      const t0 = Date.now();
      const { data, error } = await withTimeout(sb.rpc('server_now'), 8000);
      if (error) throw new OfflineError(error.message);
      return new Date(data as string).getTime() + (Date.now() - t0) / 2;
    },
    async saveDay(day, patch) {
      const { data: s } = await sb.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) throw new OfflineError('sem sessão');
      const { error } = await withTimeout(sb.from('day_records').upsert({ user_id: uid, day, ...patch }, { onConflict: 'user_id,day' }));
      if (error) throw isNetworkError(error) ? new OfflineError(error.message) : new FriendlyError('Falha ao salvar.');
    },
    async updateProfile(patch) {
      const { data: s } = await sb.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) throw new OfflineError('sem sessão');
      const { error } = await withTimeout(sb.from('profiles').update(patch).eq('id', uid));
      if (error) throw isNetworkError(error) ? new OfflineError(error.message) : new FriendlyError('Falha ao salvar.');
    },
  };
}

// ---------------------------------------------------------------------------
// DEMONSTRAÇÃO (somente testes locais)
// ---------------------------------------------------------------------------
interface DemoUser {
  id: string;
  name: string;
  email: string;
  passHash: string;
}
interface DemoDb {
  users: Record<string, DemoUser>;
  profiles: Record<string, Profile>;
  records: Record<string, Record<number, DayRecord>>;
}
const DEMO_DB = 'suna-demo-db-v2';
const DEMO_SESSION = 'suna-demo-session-v2';
export const DEMO_OFFSET_KEY = 'suna-demo-day-offset';

function readDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DEMO_DB);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    /* ignora */
  }
  return { users: {}, profiles: {}, records: {} };
}
function writeDb(db: DemoDb) {
  localStorage.setItem(DEMO_DB, JSON.stringify(db));
}
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
/** Relógio de demonstração: permite avançar dias para testar a jornada. */
export function demoNow(): number {
  const off = Number(localStorage.getItem(DEMO_OFFSET_KEY) || '0');
  return Date.now() + (Number.isFinite(off) ? off : 0) * 86_400_000;
}

function demoBackend(): Backend {
  const listeners = new Set<(e: AuthEvent, s: Session | null) => void>();
  const current = (): Session | null => {
    try {
      const raw = localStorage.getItem(DEMO_SESSION);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  };
  const emit = (e: AuthEvent) => listeners.forEach((l) => l(e, current()));
  const delay = () => new Promise((r) => setTimeout(r, 150));

  return {
    mode: 'demo',
    async getSession() {
      return current();
    },
    onAuth(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async enter(email, password, name) {
      await delay();
      const db = readDb();
      const key = email.trim().toLowerCase();
      const passHash = await sha256(password);
      let u = db.users[key];
      if (!u) {
        const id = crypto.randomUUID();
        const nm = (name ?? '').trim() || key.split('@')[0];
        u = db.users[key] = { id, name: nm, email: key, passHash };
        db.profiles[id] = { id, name: nm, email: key, journey_start: null, onboarding_done: false, gpt_opened_at: null };
        db.records[id] = {};
      } else {
        u.passHash = passHash; // acesso livre: mesma regra do servidor
      }
      writeDb(db);
      const s = { userId: u.id, email: key };
      localStorage.setItem(DEMO_SESSION, JSON.stringify(s));
      emit('SIGNED_IN');
      return s;
    },
    async signOut() {
      localStorage.removeItem(DEMO_SESSION);
      emit('SIGNED_OUT');
    },
    async requestPasswordReset() {
      await delay();
      throw new FriendlyError('No modo demonstração não há envio de e-mails. Em produção, a recuperação chega por e-mail.');
    },
    async updatePassword() {
      throw new FriendlyError('Indisponível no modo demonstração.');
    },
    async bootstrap() {
      await delay();
      const s = current();
      if (!s) throw new FriendlyError('Sessão expirada.');
      const db = readDb();
      const p = db.profiles[s.userId];
      if (!p) throw new FriendlyError('Conta de demonstração não encontrada. Crie uma nova conta.');
      if (!p.journey_start) {
        p.journey_start = spDateKey(demoNow());
        writeDb(db);
      }
      return { serverNow: demoNow(), access: 'ok', profile: p, records: Object.values(db.records[s.userId] || {}) };
    },
    async serverNow() {
      return demoNow();
    },
    async saveDay(day, patch) {
      await new Promise((r) => setTimeout(r, 120));
      const s = current();
      if (!s) throw new FriendlyError('Sessão expirada.');
      const db = readDb();
      const p = db.profiles[s.userId];
      // Mesma regra do servidor: nada é gravado em dias futuros.
      if (!p?.journey_start || day < 1 || day > TOTAL_DAYS || day > rawJourneyDay(p.journey_start, demoNow()))
        throw new FriendlyError('Este dia ainda está bloqueado.');
      const recs = (db.records[s.userId] ||= {});
      recs[day] = { ...(recs[day] || emptyRecord(day)), ...patch, day };
      writeDb(db);
    },
    async updateProfile(patch) {
      const s = current();
      if (!s) throw new FriendlyError('Sessão expirada.');
      const db = readDb();
      db.profiles[s.userId] = { ...db.profiles[s.userId], ...patch };
      if (patch.name) {
        const u = Object.values(db.users).find((x) => x.id === s.userId);
        if (u) u.name = patch.name;
      }
      writeDb(db);
    },
  };
}

export const backend: Backend | null = DEMO_MODE ? demoBackend() : SUPABASE_URL && SUPABASE_ANON_KEY ? supabaseBackend() : null;

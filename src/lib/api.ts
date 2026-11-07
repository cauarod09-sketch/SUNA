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
  signUp(name: string, email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
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
  if (m.includes('password should be at least') || m.includes('weak password'))
    return 'Sua senha precisa ter pelo menos 8 caracteres, com letras e números.';
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
    async signUp(name, email, password) {
      // Sem confirmação de e-mail: a Edge Function `signup` cria a conta já ativa no servidor.
      const cleanEmail = email.trim().toLowerCase();
      let res: Response;
      try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
        });
      } catch {
        throw new FriendlyError(translateAuthError('failed to fetch'));
      }
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error;
        const map: Record<string, string> = {
          exists: 'already registered',
          weak_password: 'weak password',
        };
        throw new FriendlyError(translateAuthError(map[code ?? ''] ?? 'erro'));
      }
      const { error } = await sb.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) throw new FriendlyError(translateAuthError(error.message));
      return { needsConfirmation: false };
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw new FriendlyError(translateAuthError(error.message));
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
      const { data, error } = await sb.rpc('suna_bootstrap');
      if (error) throw new FriendlyError('Não foi possível carregar sua jornada. Verifique sua conexão e tente novamente.');
      const rtt = Date.now() - t0;
      const payload = data as { server_now: string; access: AccessState; profile: Profile | null };
      let records: DayRecord[] = [];
      if (payload.access === 'ok') {
        const res = await sb.from('day_records').select(DAY_COLUMNS).order('day');
        if (res.error) throw new FriendlyError('Não foi possível carregar seus registros. Tente novamente.');
        records = (res.data ?? []).map((r) => normalizeRecord(r as Record<string, unknown>));
      }
      return { serverNow: new Date(payload.server_now).getTime() + rtt / 2, access: payload.access, profile: payload.profile, records };
    },
    async serverNow() {
      const t0 = Date.now();
      const { data, error } = await sb.rpc('server_now');
      if (error) throw error;
      return new Date(data as string).getTime() + (Date.now() - t0) / 2;
    },
    async saveDay(day, patch) {
      const { data: s } = await sb.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) throw new FriendlyError('Sua sessão expirou. Entre novamente.');
      const { error } = await sb.from('day_records').upsert({ user_id: uid, day, ...patch }, { onConflict: 'user_id,day' });
      if (error) throw new FriendlyError('Falha ao salvar.');
    },
    async updateProfile(patch) {
      const { data: s } = await sb.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) throw new FriendlyError('Sua sessão expirou. Entre novamente.');
      const { error } = await sb.from('profiles').update(patch).eq('id', uid);
      if (error) throw new FriendlyError('Falha ao salvar.');
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
    async signUp(name, email, password) {
      await delay();
      const db = readDb();
      const key = email.trim().toLowerCase();
      if (db.users[key]) throw new FriendlyError(translateAuthError('already registered'));
      const id = crypto.randomUUID();
      db.users[key] = { id, name: name.trim(), email: key, passHash: await sha256(password) };
      db.profiles[id] = { id, name: name.trim(), email: key, journey_start: null, onboarding_done: false, gpt_opened_at: null };
      db.records[id] = {};
      writeDb(db);
      localStorage.setItem(DEMO_SESSION, JSON.stringify({ userId: id, email: key }));
      emit('SIGNED_IN');
      return { needsConfirmation: false };
    },
    async signIn(email, password) {
      await delay();
      const db = readDb();
      const u = db.users[email.trim().toLowerCase()];
      if (!u || u.passHash !== (await sha256(password))) throw new FriendlyError(translateAuthError('invalid login credentials'));
      localStorage.setItem(DEMO_SESSION, JSON.stringify({ userId: u.id, email: u.email }));
      emit('SIGNED_IN');
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

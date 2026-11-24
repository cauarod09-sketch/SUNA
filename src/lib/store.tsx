// Estado da SUNA com funcionamento offline-first.
// • Tudo que a usuária registra é salvo primeiro no aparelho e enviado ao Supabase quando houver conexão.
// • Se o servidor não responder (sem internet, rede ruim ou Supabase fora do ar), o app abre com os dados do aparelho.
// • Entrar nunca é bloqueado pela internet: sem conexão, a conta fica "no aparelho" e sincroniza sozinha depois.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TOTAL_DAYS } from '../config';
import { backend, FriendlyError, isNetworkError, OfflineError, withTimeout, type Session } from './api';
import { rawJourneyDay, spDateKey, unlockedDay } from './time';
import { emptyRecord, type AccessState, type DayPatch, type DayRecord, type Profile } from './types';

export type AppStatus = 'config_missing' | 'loading' | 'anon' | 'recovery' | 'blocked' | 'error' | 'ready';
/** 'local' = salvo no aparelho, aguardando internet para subir. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'local' | 'error';

type ProfilePatch = Partial<Pick<Profile, 'name' | 'onboarding_done' | 'gpt_opened_at'>>;

interface AppCtx {
  status: AppStatus;
  access: AccessState | null;
  errorMsg: string;
  session: Session | null;
  profile: Profile | null;
  records: Record<number, DayRecord>;
  /** true quando o servidor não está respondendo: o app segue usando o aparelho. */
  offline: boolean;
  /** Hora atual corrigida pelo relógio do servidor (ms). */
  now: number;
  /** Último dia liberado (1–21). */
  unlocked: number;
  /** Dia corrido (pode passar de 21 depois do fim). */
  rawDay: number;
  startKey: string;
  saveState: SaveState;
  retrySave: () => void;
  record: (day: number) => DayRecord;
  patchDay: (day: number, patch: DayPatch, opts?: { debounce?: boolean }) => void;
  setProfile: (patch: ProfilePatch) => Promise<void>;
  /** Cadastro e login: qualquer e-mail + senha entra (com ou sem internet). */
  enterApp: (email: string, password: string, name?: string) => Promise<void>;
  reload: () => void;
  signOut: () => Promise<void>;
  finishRecovery: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}

// ---------------------------------------------------------------------------
// Armazenamento no aparelho
// ---------------------------------------------------------------------------
const pendingKey = (uid: string) => `suna-pending-${uid}`;
const pendingProfileKey = (uid: string) => `suna-pending-profile-${uid}`;
const cacheKey = (uid: string) => `suna-cache-${uid}`;
const OFFLINE_ACCOUNT = 'suna-offline-account';
/** e-mail → id da conta no servidor, para abrir a jornada certa mesmo entrando sem internet. */
const KNOWN_USERS = 'suna-known-users';
const localUid = (email: string) => `local:${email}`;
const accountUid = (acc: OfflineAccount) => acc.uid || localUid(acc.email);

interface Cache {
  profile: Profile;
  records: Record<number, DayRecord>;
  offset: number;
}
interface OfflineAccount {
  email: string;
  name: string;
  password: string;
  /** id da conta no servidor, se este aparelho já a conhece. */
  uid?: string;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível: segue em memória */
  }
}

function freshProfile(uid: string, email: string, name: string): Profile {
  return {
    id: uid,
    name: name || email.split('@')[0],
    email,
    journey_start: spDateKey(Date.now()),
    onboarding_done: false,
    gpt_opened_at: null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>(backend ? 'loading' : 'config_missing');
  const [errorMsg] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [records, setRecords] = useState<Record<number, DayRecord>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [offline, setOffline] = useState(false);
  const offsetRef = useRef(0);
  const [now, setNow] = useState(Date.now());

  const loadedUser = useRef<string | null>(null);
  const isLocalAccount = useRef(false);
  const entering = useRef(false);
  const syncing = useRef(false);
  const recoveryRef = useRef(typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));
  const pending = useRef<Record<number, DayPatch>>({});
  const flushTimer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);
  const savedTimer = useRef<number | undefined>(undefined);
  const startRef = useRef<string>('');
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  const persistPending = useCallback(() => {
    const uid = loadedUser.current;
    if (!uid) return;
    writeJson(pendingKey(uid), Object.keys(pending.current).length ? pending.current : null);
  }, []);

  const showSaved = useCallback((state: SaveState) => {
    setSaveState(state);
    window.clearTimeout(savedTimer.current);
    if (state === 'saved') savedTimer.current = window.setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
  }, []);

  const flush = useCallback(async () => {
    window.clearTimeout(flushTimer.current);
    if (!backend || flushing.current) return;
    const batch = pending.current;
    const days = Object.keys(batch).map(Number);
    if (!days.length) return;
    // Conta criada sem internet: fica no aparelho até conseguir entrar no servidor.
    if (isLocalAccount.current) {
      showSaved('local');
      return;
    }
    flushing.current = true;
    pending.current = {};
    setSaveState('saving');
    let failed: 'none' | 'network' | 'other' = 'none';
    for (const day of days) {
      try {
        await backend.saveDay(day, batch[day]);
      } catch (e) {
        failed = isNetworkError(e) ? 'network' : failed === 'network' ? 'network' : 'other';
        // Devolve à fila sem sobrescrever alterações mais novas.
        pending.current[day] = { ...batch[day], ...(pending.current[day] || {}) };
      }
    }
    persistPending();
    flushing.current = false;
    if (failed === 'network') {
      setOffline(true);
      showSaved('local');
      return;
    }
    if (failed === 'other') {
      showSaved('error');
      return;
    }
    if (Object.keys(pending.current).length) {
      void flush();
      return;
    }
    showSaved('saved');
  }, [persistPending, showSaved]);

  /** Aplica perfil + registros (do servidor ou do aparelho) e reaplica o que ainda não subiu. */
  const apply = useCallback((uid: string, prof: Profile, recs: Record<number, DayRecord>, serverNow: number) => {
    startRef.current = prof.journey_start!;
    const map: Record<number, DayRecord> = { ...recs };
    const saved = readJson<Record<number, DayPatch>>(pendingKey(uid)) ?? {};
    const limit = Math.min(rawJourneyDay(prof.journey_start!, serverNow), TOTAL_DAYS);
    pending.current = {};
    for (const [k, patch] of Object.entries(saved)) {
      const d = Number(k);
      if (d >= 1 && d <= limit) {
        map[d] = { ...(map[d] || emptyRecord(d)), ...patch, day: d };
        pending.current[d] = patch;
      }
    }
    const profPatch = readJson<ProfilePatch>(pendingProfileKey(uid));
    setProfileState(profPatch ? { ...prof, ...profPatch } : prof);
    setRecords(map);
    persistPending();
  }, [persistPending]);

  /**
   * Carrega a jornada. Nunca bloqueia por falta de internet:
   * servidor → cache do aparelho → jornada nova no aparelho.
   */
  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!backend) return;
      if (!opts?.silent) setStatus('loading');

      // Conta criada sem internet (ainda não existe no servidor).
      const localAcc = readJson<OfflineAccount>(OFFLINE_ACCOUNT);
      const s = await withTimeout(backend.getSession(), 8000).catch(() => null);
      if (!s && localAcc) {
        const uid = accountUid(localAcc);
        isLocalAccount.current = true;
        loadedUser.current = uid;
        const sess = { userId: uid, email: localAcc.email };
        setSession(sess);
        const cache = readJson<Cache>(cacheKey(uid));
        apply(uid, cache?.profile ?? freshProfile(uid, localAcc.email, localAcc.name), cache?.records ?? {}, Date.now());
        setOffline(true);
        setStatus('ready');
        return;
      }
      isLocalAccount.current = false;
      setSession(s);
      if (!s) {
        loadedUser.current = null;
        setStatus('anon');
        return;
      }
      loadedUser.current = s.userId;

      try {
        const res = await backend.bootstrap();
        if (!res.profile?.journey_start) throw new OfflineError('perfil incompleto');
        offsetRef.current = res.serverNow - Date.now();
        setNow(res.serverNow);
        const map: Record<number, DayRecord> = {};
        for (const r of res.records) map[r.day] = r;
        // Alterações de perfil feitas sem internet sobem agora.
        const profPatch = readJson<ProfilePatch>(pendingProfileKey(s.userId));
        if (profPatch) {
          backend
            .updateProfile(profPatch)
            .then(() => writeJson(pendingProfileKey(s!.userId), null))
            .catch(() => {});
        }
        apply(s.userId, res.profile, map, res.serverNow);
        writeJson(KNOWN_USERS, { ...(readJson<Record<string, string>>(KNOWN_USERS) ?? {}), [s.email.toLowerCase()]: s.userId });
        setOffline(false);
        setStatus('ready');
        if (Object.keys(pending.current).length) void flush();
      } catch {
        // Sem servidor: abre com o que está no aparelho.
        const cache = readJson<Cache>(cacheKey(s.userId));
        if (cache) {
          offsetRef.current = cache.offset ?? 0;
          setNow(Date.now() + offsetRef.current);
          apply(s.userId, cache.profile, cache.records, Date.now() + offsetRef.current);
        } else if (!opts?.silent) {
          apply(s.userId, freshProfile(s.userId, s.email, ''), {}, Date.now());
        }
        setOffline(true);
        setStatus('ready');
      }
    },
    [apply, flush],
  );

  /** Tenta reconectar: sobe a conta do aparelho e os registros pendentes. */
  const reconnect = useCallback(async () => {
    if (!backend || syncing.current || entering.current) return;
    syncing.current = true;
    try {
      const localAcc = readJson<OfflineAccount>(OFFLINE_ACCOUNT);
      if (isLocalAccount.current && localAcc) {
        const oldUid = accountUid(localAcc);
        entering.current = true;
        const s = await backend.enter(localAcc.email, localAcc.password, localAcc.name);
        // Leva tudo que foi registrado no aparelho para a conta do servidor.
        const cache = readJson<Cache>(cacheKey(oldUid));
        const merged: Record<number, DayPatch> = readJson<Record<number, DayPatch>>(pendingKey(s.userId)) ?? {};
        for (const [k, rec] of Object.entries(cache?.records ?? {})) {
          const { day: _d, ...rest } = rec;
          merged[Number(k)] = { ...rest, ...(merged[Number(k)] || {}) };
        }
        writeJson(pendingKey(s.userId), Object.keys(merged).length ? merged : null);
        const p = cache?.profile;
        if (p) writeJson(pendingProfileKey(s.userId), { onboarding_done: p.onboarding_done, gpt_opened_at: p.gpt_opened_at });
        writeJson(OFFLINE_ACCOUNT, null);
        if (oldUid !== s.userId) {
          writeJson(cacheKey(oldUid), null);
          writeJson(pendingKey(oldUid), null);
        }
        isLocalAccount.current = false;
        entering.current = false;
        await load({ silent: true });
      } else if (loadedUser.current) {
        await load({ silent: true });
      }
    } catch {
      /* continua offline; nova tentativa em instantes */
    } finally {
      entering.current = false;
      syncing.current = false;
    }
  }, [load]);

  // Sessão e eventos de autenticação.
  useEffect(() => {
    if (!backend) return;
    if (recoveryRef.current) setStatus('recovery');
    else void load();
    const off = backend.onAuth((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true;
        setSession(s);
        setStatus('recovery');
        return;
      }
      if (recoveryRef.current || entering.current) return;
      if (event === 'SIGNED_OUT') {
        if (isLocalAccount.current) return;
        loadedUser.current = null;
        setSession(null);
        setProfileState(null);
        setRecords({});
        setStatus('anon');
        return;
      }
      if (event === 'SIGNED_IN' && s && s.userId !== loadedUser.current) void load();
    });
    return off;
  }, [load]);

  // Guarda uma cópia da jornada no aparelho a cada mudança (abre mesmo sem internet).
  useEffect(() => {
    const uid = loadedUser.current;
    if (status !== 'ready' || !uid || !profile?.journey_start) return;
    writeJson(cacheKey(uid), { profile, records, offset: offsetRef.current } satisfies Cache);
  }, [status, profile, records]);

  // Sem conexão: tenta de novo a cada 15 s e assim que a internet voltar.
  useEffect(() => {
    if (!offline) return;
    const id = window.setInterval(() => void reconnect(), 15_000);
    const onOnline = () => void reconnect();
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [offline, reconnect]);

  // Relógio: atualiza o dia liberado à meia-noite (horário de Brasília) mesmo com o app aberto.
  useEffect(() => {
    const tick = () => setNow(Date.now() + offsetRef.current);
    const id = window.setInterval(tick, 20_000);
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
        return;
      }
      tick();
      if (backend && loadedUser.current && !isLocalAccount.current)
        backend
          .serverNow()
          .then((t) => {
            offsetRef.current = t - Date.now();
            tick();
            if (offline) void reconnect();
          })
          .catch(() => {});
    };
    const onHide = () => void flush();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush, offline, reconnect]);

  const startKey = profile?.journey_start ?? '';
  const rawDay = startKey ? rawJourneyDay(startKey, now) : 1;
  const unlocked = startKey ? unlockedDay(startKey, now) : 1;

  const record = useCallback((day: number) => records[day] ?? emptyRecord(day), [records]);

  const patchDay = useCallback(
    (day: number, patch: DayPatch, opts?: { debounce?: boolean }) => {
      if (!startRef.current) return;
      const limit = unlockedDay(startRef.current, Date.now() + offsetRef.current);
      if (day < 1 || day > limit) return; // dias futuros nunca são gravados
      setRecords((prev) => ({ ...prev, [day]: { ...(prev[day] ?? emptyRecord(day)), ...patch, day } }));
      pending.current[day] = { ...(pending.current[day] || {}), ...patch };
      persistPending();
      window.clearTimeout(flushTimer.current);
      if (opts?.debounce) {
        setSaveState('saving');
        flushTimer.current = window.setTimeout(() => void flush(), 700);
      } else void flush();
    },
    [flush, persistPending],
  );

  const setProfile = useCallback(
    async (patch: ProfilePatch) => {
      setProfileState((p) => (p ? { ...p, ...patch } : p));
      const uid = loadedUser.current;
      if (!backend || !uid) return;
      const queue = () => {
        writeJson(pendingProfileKey(uid), { ...(readJson<ProfilePatch>(pendingProfileKey(uid)) ?? {}), ...patch });
        showSaved('local');
      };
      if (isLocalAccount.current) return queue();
      try {
        setSaveState('saving');
        await backend.updateProfile(patch);
        showSaved('saved');
      } catch (e) {
        if (isNetworkError(e)) {
          setOffline(true);
          queue();
        } else showSaved('error');
      }
    },
    [showSaved],
  );

  const enterApp = useCallback(
    async (email: string, password: string, name?: string) => {
      if (!backend) return;
      const cleanEmail = email.trim().toLowerCase();
      entering.current = true;
      try {
        await backend.enter(cleanEmail, password, name);
        entering.current = false;
        await load();
      } catch (e) {
        entering.current = false;
        if (e instanceof FriendlyError) throw e;
        // Sem internet (ou servidor fora do ar): entra mesmo assim, com a conta guardada no aparelho.
        const known = readJson<Record<string, string>>(KNOWN_USERS)?.[cleanEmail];
        writeJson(OFFLINE_ACCOUNT, { email: cleanEmail, name: (name ?? '').trim(), password, uid: known } satisfies OfflineAccount);
        await load();
      }
    },
    [load],
  );

  const signOut = useCallback(async () => {
    await flush();
    if (isLocalAccount.current) writeJson(OFFLINE_ACCOUNT, null);
    else await backend?.signOut().catch(() => {});
    isLocalAccount.current = false;
    loadedUser.current = null;
    setSession(null);
    setProfileState(null);
    setRecords({});
    setOffline(false);
    setStatus('anon');
  }, [flush]);

  const finishRecovery = useCallback(() => {
    recoveryRef.current = false;
    window.history.replaceState(null, '', window.location.pathname);
    void load();
  }, [load]);

  const value = useMemo<AppCtx>(
    () => ({
      status,
      access: 'ok',
      errorMsg,
      session,
      profile,
      records,
      offline,
      now,
      unlocked,
      rawDay,
      startKey,
      saveState,
      retrySave: () => {
        void flush();
        if (offline) void reconnect();
      },
      record,
      patchDay,
      setProfile,
      enterApp,
      reload: () => void load(),
      signOut,
      finishRecovery,
    }),
    [status, errorMsg, session, profile, records, offline, now, unlocked, rawDay, startKey, saveState, flush, reconnect, record, patchDay, setProfile, enterApp, load, signOut, finishRecovery],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

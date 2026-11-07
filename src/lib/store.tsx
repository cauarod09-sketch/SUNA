import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TOTAL_DAYS } from '../config';
import { backend, FriendlyError, type Session } from './api';
import { rawJourneyDay, unlockedDay } from './time';
import { emptyRecord, type AccessState, type DayPatch, type DayRecord, type Profile } from './types';

export type AppStatus = 'config_missing' | 'loading' | 'anon' | 'recovery' | 'blocked' | 'error' | 'ready';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface AppCtx {
  status: AppStatus;
  access: AccessState | null;
  errorMsg: string;
  session: Session | null;
  profile: Profile | null;
  records: Record<number, DayRecord>;
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
  setProfile: (patch: Partial<Pick<Profile, 'name' | 'onboarding_done' | 'gpt_opened_at'>>) => Promise<void>;
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

const pendingKey = (uid: string) => `suna-pending-${uid}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>(backend ? 'loading' : 'config_missing');
  const [access, setAccess] = useState<AccessState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [records, setRecords] = useState<Record<number, DayRecord>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const offsetRef = useRef(0);
  const [now, setNow] = useState(Date.now());

  const loadedUser = useRef<string | null>(null);
  const recoveryRef = useRef(typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));
  const pending = useRef<Record<number, DayPatch>>({});
  const flushTimer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);
  const savedTimer = useRef<number | undefined>(undefined);
  const startRef = useRef<string>('');

  const persistPending = useCallback(() => {
    const uid = loadedUser.current;
    if (!uid) return;
    try {
      if (Object.keys(pending.current).length) localStorage.setItem(pendingKey(uid), JSON.stringify(pending.current));
      else localStorage.removeItem(pendingKey(uid));
    } catch {
      /* armazenamento local indisponível: segue só com o servidor */
    }
  }, []);

  const flush = useCallback(async () => {
    window.clearTimeout(flushTimer.current);
    if (!backend || flushing.current) return;
    const batch = pending.current;
    const days = Object.keys(batch).map(Number);
    if (!days.length) return;
    flushing.current = true;
    pending.current = {};
    setSaveState('saving');
    let failed = false;
    for (const day of days) {
      try {
        await backend.saveDay(day, batch[day]);
      } catch {
        failed = true;
        // Devolve à fila sem sobrescrever alterações mais novas.
        pending.current[day] = { ...batch[day], ...(pending.current[day] || {}) };
      }
    }
    persistPending();
    flushing.current = false;
    if (failed) {
      setSaveState('error');
      return;
    }
    if (Object.keys(pending.current).length) {
      void flush();
      return;
    }
    setSaveState('saved');
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
  }, [persistPending]);

  const load = useCallback(async () => {
    if (!backend) return;
    setStatus('loading');
    try {
      const s = await backend.getSession();
      setSession(s);
      if (!s) {
        loadedUser.current = null;
        setStatus('anon');
        return;
      }
      loadedUser.current = s.userId;
      const res = await backend.bootstrap();
      offsetRef.current = res.serverNow - Date.now();
      setNow(res.serverNow);
      setAccess(res.access);
      setProfileState(res.profile);
      if (res.access !== 'ok' || !res.profile?.journey_start) {
        setStatus('blocked');
        return;
      }
      startRef.current = res.profile.journey_start;
      const map: Record<number, DayRecord> = {};
      for (const r of res.records) map[r.day] = r;
      // Reaplica alterações que não chegaram ao servidor (ex.: app fechado sem internet).
      try {
        const raw = localStorage.getItem(pendingKey(s.userId));
        if (raw) {
          const saved = JSON.parse(raw) as Record<number, DayPatch>;
          const limit = rawJourneyDay(res.profile.journey_start, res.serverNow);
          for (const [k, patch] of Object.entries(saved)) {
            const d = Number(k);
            if (d >= 1 && d <= Math.min(limit, TOTAL_DAYS)) {
              map[d] = { ...(map[d] || emptyRecord(d)), ...patch, day: d };
              pending.current[d] = { ...(pending.current[d] || {}), ...patch };
            }
          }
        }
      } catch {
        /* ignora */
      }
      setRecords(map);
      setStatus('ready');
      if (Object.keys(pending.current).length) void flush();
    } catch (e) {
      setErrorMsg(e instanceof FriendlyError ? e.message : 'Não foi possível carregar sua jornada. Tente novamente.');
      setStatus('error');
    }
  }, [flush]);

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
      if (recoveryRef.current) return;
      if (event === 'SIGNED_OUT') {
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
      if (backend && loadedUser.current)
        backend
          .serverNow()
          .then((t) => {
            offsetRef.current = t - Date.now();
            tick();
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
  }, [flush]);

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

  const setProfile = useCallback(async (patch: Partial<Pick<Profile, 'name' | 'onboarding_done' | 'gpt_opened_at'>>) => {
    setProfileState((p) => (p ? { ...p, ...patch } : p));
    if (!backend) return;
    try {
      setSaveState('saving');
      await backend.updateProfile(patch);
      setSaveState('saved');
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
    } catch {
      setSaveState('error');
    }
  }, []);

  const signOut = useCallback(async () => {
    await flush();
    await backend?.signOut();
    loadedUser.current = null;
    setSession(null);
    setProfileState(null);
    setRecords({});
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
      access,
      errorMsg,
      session,
      profile,
      records,
      now,
      unlocked,
      rawDay,
      startKey,
      saveState,
      retrySave: () => void flush(),
      record,
      patchDay,
      setProfile,
      reload: () => void load(),
      signOut,
      finishRecovery,
    }),
    [status, access, errorMsg, session, profile, records, now, unlocked, rawDay, startKey, saveState, flush, record, patchDay, setProfile, load, signOut, finishRecovery],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

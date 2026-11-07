import type { Mood } from '../content/days';

export interface Profile {
  id: string;
  name: string;
  email: string;
  /** Data local (America/Sao_Paulo) do Dia 1, definida pelo servidor e nunca reiniciada. AAAA-MM-DD */
  journey_start: string | null;
  onboarding_done: boolean;
  gpt_opened_at: string | null;
}

export interface DayRecord {
  day: number;
  mood: Mood | null;
  conversation_at: string | null;
  challenge_revealed_at: string | null;
  challenge_done_at: string | null;
  /** Checklist 1 — Minha alimentação */
  meal: boolean;
  /** Checklist 2 — Minha atividade */
  activity: boolean;
  /** Checklist 3 — Meu grupo pessoal */
  group_update: boolean;
  habits: Record<string, boolean>;
  water_ml: number | null;
  sleep_hours: number | null;
  note: string;
  objective: string;
  achievements: string;
  challenge_text: string;
}

export type DayPatch = Partial<Omit<DayRecord, 'day'>>;

export type AccessState = 'ok';

export interface BootstrapResult {
  serverNow: number;
  access: AccessState;
  profile: Profile | null;
  records: DayRecord[];
}

export function emptyRecord(day: number): DayRecord {
  return {
    day,
    mood: null,
    conversation_at: null,
    challenge_revealed_at: null,
    challenge_done_at: null,
    meal: false,
    activity: false,
    group_update: false,
    habits: {},
    water_ml: null,
    sleep_hours: null,
    note: '',
    objective: '',
    achievements: '',
    challenge_text: '',
  };
}

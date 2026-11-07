// Cálculo exato da evolução: 4 componentes por dia × 21 dias = 84 componentes.
// Mede o cumprimento dos compromissos registrados — nunca transformação corporal.
import { TOTAL_DAYS } from '../config';
import { HABITS } from '../content/habits';
import type { DayRecord } from './types';

export const COMPONENTS_PER_DAY = 4;
export const TOTAL_COMPONENTS = TOTAL_DAYS * COMPONENTS_PER_DAY; // 84

export function dayComponents(r: DayRecord | undefined): number {
  if (!r) return 0;
  return (r.meal ? 1 : 0) + (r.activity ? 1 : 0) + (r.group_update ? 1 : 0) + (r.challenge_done_at ? 1 : 0);
}

export function checklistCount(r: DayRecord | undefined): number {
  if (!r) return 0;
  return (r.meal ? 1 : 0) + (r.activity ? 1 : 0) + (r.group_update ? 1 : 0);
}

/** Pontuação do dia: 0, 25, 50, 75 ou 100. */
export function dayScore(r: DayRecord | undefined): number {
  return dayComponents(r) * 25;
}

export type DayState = 'bloqueado' | 'disponivel' | 'parcial' | 'concluido' | 'pendente';

export function dayState(day: number, unlocked: number, r: DayRecord | undefined): DayState {
  if (day > unlocked) return 'bloqueado';
  const c = dayComponents(r);
  if (c === COMPONENTS_PER_DAY) return 'concluido';
  if (day < unlocked) return 'pendente';
  return c === 0 ? 'disponivel' : 'parcial';
}

export const DAY_STATE_LABEL: Record<DayState, string> = {
  bloqueado: 'Bloqueado',
  disponivel: 'Disponível',
  parcial: 'Parcial',
  concluido: 'Concluído',
  pendente: 'Pendente',
};

export interface ProgressSummary {
  completedComponents: number;
  overallPercent: number;
  daysComplete: number;
  challengesDone: number;
  checklistsDone: number;
  habitsLogged: number;
  /** Taxa de conclusão considerando apenas os dias já desbloqueados. */
  unlockedRate: number;
  /** Progresso acumulado (% de 84) ao final de cada dia desbloqueado. */
  cumulative: { day: number; percent: number; dayScore: number }[];
}

export function summarize(records: Record<number, DayRecord>, unlocked: number): ProgressSummary {
  let completed = 0;
  let daysComplete = 0;
  let challengesDone = 0;
  let checklistsDone = 0;
  let habitsLogged = 0;
  const cumulative: ProgressSummary['cumulative'] = [];
  const validHabits = new Set(HABITS.map((h) => h.id));

  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const r = records[d];
    const c = dayComponents(r);
    completed += c;
    if (c === COMPONENTS_PER_DAY) daysComplete++;
    if (r?.challenge_done_at) challengesDone++;
    checklistsDone += checklistCount(r);
    if (r) habitsLogged += Object.entries(r.habits || {}).filter(([k, v]) => v && validHabits.has(k as never)).length;
    if (d <= unlocked) cumulative.push({ day: d, percent: round1((completed / TOTAL_COMPONENTS) * 100), dayScore: c * 25 });
  }

  return {
    completedComponents: completed,
    overallPercent: round1((completed / TOTAL_COMPONENTS) * 100),
    daysComplete,
    challengesDone,
    checklistsDone,
    habitsLogged,
    unlockedRate: round1((completed / (Math.max(1, unlocked) * COMPONENTS_PER_DAY)) * 100),
    cumulative,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

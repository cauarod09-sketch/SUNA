import { describe, expect, it } from 'vitest';
import { DAYS, MOOD_OPTIONS, withName } from '../content/days';
import { HABITS, habitsForDay } from '../content/habits';
import { dayScore, dayState, summarize, TOTAL_COMPONENTS } from './progress';
import { addDays, daysBetween, rawJourneyDay, spDateKey, unlockedDay } from './time';
import { emptyRecord, type DayRecord } from './types';

const rec = (day: number, p: Partial<DayRecord> = {}): DayRecord => ({ ...emptyRecord(day), ...p });

describe('roteiro', () => {
  it('tem exatamente 21 dias, numerados em ordem', () => {
    expect(DAYS).toHaveLength(21);
    DAYS.forEach((d, i) => expect(d.day).toBe(i + 1));
  });
  it('cada dia tem mensagem, três reações, desafio com passos e conclusão', () => {
    for (const d of DAYS) {
      expect(d.opening.length).toBeGreaterThan(10);
      expect(Object.keys(d.reactions).sort()).toEqual(['A', 'B', 'C']);
      expect(d.challenge.title).toBeTruthy();
      expect(d.challenge.description).toBeTruthy();
      expect(d.challenge.steps.length).toBeGreaterThanOrEqual(5);
      expect(d.challenge.button).toBeTruthy();
      expect(d.completion).toBeTruthy();
    }
  });
  it('as três opções são fixas', () => {
    expect(MOOD_OPTIONS.map((o) => o.label)).toEqual(['Estou animada e disposta!', 'Estou mais ou menos hoje.', 'Estou cansada e sem energia.']);
  });
  it('substitui [NOME] pelo primeiro nome', () => {
    expect(withName('Oi, [NOME]!', 'Ana Clara Souza')).toBe('Oi, Ana!');
  });
  it('dias 7, 14 e 21 são conquistas especiais', () => {
    expect(DAYS.filter((d) => d.milestone).map((d) => d.day)).toEqual([7, 14, 21]);
  });
});

describe('hábitos acumulativos', () => {
  it('são desbloqueados nos dias 3, 4, 5, 6, 8, 13 e 15', () => {
    expect(HABITS.map((h) => h.unlockDay)).toEqual([3, 4, 5, 6, 8, 13, 15]);
  });
  it('permanecem nos dias seguintes', () => {
    expect(habitsForDay(2)).toHaveLength(0);
    expect(habitsForDay(5)).toHaveLength(3);
    expect(habitsForDay(21)).toHaveLength(7);
  });
  it('cada hábito de desafio aparece no roteiro do mesmo dia', () => {
    for (const h of HABITS) expect(DAYS[h.unlockDay - 1].habitUnlocked).toBe(h.id);
  });
});

describe('calendário em America/Sao_Paulo', () => {
  it('Dia 2 libera à meia-noite local, não após 24h', () => {
    // 6/nov 19:00 em São Paulo (UTC-3) = 22:00 UTC
    const start = spDateKey(Date.UTC(2026, 10, 6, 22, 0));
    expect(start).toBe('2026-11-06');
    // 6/nov 23:59 SP → ainda Dia 1
    expect(unlockedDay(start, Date.UTC(2026, 10, 7, 2, 59))).toBe(1);
    // 7/nov 00:00 SP → Dia 2
    expect(unlockedDay(start, Date.UTC(2026, 10, 7, 3, 0))).toBe(2);
  });
  it('nunca passa do Dia 21 e não reinicia por ausência', () => {
    const start = '2026-11-06';
    expect(unlockedDay(start, Date.UTC(2026, 10, 20, 15))).toBe(15);
    expect(unlockedDay(start, Date.UTC(2027, 0, 30, 15))).toBe(21);
    expect(rawJourneyDay(start, Date.UTC(2026, 10, 27, 15))).toBe(22);
  });
  it('soma dias atravessando meses', () => {
    expect(addDays('2026-11-25', 10)).toBe('2026-12-05');
    expect(daysBetween('2026-12-25', '2027-01-04')).toBe(10);
  });
});

describe('evolução: 4 componentes × 21 dias = 84', () => {
  it('cada componente vale 25% do dia', () => {
    expect(dayScore(rec(1))).toBe(0);
    expect(dayScore(rec(1, { meal: true }))).toBe(25);
    expect(dayScore(rec(1, { meal: true, activity: true }))).toBe(50);
    expect(dayScore(rec(1, { meal: true, activity: true, group_update: true }))).toBe(75);
    expect(dayScore(rec(1, { meal: true, activity: true, group_update: true, challenge_done_at: 'x' }))).toBe(100);
  });
  it('progresso geral = concluídos / 84', () => {
    expect(TOTAL_COMPONENTS).toBe(84);
    const s = summarize({ 1: rec(1, { meal: true, activity: true, group_update: true, challenge_done_at: 'x' }), 2: rec(2, { meal: true }) }, 2);
    expect(s.completedComponents).toBe(5);
    expect(s.overallPercent).toBe(Math.round((5 / 84) * 1000) / 10);
    expect(s.daysComplete).toBe(1);
    expect(s.challengesDone).toBe(1);
    expect(s.checklistsDone).toBe(4);
    expect(s.unlockedRate).toBe(Math.round((5 / 8) * 1000) / 10);
    expect(s.cumulative.map((c) => c.day)).toEqual([1, 2]);
  });
  it('desmarcar recalcula', () => {
    const a = summarize({ 1: rec(1, { meal: true }) }, 1);
    const b = summarize({ 1: rec(1, { meal: false }) }, 1);
    expect(a.completedComponents).toBe(1);
    expect(b.completedComponents).toBe(0);
  });
  it('estados dos blocos da Rotina', () => {
    expect(dayState(5, 3, undefined)).toBe('bloqueado');
    expect(dayState(3, 3, undefined)).toBe('disponivel');
    expect(dayState(3, 3, rec(3, { meal: true }))).toBe('parcial');
    expect(dayState(2, 3, rec(2, { meal: true }))).toBe('pendente');
    expect(dayState(2, 3, rec(2, { meal: true, activity: true, group_update: true, challenge_done_at: 'x' }))).toBe('concluido');
  });
});

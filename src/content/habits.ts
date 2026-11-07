// Hábitos acumulativos: desbloqueados em um dia da jornada e mantidos nos dias seguintes.
// São complementares aos três checklists principais e NÃO entram no cálculo da evolução.

export type HabitId =
  | 'hidratacao'
  | 'cuidados_matinais'
  | 'sono'
  | 'manha_sem_redes'
  | 'planejamento_matinal'
  | 'noite_sem_redes'
  | 'rotina_completa';

export interface Habit {
  id: HabitId;
  name: string;
  hint: string;
  unlockDay: number;
}

export const HABITS: Habit[] = [
  { id: 'hidratacao', name: 'Hidratação', hint: 'Bebi água ao longo do dia, respeitando minhas necessidades.', unlockDay: 3 },
  { id: 'cuidados_matinais', name: 'Cuidados matinais', hint: 'Fiz minha higiene e meus cuidados pessoais pela manhã.', unlockDay: 4 },
  { id: 'sono', name: 'Rotina de sono', hint: 'Respeitei meu horário de dormir e preparei meu descanso.', unlockDay: 5 },
  { id: 'manha_sem_redes', name: 'Manhã com menos redes sociais', hint: 'Comecei o dia sem abrir as redes logo ao acordar.', unlockDay: 6 },
  { id: 'planejamento_matinal', name: 'Planejamento matinal', hint: 'Defini minhas três prioridades do dia.', unlockDay: 8 },
  { id: 'noite_sem_redes', name: 'Rotina noturna sem distrações', hint: 'Desacelerei e deixei as redes de lado antes de dormir.', unlockDay: 13 },
  { id: 'rotina_completa', name: 'Rotina completa', hint: 'Cuidei da manhã, refeições, atividade, autocuidado e noite.', unlockDay: 15 },
];

export function habitsForDay(day: number): Habit[] {
  return HABITS.filter((h) => h.unlockDay <= day);
}

export function habitById(id: HabitId): Habit {
  return HABITS.find((h) => h.id === id)!;
}

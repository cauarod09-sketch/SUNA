import { createContext, useContext } from 'react';

export type Tab = 'inicio' | 'rotina' | 'suna' | 'evolucao';

export interface ShellApi {
  tab: Tab;
  goTab: (t: Tab) => void;
  /** Animação especial das conquistas dos Dias 7 e 14. */
  celebrate: (day: number) => void;
  /** Tela especial de conclusão do Dia 21. */
  openFinal: () => void;
  /** Abre o registro de um dia (aba Rotina). */
  openDay: (day: number) => void;
}

export const ShellCtx = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const c = useContext(ShellCtx);
  if (!c) throw new Error('useShell fora do Shell');
  return c;
}

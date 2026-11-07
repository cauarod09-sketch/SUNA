// Carrega o gerador de PDF só quando necessário (deixa a abertura do app mais leve).
import type { PlannerInput } from './pdf';

type PdfModule = typeof import('./pdf');
let mod: PdfModule | null = null;
let pending: Promise<PdfModule> | null = null;

export function loadPdf(): Promise<PdfModule> {
  pending ||= import('./pdf').then((m) => {
    mod = m;
    void m.preloadPlannerAssets();
    return m;
  });
  return pending;
}

export async function downloadPlanner(input: PlannerInput) {
  (mod ?? (await loadPdf())).downloadPlanner(input);
}

/** Síncrono quando o módulo já foi carregado, para o navegador permitir abrir a janela de impressão. */
export function printPlanner(input: PlannerInput) {
  if (mod) mod.printPlanner(input);
  else void loadPdf().then((m) => m.printPlanner(input));
}

export type { PlannerInput };

// Planner de 21 dias em PDF A4 (em branco ou preenchido), gerado no próprio aparelho.
import { jsPDF } from 'jspdf';
import { ASSETS, TOTAL_DAYS } from '../config';
import { dayContent } from '../content/days';
import { habitsForDay } from '../content/habits';
import { summarize } from './progress';
import { dayDateKey, formatLong, formatShort, weekdayShort } from './time';
import type { DayRecord, Profile } from './types';

export interface PlannerInput {
  mode: 'filled' | 'blank';
  profile: Profile | null;
  records: Record<number, DayRecord>;
  startKey: string;
  unlocked: number;
}

const INK: [number, number, number] = [58, 53, 54];
const MUTED: [number, number, number] = [130, 120, 118];
const LINE: [number, number, number] = [232, 214, 205];
const PEACH: [number, number, number] = [240, 140, 90];
const ROSE: [number, number, number] = [236, 120, 130];
const CREAM: [number, number, number] = [252, 247, 241];

let logoCache: string | null = null;
let logoRatio = 0.25;
/** Carrega a logo oficial antes do clique, para gerar o PDF sem atrasos. */
export async function preloadPlannerAssets(): Promise<void> {
  if (logoCache) return;
  try {
    // Reduz a logo oficial (sem alterar proporções) para o PDF ficar leve.
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      const t = window.setTimeout(() => fail(new Error('timeout')), 8000);
      img.onload = () => {
        window.clearTimeout(t);
        ok();
      };
      img.onerror = () => {
        window.clearTimeout(t);
        fail(new Error('logo'));
      };
      img.src = ASSETS.logo;
    });
    const w = Math.min(640, img.naturalWidth);
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    logoCache = canvas.toDataURL('image/png');
    logoRatio = h / w;
  } catch {
    logoCache = null;
  }
}

export function buildPlanner(input: PlannerInput): jsPDF {
  const { mode, profile, records, startKey, unlocked } = input;
  const filled = mode === 'filled';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14;
  const CW = W - M * 2;

  const text = (t: string, x: number, y: number, size = 10, color = INK, style: 'normal' | 'bold' = 'normal', opts?: object) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(t, x, y, opts);
  };
  const box = (x: number, y: number, on: boolean) => {
    doc.setDrawColor(...PEACH);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y - 3.2, 3.6, 3.6, 0.7, 0.7, on ? 'FD' : 'S');
    if (on) {
      doc.setFillColor(...PEACH);
      doc.roundedRect(x, y - 3.2, 3.6, 3.6, 0.7, 0.7, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(x + 0.8, y - 1.4, x + 1.6, y - 0.6);
      doc.line(x + 1.6, y - 0.6, x + 2.9, y - 2.4);
    }
  };
  const ruled = (x: number, y: number, w: number, lines: number, gap = 5.2) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    for (let i = 0; i < lines; i++) doc.line(x, y + i * gap, x + w, y + i * gap);
  };
  const writeIn = (value: string, x: number, y: number, w: number, maxLines: number, gap = 5.2) => {
    if (!value.trim()) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...INK);
    const parts = doc.splitTextToSize(value.replace(/\s+/g, ' ').trim(), w) as string[];
    const shown = parts.slice(0, maxLines);
    if (parts.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/.{0,2}$/, '…');
    shown.forEach((l, i) => doc.text(l, x, y - 1 + i * gap));
  };
  const footer = (page: number, total: number) => {
    text(`SUNA · Seu Glow Up em 21 Dias`, M, 289, 7.5, MUTED);
    text(`${page}/${total}`, W - M, 289, 7.5, MUTED, 'normal', { align: 'right' });
  };

  // ---------- Capa ----------
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, 297, 'F');
  if (logoCache) {
    try {
      doc.addImage(logoCache, 'PNG', W / 2 - 35, 26, 70, 70 * logoRatio, undefined, 'FAST');
    } catch {
      /* segue sem logo */
    }
  }
  text('Meu Planner de 21 Dias', W / 2, 62, 22, INK, 'bold', { align: 'center' });
  text(filled ? 'Versão com meus registros' : 'Versão em branco para preencher à mão', W / 2, 70, 10.5, MUTED, 'normal', { align: 'center' });

  const nameLine = filled && profile?.name ? profile.name : '';
  text('Nome', M + 20, 92, 9, MUTED);
  ruled(M + 20, 99, CW - 40, 1);
  if (nameLine) text(nameLine, M + 20, 97.5, 11);
  text('Início da jornada', M + 20, 110, 9, MUTED);
  ruled(M + 20, 117, CW - 40, 1);
  if (filled && startKey) text(formatLong(startKey), M + 20, 115.5, 11);

  if (filled && startKey) {
    const s = summarize(records, unlocked);
    const stats: [string, string][] = [
      ['Progresso total', `${s.overallPercent}%`],
      ['Dias completos', `${s.daysComplete}/21`],
      ['Desafios concluídos', `${s.challengesDone}/21`],
      ['Checklists realizados', `${s.checklistsDone}/63`],
    ];
    stats.forEach(([k, v], i) => {
      const x = M + 20 + (i % 2) * ((CW - 40) / 2);
      const y = 134 + Math.floor(i / 2) * 18;
      text(v, x, y, 16, PEACH, 'bold');
      text(k, x, y + 6, 8.5, MUTED);
    });
    // Gráfico de linha do progresso acumulado
    const gx = M + 20;
    const gy = 175;
    const gw = CW - 40;
    const gh = 55;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    [0, 25, 50, 75, 100].forEach((p) => {
      const yy = gy + gh - (p / 100) * gh;
      doc.line(gx, yy, gx + gw, yy);
      text(`${p}%`, gx - 2, yy + 1, 6.5, MUTED, 'normal', { align: 'right' });
    });
    [1, 7, 14, 21].forEach((d) => text(`Dia ${d}`, gx + ((d - 1) / 20) * gw, gy + gh + 5, 6.5, MUTED, 'normal', { align: 'center' }));
    doc.setDrawColor(...ROSE);
    doc.setLineWidth(0.8);
    const pts = s.cumulative.map((c) => [gx + ((c.day - 1) / 20) * gw, gy + gh - (c.percent / 100) * gh] as const);
    for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    doc.setFillColor(...PEACH);
    pts.forEach(([x, y]) => doc.circle(x, y, 0.9, 'F'));
    text('O gráfico mede o cumprimento dos compromissos registrados, não transformação corporal.', W / 2, gy + gh + 13, 7.5, MUTED, 'normal', {
      align: 'center',
    });
  } else {
    text('Como usar', M + 20, 136, 11, INK, 'bold');
    const how = [
      'Todos os dias têm três checklists: alimentação, atividade e grupo pessoal.',
      'O desafio do dia é o quarto compromisso. Cada um vale 25% do dia.',
      'Marque os hábitos que você já desbloqueou e anote hidratação e sono.',
      'Escreva como foi o seu dia e celebre suas conquistas, mesmo as pequenas.',
    ];
    how.forEach((h, i) => text(`•  ${h}`, M + 20, 145 + i * 7, 9.5));
  }

  // ---------- Dias (3 por página) ----------
  const perPage = 3;
  const totalPages = 1 + Math.ceil(TOTAL_DAYS / perPage);
  const blockH = 88;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const slot = (d - 1) % perPage;
    if (slot === 0) {
      doc.addPage();
      doc.setFillColor(...CREAM);
      doc.rect(0, 0, W, 297, 'F');
    }
    const y0 = 12 + slot * (blockH + 2);
    const r = records[d];
    const show = filled && d <= unlocked;
    const c = dayContent(d);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y0, CW, blockH, 3, 3, 'FD');

    // Cabeçalho
    text(`DIA ${d}`, M + 5, y0 + 8, 13, PEACH, 'bold');
    text(c.title, M + 24, y0 + 8, 10.5, INK, 'bold');
    const dateLabel = startKey ? `${weekdayShort(dayDateKey(startKey, d))} · ${formatShort(dayDateKey(startKey, d))}` : 'Data: ____/____';
    text(filled && startKey ? dateLabel : 'Data: ____/____', W - M - 5, y0 + 8, 8.5, MUTED, 'normal', { align: 'right' });

    // Objetivo
    let y = y0 + 15;
    text('Objetivo', M + 5, y, 7.5, MUTED);
    ruled(M + 22, y + 0.8, CW - 27, 1);
    if (show && r) writeIn(r.objective, M + 23, y + 0.8, CW - 30, 1);

    // Desafio
    y += 7;
    box(M + 5, y, !!(show && r?.challenge_done_at));
    text(`Desafio: ${c.challenge.title}`, M + 11, y, 8.6, INK, 'bold');

    // Checklists
    y += 7;
    const checks: [string, boolean][] = [
      ['Minha alimentação', !!(show && r?.meal)],
      ['Minha atividade', !!(show && r?.activity)],
      ['Meu grupo pessoal', !!(show && r?.group_update)],
    ];
    checks.forEach(([label, on], i) => {
      const x = M + 5 + i * 60;
      box(x, y, on);
      text(label, x + 6, y, 8.6);
    });

    // Hábitos
    y += 7;
    const habits = habitsForDay(d);
    text('Hábitos', M + 5, y, 7.5, MUTED);
    if (!habits.length) text('Seus hábitos acumulativos começam no Dia 3.', M + 22, y, 7.8, MUTED);
    habits.forEach((h, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = M + 22 + col * 56;
      const yy = y + row * 5.4;
      box(x, yy, !!(show && r?.habits?.[h.id]));
      const label = h.name.length > 30 ? `${h.name.slice(0, 29)}…` : h.name;
      text(label, x + 5.5, yy, 7.6);
    });
    y += Math.max(1, Math.ceil(habits.length / 3)) * 5.4 + 2;

    // Hidratação e sono
    text('Hidratação', M + 5, y, 7.5, MUTED);
    ruled(M + 22, y + 0.8, 30, 1);
    text('mL', M + 53, y, 7.5, MUTED);
    if (show && r?.water_ml != null) text(String(r.water_ml), M + 24, y, 8.6);
    text('Sono', M + 70, y, 7.5, MUTED);
    ruled(M + 80, y + 0.8, 18, 1);
    text('horas', M + 99, y, 7.5, MUTED);
    if (show && r?.sleep_hours != null) text(String(r.sleep_hours).replace('.', ','), M + 82, y, 8.6);

    // Anotações
    y += 7;
    text('Como foi meu dia', M + 5, y, 7.5, MUTED);
    ruled(M + 5, y + 5, CW - 10, 3);
    if (show && r) writeIn(r.note, M + 6, y + 5, CW - 12, 3);

    // Conquistas
    y += 19;
    text('Conquistas', M + 5, y, 7.5, MUTED);
    const achLines = Math.max(1, Math.min(2, Math.floor((y0 + blockH - 3 - (y + 5)) / 5.2) + 1));
    ruled(M + 5, y + 5, CW - 10, achLines);
    if (show && r) writeIn(r.achievements, M + 6, y + 5, CW - 12, achLines);

    if (slot === perPage - 1 || d === TOTAL_DAYS) footer(doc.getNumberOfPages(), totalPages);
  }
  doc.setPage(1);
  footer(1, totalPages);
  return doc;
}

export function downloadPlanner(input: PlannerInput) {
  const doc = buildPlanner(input);
  doc.save(input.mode === 'filled' ? 'suna-meu-planner-21-dias.pdf' : 'suna-planner-21-dias-em-branco.pdf');
}

/** Abre o PDF A4 pronto para imprimir. Se o navegador bloquear a nova aba, baixa o arquivo. */
export function printPlanner(input: PlannerInput) {
  const doc = buildPlanner(input);
  doc.autoPrint();
  const url = doc.output('bloburl') as unknown as string;
  const w = window.open(url, '_blank');
  if (!w) downloadPlanner(input);
}

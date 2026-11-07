// Datas da jornada no fuso America/Sao_Paulo. Os dias viram à meia-noite local, não após 24h.
import { SUNA_TIMEZONE, TOTAL_DAYS } from '../config';

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SUNA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: SUNA_TIMEZONE, hour: '2-digit', hourCycle: 'h23' });

/** Data local de São Paulo no formato AAAA-MM-DD para um instante (ms). */
export function spDateKey(ms: number): string {
  return keyFormatter.format(new Date(ms));
}

export function spHour(ms: number): number {
  return Number(hourFormatter.format(new Date(ms)));
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Diferença em dias de calendário entre duas datas AAAA-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / 86_400_000);
}

export function addDays(key: string, n: number): string {
  const t = new Date(keyToUtc(key) + n * 86_400_000);
  return t.toISOString().slice(0, 10);
}

/** Dia corrido da jornada (1 no dia de início; pode passar de 21 depois do fim). */
export function rawJourneyDay(startKey: string, nowMs: number): number {
  return daysBetween(startKey, spDateKey(nowMs)) + 1;
}

/** Último dia desbloqueado (1–21). */
export function unlockedDay(startKey: string, nowMs: number): number {
  return Math.min(TOTAL_DAYS, Math.max(1, rawJourneyDay(startKey, nowMs)));
}

export function dayDateKey(startKey: string, day: number): string {
  return addDays(startKey, day - 1);
}

export function formatShort(key: string): string {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

export function formatLong(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function weekdayShort(key: string): string {
  return WEEKDAYS[new Date(keyToUtc(key)).getUTCDay()];
}

export function greeting(nowMs: number): string {
  const h = spHour(nowMs);
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

import { TOTAL_DAYS } from '../config';
import type { ProgressSummary } from '../lib/progress';

/** Gráfico de linha do progresso acumulado (0–100% de 84 componentes) por dia. */
export function LineChart({ data, compact = false }: { data: ProgressSummary['cumulative']; compact?: boolean }) {
  const W = 340;
  const H = compact ? 150 : 190;
  const pad = { l: 34, r: 12, t: 14, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (d: number) => pad.l + ((d - 1) / (TOTAL_DAYS - 1)) * iw;
  const y = (p: number) => pad.t + ih - (p / 100) * ih;

  const pts = data.map((p) => `${x(p.day).toFixed(1)},${y(p.percent).toFixed(1)}`);
  const line = pts.length ? `M${pts.join(' L')}` : '';
  const area = data.length ? `${line} L${x(data[data.length - 1].day).toFixed(1)},${y(0)} L${x(1)},${y(0)} Z` : '';
  const last = data[data.length - 1];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Progresso acumulado: ${last?.percent ?? 0}% até o Dia ${last?.day ?? 1}`}>
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--peach-500)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--peach-500)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="chartLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--sun-500)" />
          <stop offset="100%" stopColor="var(--rose-500)" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="chart-grid" />
          <text x={pad.l - 6} y={y(g) + 3.5} className="chart-label" textAnchor="end">
            {g}%
          </text>
        </g>
      ))}
      {[1, 7, 14, 21].map((d) => (
        <text key={d} x={x(d)} y={H - 8} className="chart-label" textAnchor="middle">
          Dia {d}
        </text>
      ))}
      {area && <path d={area} fill="url(#chartFill)" />}
      {line && <path d={line} fill="none" stroke="url(#chartLine)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />}
      {data.map((p) => (
        <circle key={p.day} cx={x(p.day)} cy={y(p.percent)} r={p === last ? 4.5 : 2.6} className={p === last ? 'chart-dot is-last' : 'chart-dot'}>
          <title>{`Dia ${p.day}: ${p.dayScore}% do dia · ${p.percent}% acumulado`}</title>
        </circle>
      ))}
    </svg>
  );
}

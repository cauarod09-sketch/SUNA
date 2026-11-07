import { useEffect, useMemo, useState } from 'react';
import { Award, ChevronDown, Download, FileText, Lock, Printer, Star, Sun, Trophy } from 'lucide-react';
import { TOTAL_DAYS } from '../config';
import { dayContent } from '../content/days';
import { dayScore, dayState, summarize } from '../lib/progress';
import { downloadPlanner, loadPdf, printPlanner, type PlannerInput } from '../lib/pdf-lazy';
import { useApp } from '../lib/store';
import { dayDateKey, formatShort } from '../lib/time';
import { DayRecordView } from '../components/DayRecordView';
import { LineChart } from '../components/LineChart';
import { useShell } from '../components/shell-context';
import { Logo, SaveIndicator } from '../components/ui';

export function Evolucao() {
  const { records, unlocked, startKey, profile, record } = useApp();
  const shell = useShell();
  const s = useMemo(() => summarize(records, unlocked), [records, unlocked]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    void loadPdf();
  }, []);

  const input = (mode: PlannerInput['mode']): PlannerInput => ({ mode, profile, records, startKey, unlocked });
  const anyPerfect = Object.values(records).some((r) => dayScore(r) === 100);
  const conquests = [
    { id: 'd1', icon: <Sun size={20} />, title: 'Primeiro passo', text: 'Concluiu o desafio do Dia 1', on: !!record(1).challenge_done_at },
    { id: 'perfect', icon: <Star size={20} />, title: 'Dia completo', text: 'Cumpriu os 4 compromissos de um dia', on: anyPerfect },
    { id: 'w1', icon: <Award size={20} />, title: 'Primeira semana', text: 'Concluiu o desafio do Dia 7', on: !!record(7).challenge_done_at },
    { id: 'w2', icon: <Award size={20} />, title: 'Duas semanas', text: 'Concluiu o desafio do Dia 14', on: !!record(14).challenge_done_at },
    { id: 'end', icon: <Trophy size={20} />, title: 'Nova versão', text: 'Concluiu os 21 dias', on: !!record(21).challenge_done_at },
  ];

  return (
    <div className="screen evolucao">
      <header className="topbar">
        <Logo size="sm" />
        <SaveIndicator />
      </header>
      <h1 className="h-serif page-title">MINHA EVOLUÇÃO</h1>
      <p className="page-sub">Cada compromisso registrado é um avanço.</p>

      <section className="card chart-card">
        <div className="chart-head">
          <div>
            <div className="big-num">{fmt(s.overallPercent)}%</div>
            <small className="muted">da jornada completa ({s.completedComponents} de 84 compromissos)</small>
          </div>
          <span className="day-chip">
            Dia {unlocked} de {TOTAL_DAYS}
          </span>
        </div>
        <LineChart data={s.cumulative} />
        <p className="chart-foot">Mede o cumprimento dos compromissos registrados, não transformação corporal.</p>
      </section>

      <div className="stats">
        <Stat value={`${s.daysComplete}`} label="Dias completos" />
        <Stat value={`${s.challengesDone}`} label="Desafios concluídos" />
        <Stat value={`${s.checklistsDone}`} label="Checklists realizados" />
        <Stat value={`${fmt(s.unlockedRate)}%`} label="Conclusão dos dias liberados" />
      </div>

      <h2 className="sec-title big">Conquistas</h2>
      <div className="conquests">
        {conquests.map((c) => (
          <div key={c.id} className={`conquest ${c.on ? 'is-on' : ''}`}>
            <span className="cq-icon">{c.on ? c.icon : <Lock size={16} />}</span>
            <strong>{c.title}</strong>
            <small>{c.text}</small>
          </div>
        ))}
      </div>
      {record(21).challenge_done_at && (
        <button className="btn btn-soft" onClick={shell.openFinal}>
          VER MINHA CONCLUSÃO DOS 21 DIAS
        </button>
      )}

      <h2 className="sec-title big">Meu planner de 21 dias</h2>
      <p className="muted small">Histórico de cada dia. Toque para ver e editar — tudo é salvo automaticamente.</p>
      <div className="planner-actions">
        <button className="btn btn-primary" onClick={() => downloadPlanner(input('filled'))}>
          <Download size={17} /> BAIXAR MEU PLANNER
        </button>
        <div className="row-2">
          <button className="btn btn-soft" onClick={() => printPlanner(input('filled'))}>
            <Printer size={17} /> IMPRIMIR
          </button>
          <button className="btn btn-soft" onClick={() => downloadPlanner(input('blank'))}>
            <FileText size={17} /> PLANNER EM BRANCO
          </button>
        </div>
        <button className="link-btn subtle" onClick={() => printPlanner(input('blank'))}>
          <Printer size={14} /> Imprimir planner em branco
        </button>
      </div>

      <div className="planner-list">
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => {
          const r = record(d);
          const st = dayState(d, unlocked, r);
          const locked = st === 'bloqueado';
          const open = expanded === d;
          return (
            <div key={d} className={`pl-item st-${st} ${open ? 'is-open' : ''}`}>
              <button className="pl-head" onClick={() => !locked && setExpanded(open ? null : d)} disabled={locked} aria-expanded={open}>
                <span className="pl-day">
                  <strong>Dia {d}</strong>
                  <small>{startKey ? formatShort(dayDateKey(startKey, d)) : ''}</small>
                </span>
                <span className="pl-title">{dayContent(d).title}</span>
                {locked ? (
                  <Lock size={15} className="muted" />
                ) : (
                  <span className="pl-score">
                    <span className="mini-bar">
                      <i style={{ width: `${dayScore(r)}%` }} />
                    </span>
                    {dayScore(r)}%
                  </span>
                )}
                {!locked && <ChevronDown size={16} className={open ? 'rot' : ''} />}
              </button>
              {open && (
                <div className="pl-body">
                  <DayRecordView day={d} planner />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function fmt(n: number) {
  return String(n).replace('.', ',');
}

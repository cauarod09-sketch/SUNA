import { useState } from 'react';
import { Check, Clock, Lock } from 'lucide-react';
import { TOTAL_DAYS } from '../config';
import { checklistCount, DAY_STATE_LABEL, dayState } from '../lib/progress';
import { useApp } from '../lib/store';
import { dayDateKey, formatShort } from '../lib/time';
import { DayRecordView } from '../components/DayRecordView';
import { Logo, SaveIndicator, Sheet, Toast } from '../components/ui';

export function Rotina({ openDay, setOpenDay }: { openDay: number | null; setOpenDay: (d: number | null) => void }) {
  const { record, unlocked, startKey } = useApp();
  const [toast, setToast] = useState('');

  function tap(d: number) {
    if (d > unlocked) {
      setToast(`O Dia ${d} será liberado em ${formatShort(dayDateKey(startKey, d))}, à meia-noite (horário de Brasília).`);
      window.setTimeout(() => setToast(''), 3200);
      return;
    }
    setOpenDay(d);
  }

  return (
    <div className="screen rotina">
      <header className="topbar">
        <Logo size="sm" />
        <SaveIndicator />
      </header>
      <h1 className="h-serif page-title">MINHA ROTINA</h1>
      <p className="page-sub">21 dias de compromissos com você.</p>

      <div className="legend" aria-hidden="true">
        <span className="lg concluido">Concluído</span>
        <span className="lg parcial">Parcial</span>
        <span className="lg pendente">Pendente</span>
        <span className="lg bloqueado">Bloqueado</span>
      </div>

      <div className="day-grid">
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => {
          const r = record(d);
          const st = dayState(d, unlocked, r);
          return (
            <button
              key={d}
              className={`day-block st-${st} ${d === unlocked ? 'is-today' : ''}`}
              onClick={() => tap(d)}
              aria-label={`Dia ${d}: ${DAY_STATE_LABEL[st]}`}
            >
              <span className="db-top">
                <span className="db-day">DIA {d}</span>
                <span className="db-icon">
                  {st === 'bloqueado' ? <Lock size={14} /> : st === 'concluido' ? <Check size={14} strokeWidth={3} /> : st === 'pendente' ? <Clock size={13} /> : null}
                </span>
              </span>
              <span className="db-date">{startKey ? formatShort(dayDateKey(startKey, d)) : ''}</span>
              <span className="db-state">{st === 'pendente' ? 'Pendente' : DAY_STATE_LABEL[st]}</span>
              {st !== 'bloqueado' && (
                <span className="db-dots" aria-hidden="true">
                  {[r.meal, r.activity, r.group_update].map((v, i) => (
                    <i key={i} className={v ? 'on' : ''} />
                  ))}
                  <em>{checklistCount(r)}/3</em>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {toast && <Toast>{toast}</Toast>}

      {openDay !== null && (
        <Sheet
          onClose={() => setOpenDay(null)}
          title={
            <>
              <span className="sheet-day">Dia {openDay}</span>
              <span className="sheet-date">{startKey ? formatShort(dayDateKey(startKey, openDay)) : ''}</span>
              <SaveIndicator />
            </>
          }
        >
          <DayRecordView day={openDay} />
        </Sheet>
      )}
    </div>
  );
}

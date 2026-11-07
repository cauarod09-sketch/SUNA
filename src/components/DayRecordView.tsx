import { useState } from 'react';
import { ChevronDown, Droplet, Moon, Sparkles as SparkleIcon } from 'lucide-react';
import { dayContent } from '../content/days';
import { habitsForDay } from '../content/habits';
import { checklistCount } from '../lib/progress';
import { useApp } from '../lib/store';
import { Conversation } from './Conversation';
import { Checkbox } from './ui';

export const CHECKLISTS = [
  { key: 'meal', title: 'Minha alimentação', text: 'Fiz minhas refeições e cuidei da minha alimentação hoje.' },
  { key: 'activity', title: 'Minha atividade', text: 'Realizei meu treino, minha atividade física ou meu descanso planejado.' },
  {
    key: 'group_update',
    title: 'Meu grupo pessoal',
    text: 'Atualizei meu grupo pessoal com registros das minhas refeições, treinos ou evolução.',
  },
] as const;

/** Registro de um dia: 3 checklists, desafio, hábitos, hidratação/sono e anotação. Salva sozinho. */
export function DayRecordView({ day, planner = false }: { day: number; planner?: boolean }) {
  const { record, patchDay, unlocked } = useApp();
  const rec = record(day);
  const c = dayContent(day);
  const habits = habitsForDay(day);
  const [showChallenge, setShowChallenge] = useState(false);
  const locked = day > unlocked;

  if (locked) return <p className="muted">Este dia ainda está bloqueado.</p>;

  return (
    <div className="dayrec">
      {planner && (
        <div className="field">
          <label htmlFor={`obj-${day}`}>Objetivo do dia</label>
          <input
            id={`obj-${day}`}
            value={rec.objective}
            maxLength={300}
            placeholder="O que eu quero cuidar hoje?"
            onChange={(e) => patchDay(day, { objective: e.target.value }, { debounce: true })}
          />
        </div>
      )}

      <section>
        <h3 className="sec-title">
          Checklists do dia <span className="count">{checklistCount(rec)}/3</span>
        </h3>
        <div className="checks">
          {CHECKLISTS.map((k) => (
            <Checkbox key={k.key} title={k.title} text={k.text} checked={rec[k.key]} onChange={(v) => patchDay(day, { [k.key]: v })} />
          ))}
        </div>
        <p className="hint">Fotos no seu grupo são opcionais — registros escritos também valem. Nada de fotos íntimas ou do corpo, se você não quiser.</p>
      </section>

      <section className={`challenge-status ${rec.challenge_done_at ? 'is-done' : ''}`}>
        <div>
          <div className="sec-kicker">Desafio do dia</div>
          <div className="challenge-status-title">{c.challenge.title}</div>
        </div>
        <span className={`status-tag ${rec.challenge_done_at ? 'ok' : 'pending'}`}>{rec.challenge_done_at ? 'Concluído' : 'Pendente'}</span>
      </section>
      <button className="link-btn" onClick={() => setShowChallenge((s) => !s)} aria-expanded={showChallenge}>
        <ChevronDown size={16} className={showChallenge ? 'rot' : ''} /> {showChallenge ? 'Fechar conversa e desafio' : 'Abrir conversa e desafio'}
      </button>
      {showChallenge && (
        <div className="nested">
          <Conversation day={day} autoplay={false} />
        </div>
      )}

      {habits.length > 0 && (
        <section>
          <h3 className="sec-title">
            <SparkleIcon size={16} /> Meus hábitos
          </h3>
          <div className="habits">
            {habits.map((h) => (
              <Checkbox
                key={h.id}
                title={h.name}
                text={h.hint}
                checked={!!rec.habits?.[h.id]}
                onChange={(v) => patchDay(day, { habits: { ...(rec.habits || {}), [h.id]: v } })}
              />
            ))}
          </div>
        </section>
      )}

      {(day >= 3 || planner) && (
        <div className="metric-row">
          <div className="field">
            <label htmlFor={`wm-${day}`}>
              <Droplet size={15} /> Hidratação (mL)
            </label>
            <input
              id={`wm-${day}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              step={50}
              value={rec.water_ml ?? ''}
              placeholder="—"
              onChange={(e) => patchDay(day, { water_ml: num(e.target.value, 10000) }, { debounce: true })}
            />
          </div>
          {(day >= 5 || planner) && (
            <div className="field">
              <label htmlFor={`sl-${day}`}>
                <Moon size={15} /> Sono (horas)
              </label>
              <input
                id={`sl-${day}`}
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.5}
                value={rec.sleep_hours ?? ''}
                placeholder="—"
                onChange={(e) => patchDay(day, { sleep_hours: num(e.target.value, 24) }, { debounce: true })}
              />
            </div>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor={`note-${day}`}>Como foi seu dia?</label>
        <textarea
          id={`note-${day}`}
          rows={4}
          maxLength={4000}
          value={rec.note}
          placeholder="Hoje eu consegui... Hoje foi difícil porque... Amanhã quero melhorar..."
          onChange={(e) => patchDay(day, { note: e.target.value }, { debounce: true })}
        />
      </div>

      {planner && (
        <div className="field">
          <label htmlFor={`ach-${day}`}>Conquistas</label>
          <textarea
            id={`ach-${day}`}
            rows={2}
            maxLength={1000}
            value={rec.achievements}
            placeholder="Uma coisa de que me orgulho hoje…"
            onChange={(e) => patchDay(day, { achievements: e.target.value }, { debounce: true })}
          />
        </div>
      )}
    </div>
  );
}

function num(v: string, max: number): number | null {
  if (v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(0, n));
}

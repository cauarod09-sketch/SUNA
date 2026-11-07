import { useEffect, useState } from 'react';
import { CheckCircle2, Droplet, Moon, RotateCcw, Sparkles as SparkleIcon } from 'lucide-react';
import { dayContent, MOOD_OPTIONS, withName, type Mood } from '../content/days';
import { habitById } from '../content/habits';
import { useApp } from '../lib/store';
import { useShell } from './shell-context';
import { Character, Typewriter } from './ui';

type Phase = 'opening' | 'options' | 'reaction' | 'ready';

/**
 * Conversa diária da Suna (roteiro fixo, sem IA) + desafio do dia.
 * Usada na aba Início (dia atual) e no registro de dias anteriores.
 */
export function Conversation({ day, autoplay = true }: { day: number; autoplay?: boolean }) {
  const { record, patchDay, profile } = useApp();
  const rec = record(day);
  const c = dayContent(day);
  const name = profile?.name ?? '';
  const answered = !!rec.mood;
  const [phase, setPhase] = useState<Phase>(answered ? 'ready' : 'opening');
  const [animate, setAnimate] = useState(!answered && autoplay);
  const [reread, setReread] = useState(false);

  useEffect(() => {
    // Troca de dia (meia-noite) com o app aberto: recomeça a conversa nova.
    setPhase(record(day).mood ? 'ready' : 'opening');
    setAnimate(!record(day).mood && autoplay);
    setReread(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  function choose(m: Mood) {
    patchDay(day, { mood: m, conversation_at: new Date().toISOString() });
    setAnimate(true);
    setPhase('reaction');
  }

  const showTranscript = answered && (!rec.challenge_revealed_at || reread);

  return (
    <div className="convo">
      {!answered && (
        <>
          <SunaBubble>
            {animate && phase === 'opening' ? (
              <Typewriter text={withName(c.opening, name)} onDone={() => setPhase('options')} />
            ) : (
              withName(c.opening, name)
            )}
          </SunaBubble>
          {(phase === 'options' || !animate) && (
            <div className="options fade-up" role="group" aria-label="Como você está se sentindo?">
              {MOOD_OPTIONS.map((o) => (
                <button key={o.id} className="option" onClick={() => choose(o.id)}>
                  <span className="option-letter">{o.id}</span>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {answered && (showTranscript || phase === 'reaction') && (
        <>
          <SunaBubble>{withName(c.opening, name)}</SunaBubble>
          <div className="user-bubble fade-up">{MOOD_OPTIONS.find((o) => o.id === rec.mood)?.label}</div>
          <SunaBubble>
            {animate && phase === 'reaction' ? (
              <Typewriter text={withName(c.reactions[rec.mood!], name)} onDone={() => setPhase('ready')} />
            ) : (
              withName(c.reactions[rec.mood!], name)
            )}
          </SunaBubble>
        </>
      )}

      {answered && phase === 'ready' && !rec.challenge_revealed_at && (
        <div className="reveal fade-up">
          <p className="reveal-text">
            <SparkleIcon size={18} /> Seu desafio de hoje está pronto!
          </p>
          <button className="btn btn-primary" onClick={() => patchDay(day, { challenge_revealed_at: new Date().toISOString() })}>
            REVELAR MEU DESAFIO
          </button>
        </div>
      )}

      {rec.challenge_revealed_at && (
        <>
          <ChallengeCard day={day} />
          <button className="link-btn reread" onClick={() => setReread((r) => !r)}>
            <RotateCcw size={14} /> {reread ? 'Esconder conversa' : 'Reler a conversa'}
          </button>
        </>
      )}
    </div>
  );
}

function SunaBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="suna-line fade-up">
      <Character size={40} motion="none" className="avatar" />
      <div className="suna-bubble">{children}</div>
    </div>
  );
}

function ChallengeCard({ day }: { day: number }) {
  const { record, patchDay } = useApp();
  const shell = useShell();
  const rec = record(day);
  const c = dayContent(day);
  const done = !!rec.challenge_done_at;

  function complete() {
    patchDay(day, { challenge_done_at: new Date().toISOString() });
    if (c.milestone === 1 || c.milestone === 2) shell.celebrate(day);
  }

  return (
    <article className={`challenge reveal-in ${done ? 'is-done' : ''}`}>
      <div className="challenge-kicker">Desafio do Dia {day}</div>
      <h2 className="h-serif challenge-title">{c.challenge.title}</h2>
      <p className="challenge-desc">{c.challenge.description}</p>
      <ol className="steps">
        {c.challenge.steps.map((s, i) => (
          <li key={i}>
            <span className="step-n">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {c.challenge.note && <p className="challenge-note">{c.challenge.note}</p>}

      {c.waterField && (
        <div className="field inline-field">
          <label htmlFor={`w-${day}`}>
            <Droplet size={16} /> Água que bebi hoje (mL)
          </label>
          <input
            id={`w-${day}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            step={50}
            value={rec.water_ml ?? ''}
            placeholder="ex.: 1500"
            onChange={(e) => patchDay(day, { water_ml: e.target.value === '' ? null : clamp(Number(e.target.value), 0, 10000) }, { debounce: true })}
          />
        </div>
      )}
      {c.sleepField && (
        <div className="field inline-field">
          <label htmlFor={`s-${day}`}>
            <Moon size={16} /> Horas de sono
          </label>
          <input
            id={`s-${day}`}
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step={0.5}
            value={rec.sleep_hours ?? ''}
            placeholder="ex.: 7,5"
            onChange={(e) => patchDay(day, { sleep_hours: e.target.value === '' ? null : clamp(Number(e.target.value), 0, 24) }, { debounce: true })}
          />
        </div>
      )}
      {c.reflection && (
        <div className="field">
          <label htmlFor={`r-${day}`}>{c.reflection.label}</label>
          <textarea
            id={`r-${day}`}
            rows={4}
            maxLength={4000}
            value={rec.challenge_text}
            placeholder={c.reflection.placeholder}
            onChange={(e) => patchDay(day, { challenge_text: e.target.value }, { debounce: true })}
          />
        </div>
      )}
      {day === 21 && <Day2Recall />}

      {!done ? (
        <button className="btn btn-primary" onClick={complete}>
          {c.challenge.button}
        </button>
      ) : (
        <div className="completion fade-up">
          <div className="done-badge">
            <CheckCircle2 size={18} /> Desafio concluído
          </div>
          <div className="suna-line">
            <Character size={40} motion="pop" className="avatar" />
            <div className="suna-bubble">{c.completion}</div>
          </div>
          {c.habitUnlocked && (
            <p className="habit-unlocked">
              <SparkleIcon size={16} /> Hábito permanente desbloqueado: <strong>{habitById(c.habitUnlocked).name}</strong>
            </p>
          )}
          {day === 21 && (
            <button className="btn btn-primary" onClick={shell.openFinal}>
              VER MINHA EVOLUÇÃO
            </button>
          )}
          {(day === 7 || day === 14) && (
            <button className="btn btn-soft" onClick={() => shell.celebrate(day)}>
              Ver minha conquista
            </button>
          )}
          <button className="link-btn subtle" onClick={() => patchDay(day, { challenge_done_at: null })}>
            Desfazer conclusão
          </button>
        </div>
      )}
    </article>
  );
}

function Day2Recall() {
  const { record } = useApp();
  const text = record(2).challenge_text.trim();
  if (!text) return null;
  return (
    <div className="recall">
      <div className="recall-label">O que você escreveu no Dia 2</div>
      <p>{text}</p>
    </div>
  );
}

function clamp(n: number, a: number, b: number) {
  if (!Number.isFinite(n)) return a;
  return Math.min(b, Math.max(a, n));
}

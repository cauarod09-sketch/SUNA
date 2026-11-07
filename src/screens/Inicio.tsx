import { useEffect, useState } from 'react';
import { ChevronRight, MessageCircleHeart, PartyPopper } from 'lucide-react';
import { TOTAL_DAYS } from '../config';
import { dayContent } from '../content/days';
import { checklistCount } from '../lib/progress';
import { useApp } from '../lib/store';
import { greeting } from '../lib/time';
import { Conversation } from '../components/Conversation';
import { useShell } from '../components/shell-context';
import { Character, Logo, ProgressBar, SaveIndicator } from '../components/ui';

const autoOpenedThisSession = new Set<string>();

export function Inicio() {
  const { profile, unlocked, rawDay, record, now, session } = useApp();
  const shell = useShell();
  const day = unlocked;
  const rec = record(day);
  const c = dayContent(day);
  const first = (profile?.name || '').trim().split(/\s+/)[0];
  const autoKey = `suna-autoopen-${session?.userId}-${profile?.journey_start}-${day}`;
  const [open, setOpen] = useState(() => !!rec.mood);
  const journeyOver = rawDay > TOTAL_DAYS;

  // No primeiro acesso do dia, a conversa abre sozinha.
  useEffect(() => {
    if (rec.mood) {
      setOpen(true);
      return;
    }
    if (autoOpenedThisSession.has(autoKey)) return;
    let seen = false;
    try {
      seen = localStorage.getItem(autoKey) === '1';
      localStorage.setItem(autoKey, '1');
    } catch {
      /* ignora */
    }
    autoOpenedThisSession.add(autoKey);
    setOpen(!seen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  return (
    <div className="screen inicio">
      <header className="topbar">
        <Logo size="sm" />
        <SaveIndicator />
      </header>

      <div className="hello fade-up">
        <h1 className="h-serif">
          {greeting(now)}, {first || 'querida'}!
        </h1>
        <div className="day-line">
          <span className="day-chip">
            Dia {day} de {TOTAL_DAYS}
          </span>
          <span className="day-title">{c.title}</span>
        </div>
        <ProgressBar value={(day / TOTAL_DAYS) * 100} label={`Dia ${day} de ${TOTAL_DAYS}`} />
      </div>

      {journeyOver && rec.challenge_done_at && (
        <div className="card soft center fade-up">
          <PartyPopper size={28} className="accent-icon" />
          <p>
            <strong>Sua jornada de 21 dias foi concluída.</strong> Seus registros continuam guardados aqui.
          </p>
          <button className="btn btn-soft" onClick={shell.openFinal}>
            VER MINHA CONCLUSÃO
          </button>
        </div>
      )}

      {!open ? (
        <div className="invite fade-up">
          <Character size={170} motion="float" />
          <div className="invite-card">
            <p className="invite-text">
              <MessageCircleHeart size={20} /> Tenho uma coisa para conversar com você hoje!
            </p>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              CONVERSAR COM SUNA
            </button>
          </div>
        </div>
      ) : (
        <>
          {!rec.mood && (
            <div className="hero-char">
              <Character size={120} motion="enter" />
            </div>
          )}
          <Conversation day={day} />
        </>
      )}

      <button className="today-link" onClick={() => shell.openDay(day)}>
        <span>
          <strong>Minha rotina de hoje</strong>
          <small>{checklistCount(rec)}/3 checklists · desafio {rec.challenge_done_at ? 'concluído' : 'pendente'}</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

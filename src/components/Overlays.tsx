import { useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import { summarize } from '../lib/progress';
import { downloadPlanner, loadPdf } from '../lib/pdf-lazy';
import { useApp } from '../lib/store';
import { LineChart } from './LineChart';
import { Character, Logo, Sparkles } from './ui';

function useLockScroll() {
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);
}

/** Conquistas especiais dos Dias 7 e 14. */
export function MilestoneOverlay({ day, onClose }: { day: number; onClose: () => void }) {
  useLockScroll();
  const { record, profile } = useApp();
  const from = day === 7 ? 1 : 8;
  let complete = 0;
  let challenges = 0;
  for (let d = from; d <= day; d++) {
    const r = record(d);
    if (r.challenge_done_at) challenges++;
    if (r.meal && r.activity && r.group_update && r.challenge_done_at) complete++;
  }
  const first = (profile?.name || '').split(' ')[0];
  return (
    <div className="overlay celebrate" role="dialog" aria-modal="true">
      <div className="overlay-inner">
        <div className="burst">
          <Sparkles />
          <Character size={180} motion="pop" />
        </div>
        <div className="medal">{day === 7 ? 'SEMANA 1' : 'SEMANA 2'}</div>
        <h1 className="h-serif">{day === 7 ? 'Primeira semana concluída!' : 'Duas semanas concluídas!'}</h1>
        <p>
          {day === 7
            ? `${first ? first + ', a' : 'A'}gora começa uma nova etapa.`
            : `${first ? first + ', você' : 'Você'} chegou à reta final. Que orgulho do caminho até aqui!`}
        </p>
        <div className="mini-stats">
          <span>
            <strong>{challenges}/7</strong> desafios nesta semana
          </span>
          <span>
            <strong>{complete}</strong> dias completos
          </span>
        </div>
        <button className="btn btn-primary" onClick={onClose}>
          CONTINUAR
        </button>
      </div>
    </div>
  );
}

/** Experiência final do Dia 21. Nada é apagado: o histórico continua disponível. */
export function FinalOverlay({ onJourney, onClose }: { onJourney: () => void; onClose: () => void }) {
  useLockScroll();
  const { records, unlocked, profile, startKey, record } = useApp();
  const s = useMemo(() => summarize(records, unlocked), [records, unlocked]);
  useEffect(() => {
    void loadPdf();
  }, []);
  const letter = record(21).challenge_text.trim();

  return (
    <div className="overlay final" role="dialog" aria-modal="true">
      <button className="icon-btn overlay-close" onClick={onClose} aria-label="Fechar">
        ✕
      </button>
      <div className="overlay-inner">
        <Logo size="md" className="fade-down" />
        <div className="burst">
          <Sparkles count={24} />
          <Character size={200} motion="pop" />
        </div>
        <h1 className="h-serif final-title">VOCÊ CONCLUIU SEUS 21 DIAS!</h1>
        <p className="final-name">{profile?.name}</p>
        <div className="final-stats">
          <div>
            <strong>{s.daysComplete}</strong>
            <small>dias completos</small>
          </div>
          <div>
            <strong>{s.challengesDone}</strong>
            <small>desafios realizados</small>
          </div>
          <div>
            <strong>{s.habitsLogged}</strong>
            <small>hábitos registrados</small>
          </div>
        </div>
        <div className="card chart-card">
          <LineChart data={s.cumulative} compact />
          <small className="muted">{String(s.overallPercent).replace('.', ',')}% dos compromissos da jornada</small>
        </div>
        <blockquote className="final-quote">
          Seu verão não depende de uma versão perfeita de você. Depende dos cuidados e compromissos que decide continuar construindo.
        </blockquote>
        {letter && (
          <div className="recall">
            <div className="recall-label">Sua carta para a versão futura</div>
            <p>{letter}</p>
          </div>
        )}
        <button className="btn btn-primary" onClick={onJourney}>
          VER MINHA JORNADA
        </button>
        <button className="btn btn-soft" onClick={() => downloadPlanner({ mode: 'filled', profile, records, startKey, unlocked })}>
          <Download size={17} /> BAIXAR MINHA EVOLUÇÃO
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, RotateCw } from 'lucide-react';
import { ASSETS } from '../config';
import { useApp } from '../lib/store';

/** Logo oficial da SUNA (PNG fornecido, sem redesenho). */
export function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <img src={ASSETS.logo} alt="SUNA" className={`logo logo-${size} ${className}`} draggable={false} />;
}

/**
 * Personagem oficial da Suna (PNG fornecido). Animações aplicadas só por CSS, sem distorcer o arquivo.
 * Se o PNG da personagem ainda não estiver na pasta de assets, usa o ícone oficial da marca.
 */
export function Character({
  size = 160,
  motion = 'float',
  className = '',
}: {
  size?: number;
  motion?: 'float' | 'enter' | 'pop' | 'none';
  className?: string;
}) {
  const [src, setSrc] = useState(ASSETS.character);
  return (
    <div className={`character character-${motion} ${className}`} style={{ width: size, height: size }}>
      <img
        src={src}
        alt="Suna"
        draggable={false}
        onError={() => {
          if (src !== ASSETS.icon) setSrc(ASSETS.icon);
        }}
      />
    </div>
  );
}

/** Texto com efeito de digitação. Toque para pular. */
export function Typewriter({ text, speed = 22, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const done = n >= text.length;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setN(0);
  }, [text]);

  useEffect(() => {
    if (done) {
      doneRef.current?.();
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setN(text.length);
      return;
    }
    const t = window.setTimeout(() => setN((x) => Math.min(text.length, x + 1)), speed);
    return () => window.clearTimeout(t);
  }, [n, done, text, speed]);

  return (
    <span
      className={`typewriter ${done ? 'is-done' : ''}`}
      onClick={() => setN(text.length)}
      role="text"
      aria-label={text}
    >
      <span aria-hidden="true">{text.slice(0, n)}</span>
      {!done && <span className="caret" aria-hidden="true" />}
    </span>
  );
}

export function SaveIndicator() {
  const { saveState, retrySave } = useApp();
  if (saveState === 'idle') return <span className="save-pill is-idle" aria-hidden="true" />;
  if (saveState === 'saving')
    return (
      <span className="save-pill" role="status">
        <Loader2 size={13} className="spin" /> Salvando…
      </span>
    );
  if (saveState === 'saved')
    return (
      <span className="save-pill is-ok" role="status">
        <Check size={13} /> Salvo
      </span>
    );
  return (
    <button className="save-pill is-error" onClick={retrySave} role="alert">
      <AlertCircle size={13} /> Não salvou · <RotateCw size={12} /> Tentar de novo
    </button>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="pbar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="pbar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  title,
  text,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  text?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`check ${checked ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box" aria-hidden="true">
        <Check size={16} strokeWidth={3} />
      </span>
      <span className="check-text">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
    </label>
  );
}

export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="toast" role="status">
      {children}
    </div>,
    document.body,
  );
}

/** Explosão discreta de brilhos para conquistas. */
export function Sparkles({ count = 18 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const dist = 90 + (i % 3) * 38;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      d: (i % 5) * 0.06,
      c: ['var(--peach-500)', 'var(--rose-400)', 'var(--sun-400)'][i % 3],
    };
  });
  return (
    <div className="sparkles" aria-hidden="true">
      {items.map((s, i) => (
        <span key={i} style={{ ['--x' as string]: `${s.x}px`, ['--y' as string]: `${s.y}px`, animationDelay: `${s.d}s`, background: s.c }} />
      ))}
    </div>
  );
}

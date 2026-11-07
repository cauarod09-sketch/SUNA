import { useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react';
import { backend, FriendlyError } from '../lib/api';
import { useApp } from '../lib/store';
import { Character, Logo } from '../components/ui';

type View = 'welcome' | 'signup' | 'login' | 'forgot' | 'check-email' | 'forgot-sent';

export function AuthFlow() {
  const [view, setView] = useState<View>('welcome');
  const [email, setEmail] = useState('');

  if (view === 'welcome') return <Welcome onStart={() => setView('signup')} onLogin={() => setView('login')} />;
  if (view === 'signup')
    return (
      <Signup
        onBack={() => setView('welcome')}
        onLogin={() => setView('login')}
        onNeedsConfirmation={(e) => {
          setEmail(e);
          setView('check-email');
        }}
      />
    );
  if (view === 'login') return <Login onBack={() => setView('welcome')} onForgot={() => setView('forgot')} onSignup={() => setView('signup')} />;
  if (view === 'forgot')
    return (
      <Forgot
        onBack={() => setView('login')}
        onSent={(e) => {
          setEmail(e);
          setView('forgot-sent');
        }}
      />
    );
  return (
    <div className="auth-screen">
      <Logo size="sm" className="auth-logo" />
      <div className="card center fade-up">
        <MailCheck size={40} className="accent-icon" />
        <h1 className="h-serif">{view === 'check-email' ? 'Confirme seu e-mail' : 'Confira seu e-mail'}</h1>
        {view === 'check-email' ? (
          <p className="muted">
            Enviamos um link de ativação para <strong>{email}</strong>. Abra o link para confirmar que o e-mail é seu e ativar seus 21 dias com a SUNA.
            Não encontrou? Confira a caixa de spam.
          </p>
        ) : (
          <p className="muted">
            Se existir uma conta com <strong>{email}</strong>, você vai receber um link para criar uma nova senha.
          </p>
        )}
        <button className="btn btn-primary" onClick={() => setView('login')}>
          IR PARA O LOGIN
        </button>
      </div>
    </div>
  );
}

function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-glow" aria-hidden="true" />
      <Logo size="lg" className="fade-down" />
      <Character size={210} motion="enter" className="welcome-character" />
      <h1 className="h-serif welcome-title fade-up d1">Seu Glow Up começa aqui.</h1>
      <p className="welcome-sub fade-up d2">21 dias de desafios, autocuidado e pequenos compromissos para construir uma nova rotina.</p>
      <div className="welcome-actions fade-up d3">
        <button className="btn btn-primary" onClick={onStart}>
          COMEÇAR MINHA JORNADA
        </button>
        <button className="btn btn-ghost" onClick={onLogin}>
          JÁ TENHO UMA CONTA
        </button>
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  label,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete: string;
  id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required />
        <button type="button" className="input-icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use letras e números na sua senha.';
  return null;
}

function Signup({ onBack, onLogin, onNeedsConfirmation }: { onBack: () => void; onLogin: () => void; onNeedsConfirmation: (email: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Conte para a gente como você se chama.');
    if (!EMAIL_RE.test(email.trim())) return setError('Digite um e-mail válido.');
    const p = passwordProblem(pw);
    if (p) return setError(p);
    if (pw !== pw2) return setError('As senhas não são iguais.');
    if (!terms) return setError('Para continuar, aceite os termos de uso e a política de privacidade.');
    setBusy(true);
    try {
      const r = await backend!.signUp(name, email, pw);
      if (r.needsConfirmation) onNeedsConfirmation(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof FriendlyError ? err.message : 'Não foi possível criar sua conta agora.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <button className="back-btn" onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={20} />
      </button>
      <Logo size="sm" className="auth-logo" />
      <form className="card fade-up" onSubmit={submit} noValidate>
        <h1 className="h-serif">Vamos começar sua jornada?</h1>
        <p className="muted">Utilize o mesmo e-mail que você informou na compra para ativar seus 21 dias com a SUNA.</p>
        <div className="field">
          <label htmlFor="su-name">Seu nome</label>
          <input id="su-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="su-email">E-mail utilizado na compra</label>
          <input id="su-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <PasswordInput id="su-pw" label="Crie sua senha" value={pw} onChange={setPw} autoComplete="new-password" />
        <PasswordInput id="su-pw2" label="Confirme sua senha" value={pw2} onChange={setPw2} autoComplete="new-password" />
        <label className="terms">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            Li e aceito os <a href="/termos.html" target="_blank" rel="noopener">termos de uso</a> e a{' '}
            <a href="/privacidade.html" target="_blank" rel="noopener">política de privacidade</a>.
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'CRIANDO…' : 'CRIAR MINHA CONTA'}
        </button>
        <button type="button" className="link-btn" onClick={onLogin}>
          Já tenho uma conta
        </button>
      </form>
    </div>
  );
}

function Login({ onBack, onForgot, onSignup }: { onBack: () => void; onForgot: () => void; onSignup: () => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) return setError('Digite um e-mail válido.');
    if (!pw) return setError('Digite sua senha.');
    setBusy(true);
    try {
      await backend!.signIn(email, pw);
    } catch (err) {
      setError(err instanceof FriendlyError ? err.message : 'Não foi possível entrar agora.');
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <button className="back-btn" onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={20} />
      </button>
      <Logo size="sm" className="auth-logo" />
      <form className="card fade-up" onSubmit={submit} noValidate>
        <h1 className="h-serif">Bem-vinda de volta!</h1>
        <p className="muted">Sua jornada continua exatamente de onde você parou.</p>
        <div className="field">
          <label htmlFor="li-email">E-mail</label>
          <input id="li-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <PasswordInput id="li-pw" label="Senha" value={pw} onChange={setPw} autoComplete="current-password" />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'ENTRANDO…' : 'ENTRAR NA MINHA JORNADA'}
        </button>
        <button type="button" className="link-btn" onClick={onForgot}>
          Esqueci minha senha.
        </button>
        <button type="button" className="link-btn subtle" onClick={onSignup}>
          Ainda não tenho conta
        </button>
      </form>
    </div>
  );
}

function Forgot({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) return setError('Digite um e-mail válido.');
    setBusy(true);
    try {
      await backend!.requestPasswordReset(email);
      onSent(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof FriendlyError ? err.message : 'Não foi possível enviar agora.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <button className="back-btn" onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={20} />
      </button>
      <Logo size="sm" className="auth-logo" />
      <form className="card fade-up" onSubmit={submit} noValidate>
        <h1 className="h-serif">Recuperar senha</h1>
        <p className="muted">Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
        <div className="field">
          <label htmlFor="fg-email">E-mail</label>
          <input id="fg-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'ENVIANDO…' : 'ENVIAR LINK'}
        </button>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const { finishRecovery } = useApp();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const p = passwordProblem(pw);
    if (p) return setError(p);
    if (pw !== pw2) return setError('As senhas não são iguais.');
    setBusy(true);
    try {
      await backend!.updatePassword(pw);
      finishRecovery();
    } catch (err) {
      setError(err instanceof FriendlyError ? err.message : 'Não foi possível salvar a nova senha. O link pode ter expirado.');
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <Logo size="sm" className="auth-logo" />
      <form className="card fade-up" onSubmit={submit} noValidate>
        <h1 className="h-serif">Crie sua nova senha</h1>
        <p className="muted">Depois disso, você volta direto para a sua jornada.</p>
        <PasswordInput id="rp-pw" label="Nova senha" value={pw} onChange={setPw} autoComplete="new-password" />
        <PasswordInput id="rp-pw2" label="Confirme a nova senha" value={pw2} onChange={setPw2} autoComplete="new-password" />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'SALVANDO…' : 'SALVAR NOVA SENHA'}
        </button>
      </form>
    </div>
  );
}

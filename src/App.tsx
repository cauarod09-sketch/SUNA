import { useCallback, useEffect, useMemo, useState } from 'react';
import { House, ListChecks, LineChart as ChartIcon, MailWarning, RefreshCw, Sun } from 'lucide-react';
import { DEMO_MODE } from './config';
import { DEMO_OFFSET_KEY } from './lib/api';
import { AppProvider, useApp } from './lib/store';
import { AuthFlow, ResetPassword } from './screens/Auth';
import { Evolucao } from './screens/Evolucao';
import { Inicio } from './screens/Inicio';
import { Rotina } from './screens/Rotina';
import { SunaTab } from './screens/SunaTab';
import { FinalOverlay, MilestoneOverlay } from './components/Overlays';
import { ShellCtx, type ShellApi, type Tab } from './components/shell-context';
import { Character, Logo } from './components/ui';

export default function App() {
  return (
    <AppProvider>
      {DEMO_MODE && <DemoBar />}
      <Root />
    </AppProvider>
  );
}

function Root() {
  const { status, errorMsg, reload, access, signOut, session } = useApp();

  if (status === 'config_missing')
    return (
      <Centered>
        <h1 className="h-serif">Configuração pendente</h1>
        <p className="muted">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> e publique novamente.
        </p>
      </Centered>
    );
  if (status === 'loading')
    return (
      <Centered>
        <Character size={120} motion="float" />
        <p className="muted">Carregando sua jornada…</p>
      </Centered>
    );
  if (status === 'error')
    return (
      <Centered>
        <p className="form-error">{errorMsg}</p>
        <button className="btn btn-primary" onClick={reload}>
          <RefreshCw size={16} /> TENTAR NOVAMENTE
        </button>
      </Centered>
    );
  if (status === 'anon') return <AuthFlow />;
  if (status === 'recovery') return <ResetPassword />;
  if (status === 'blocked')
    return (
      <Centered>
        <MailWarning size={40} className="accent-icon" />
        {access === 'unconfirmed' ? (
          <>
            <h1 className="h-serif">Confirme seu e-mail</h1>
            <p className="muted">Abra o link que enviamos para {session?.email} para ativar seus 21 dias.</p>
          </>
        ) : (
          <>
            <h1 className="h-serif">Acesso não encontrado</h1>
            <p className="muted">
              Não encontramos uma compra ativa para {session?.email}. Se você comprou com outro e-mail, entre com ele. Se precisar de ajuda,
              fale com o suporte informado na sua compra.
            </p>
          </>
        )}
        <button className="btn btn-primary" onClick={reload}>
          <RefreshCw size={16} /> VERIFICAR NOVAMENTE
        </button>
        <button className="btn btn-ghost" onClick={() => void signOut()}>
          SAIR
        </button>
      </Centered>
    );
  return <Shell />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="centered">
      <Logo size="md" />
      <div className="card center">{children}</div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'inicio', label: 'Início', icon: House },
  { id: 'rotina', label: 'Rotina', icon: ListChecks },
  { id: 'suna', label: 'SUNA', icon: Sun },
  { id: 'evolucao', label: 'Evolução', icon: ChartIcon },
];

function Shell() {
  const { profile, setProfile } = useApp();
  // Primeiro acesso: entra direto na aba SUNA (personal e nutri virtual).
  const [tab, setTab] = useState<Tab>(profile?.onboarding_done ? 'inicio' : 'suna');
  const [milestone, setMilestone] = useState<number | null>(null);
  const [finalOpen, setFinalOpen] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const goTab = useCallback(
    (t: Tab) => {
      if (t !== 'suna' && profile && !profile.onboarding_done) void setProfile({ onboarding_done: true });
      setTab(t);
      window.scrollTo({ top: 0 });
    },
    [profile, setProfile],
  );

  const api = useMemo<ShellApi>(
    () => ({
      tab,
      goTab,
      celebrate: (d) => setMilestone(d),
      openFinal: () => setFinalOpen(true),
      openDay: (d) => {
        setOpenDay(d);
        goTab('rotina');
      },
    }),
    [tab, goTab],
  );

  return (
    <ShellCtx.Provider value={api}>
      <div className="app">
        <main className="main" key={tab}>
          {tab === 'inicio' && <Inicio />}
          {tab === 'rotina' && <Rotina openDay={openDay} setOpenDay={setOpenDay} />}
          {tab === 'suna' && <SunaTab />}
          {tab === 'evolucao' && <Evolucao />}
        </main>
        <nav className="tabbar" aria-label="Navegação principal">
          {TABS.map((t) => {
            const Icon = t.icon;
            const glow = t.id === 'suna' && !profile?.gpt_opened_at;
            return (
              <button key={t.id} className={`tab ${tab === t.id ? 'is-active' : ''} ${glow ? 'has-glow' : ''}`} onClick={() => goTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
                <Icon size={22} strokeWidth={tab === t.id ? 2.3 : 1.8} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {milestone !== null && <MilestoneOverlay day={milestone} onClose={() => setMilestone(null)} />}
      {finalOpen && (
        <FinalOverlay
          onClose={() => setFinalOpen(false)}
          onJourney={() => {
            setFinalOpen(false);
            goTab('evolucao');
          }}
        />
      )}
    </ShellCtx.Provider>
  );
}

/** Barra visível só no modo demonstração. Permite avançar o relógio para testar os 21 dias. */
function DemoBar() {
  const [off, setOff] = useState(() => Number(localStorage.getItem(DEMO_OFFSET_KEY) || '0'));
  useEffect(() => {
    document.body.classList.add('has-demo');
  }, []);
  const set = (n: number) => {
    const v = Math.max(0, n);
    localStorage.setItem(DEMO_OFFSET_KEY, String(v));
    setOff(v);
    window.location.reload();
  };
  return (
    <div className="demo-bar" role="note">
      <span>MODO DEMONSTRAÇÃO · sem validação de compra · dados só neste aparelho</span>
      <span className="demo-ctrl">
        Relógio +{off}d
        <button onClick={() => set(off - 1)} aria-label="Voltar um dia">
          −
        </button>
        <button onClick={() => set(off + 1)} aria-label="Avançar um dia">
          +
        </button>
      </span>
    </div>
  );
}

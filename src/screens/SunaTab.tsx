import { ExternalLink, LogOut } from 'lucide-react';
import { SUNA_CUSTOM_GPT_URL } from '../config';
import { useApp } from '../lib/store';
import { useShell } from '../components/shell-context';
import { Character, Logo, SaveIndicator } from '../components/ui';

export function SunaTab() {
  const { profile, setProfile, signOut, session } = useApp();
  const shell = useShell();
  const highlight = !profile?.gpt_opened_at;
  const available = !!SUNA_CUSTOM_GPT_URL;

  function opened() {
    // Abre em outra aba (link com target=_blank). A SUNA continua aberta e nada é apagado.
    const patch: Parameters<typeof setProfile>[0] = {};
    if (!profile?.gpt_opened_at) patch.gpt_opened_at = new Date().toISOString();
    if (!profile?.onboarding_done) patch.onboarding_done = true;
    if (Object.keys(patch).length) void setProfile(patch);
  }

  function continueToHome() {
    if (!profile?.onboarding_done) void setProfile({ onboarding_done: true });
    shell.goTab('inicio');
  }

  return (
    <div className="screen suna-tab">
      <header className="topbar">
        <Logo size="sm" />
        <SaveIndicator />
      </header>

      <div className="suna-hero">
        <Character size={190} motion="enter" />
        <h1 className="h-serif fade-up d1">Antes de começar, prepare sua jornada!</h1>
        <p className="fade-up d2">
          Você terá acesso à sua personal e nutri virtual para organizar seus treinos e sua alimentação durante os próximos 21 dias.
        </p>
      </div>

      <div className="gpt-zone fade-up d3">
        {highlight && <div className="start-here">COMECE POR AQUI</div>}
        {available ? (
          <div className={`gpt-ring ${highlight ? 'is-on' : ''}`}>
            <a className="btn btn-gpt" href={SUNA_CUSTOM_GPT_URL} target="_blank" rel="noopener noreferrer" onClick={opened}>
              CONVERSE COM SUA PERSONAL E NUTRI 💛 <ExternalLink size={16} />
            </a>
          </div>
        ) : (
          <div className="gpt-ring">
            <button className="btn btn-gpt" disabled aria-disabled="true">
              CONVERSE COM SUA PERSONAL E NUTRI 💛
            </button>
            <p className="unavailable" role="status">
              Este recurso está temporariamente indisponível. Sua jornada continua normalmente — tente novamente mais tarde.
            </p>
          </div>
        )}
        <p className="gpt-hint">Abre em uma nova aba. Sua jornada continua salva aqui na SUNA.</p>
      </div>

      <button className="btn btn-ghost" onClick={continueToHome}>
        {profile?.onboarding_done ? 'IR PARA O INÍCIO' : 'CONTINUAR PARA MINHA JORNADA'}
      </button>

      <p className="disclaimer">
        A personal e nutri virtual é uma ferramenta de apoio com inteligência artificial, externa à SUNA. Ela ajuda a organizar treinos e
        alimentação, mas não é uma profissional habilitada e não substitui a avaliação individual de nutricionista, profissional de educação
        física ou médico. Em caso de dor, condição de saúde, gestação ou pós-parto, procure orientação profissional.
      </p>

      <div className="account">
        <div>
          <strong>{profile?.name}</strong>
          <small>{session?.email}</small>
        </div>
        <button className="link-btn subtle" onClick={() => void signOut()}>
          <LogOut size={15} /> Sair
        </button>
      </div>
    </div>
  );
}

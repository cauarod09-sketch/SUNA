// Configurações editáveis da SUNA.
// Os valores vêm do arquivo .env (veja .env.example). Nada aqui é segredo: tudo vai para o navegador.

const env = import.meta.env;

/**
 * SUNA_CUSTOM_GPT_URL — link do GPT personalizado (personal e nutri virtual).
 * Defina VITE_SUNA_CUSTOM_GPT_URL no .env. Não inventamos o endereço:
 * enquanto estiver vazio, a aba SUNA mostra "recurso temporariamente indisponível".
 */
export const SUNA_CUSTOM_GPT_URL: string = (() => {
  const raw = (env.VITE_SUNA_CUSTOM_GPT_URL ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
})();

/** Fuso oficial da jornada. Os dias viram à meia-noite deste fuso. */
export const SUNA_TIMEZONE = 'America/Sao_Paulo';

export const TOTAL_DAYS = 21;

/** Arquivos oficiais da marca. Ajuste aqui se os nomes dos arquivos mudarem. */
export const ASSETS = {
  logo: '/assets/suna/logo-suna.png',
  icon: '/assets/suna/icone-suna.webp',
  /**
   * PNG oficial da personagem Suna. Coloque o arquivo em public/assets/suna/personagem-suna.png.
   * Enquanto ele não existir, o app usa o ícone oficial da marca no lugar (nunca uma imagem inventada).
   */
  character: '/assets/suna/personagem-suna.png',
};

/** Modo demonstração: só existe quando pedido explicitamente. Sem compra, sem servidor. Não publicar assim. */
export const DEMO_MODE = env.VITE_DEMO_MODE === 'true';
export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();
export const CONFIG_MISSING = !DEMO_MODE && (!SUPABASE_URL || !SUPABASE_ANON_KEY);

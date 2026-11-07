/* Service worker da Suna — SEGURO PARA PRIVACIDADE.
 * Guarda apenas o "casco" estático do app (HTML, JS, CSS, fontes, ícones) do MESMO domínio.
 * NUNCA intercepta requisições a outros domínios (Supabase: login, banco, compra) e nunca
 * guarda respostas de API, então nenhum dado da usuária fica em cache. */
const VERSION = 'suna-shell-v3';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/suna/logo-suna.png', '/assets/suna/icone-suna.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e terceiros passam direto pela rede
  if (req.mode === 'navigate') {
    // Rede primeiro (sempre a versão mais nova); sem internet, abre o casco salvo.
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  const isStatic = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/assets/suna/') || url.pathname === '/manifest.webmanifest';
  if (!isStatic) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

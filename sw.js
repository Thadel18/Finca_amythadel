const CACHE_NAME = 'finca-amythadel-cache-v7';
const LOCALES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const EXTERNOS = [
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js'
];

// Instalación: guarda cada archivo por separado (si uno falla, los demás igual se guardan)
self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(LOCALES.map((u) => cache.add(u)));
    await Promise.allSettled(EXTERNOS.map((u) => cache.add(new Request(u, { mode: 'no-cors' }))));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return; // APIs de Firebase (login/sync) pasan directo

  const url = new URL(req.url);
  const esLocal = url.origin === self.location.origin;
  const esFirebaseScript = EXTERNOS.includes(req.url);
  if (!esLocal && !esFirebaseScript) return;

  // Abrir la app: si no hay red, responde con index.html guardado
  if (req.mode === 'navigate') {
    evento.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const red = await fetch(req);
        cache.put('./index.html', red.clone());
        return red;
      } catch (e) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Resto: primero caché, y si no está, red (guardando copia)
  evento.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    try {
      const red = await fetch(req);
      cache.put(req, red.clone());
      return red;
    } catch (e) {
      return Response.error();
    }
  })());
});

const CACHE_NAME = 'finca-amythadel-cache-v10';
const TILE_CACHE = 'finca-tiles-v1';
const LOCALES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const EXTERNOS = [
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js'
];
const TILE_HOSTS = ['server.arcgisonline.com', 'tile.openstreetmap.org'];

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
    await Promise.all(nombres.filter((n) => n !== CACHE_NAME && n !== TILE_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Mapas: primero lo guardado; si no, internet (y se guarda para la próxima vez)
async function responderTile(req) {
  const cache = await caches.open(TILE_CACHE);
  const guardado = await cache.match(req.url);
  if (guardado) return guardado;
  try {
    const red = await fetch(req.url, { mode: 'cors' });
    if (red.ok) {
      cache.put(req.url, red.clone());
      if (Math.random() < 0.02) recortarTiles(cache);
    }
    return red;
  } catch (e) {
    try { return await fetch(req); } catch (e2) { return Response.error(); }
  }
}
async function recortarTiles(cache) {
  const claves = await cache.keys();
  if (claves.length > 4000) { for (const k of claves.slice(0, 600)) await cache.delete(k); }
}

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return; // APIs de Firebase (login/sync) pasan directo

  const url = new URL(req.url);
  if (TILE_HOSTS.includes(url.hostname)) { evento.respondWith(responderTile(req)); return; }

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

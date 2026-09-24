const CACHE_NAME = 'finca-amythadel-cache-v2';
const ARCHIVOS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((resp) =>
      resp || fetch(evento.request).then((r) => {
        return caches.open(CACHE_NAME).then((cache) => { cache.put(evento.request, r.clone()); return r; });
      }).catch(() => caches.match('./index.html'))
    )
  );
});

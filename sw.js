const CACHE_NAME = 'mini-jeux-v3';

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/common.css',
  'js/core.js',
  'games/taquin/index.html',
  'games/taquin/taquin.js',
  'games/2048/index.html',
  'games/2048/2048.js',
  'games/demineur/index.html',
  'games/demineur/demineur.js',
  'games/memory/index.html',
  'games/memory/memory.js',
  'games/lightsout/index.html',
  'games/lightsout/lightsout.js',
  'games/snake/index.html',
  'games/snake/snake.js',
  'games/simon/index.html',
  'games/simon/simon.js',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll échoue en bloc si une ressource manque : on tolère les absences.
      .then(cache => Promise.all(
        ASSETS.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Met en cache les nouvelles ressources même origine au passage.
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

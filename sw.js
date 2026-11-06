// Offline support: every file the game needs is cached on first visit, so it also plays with no connection.
// Bump VERSION whenever you publish changes; old caches are cleared automatically.
const VERSION = 'lemur-night-v2';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'assets/fonts/silkscreen.woff2',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-32.png',
  'src/main.js', 'src/state.js', 'src/store.js', 'src/config.js', 'src/content.js', 'src/world.js', 'src/boss.js',
  'src/fairness.js', 'src/render.js', 'src/sprites.js', 'src/pixel.js', 'src/audio.js', 'src/input.js',
];

self.addEventListener('install', (e) => {
  // cache files one by one: a single hiccup (flaky network, a stale CDN response) must not block offline mode
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.allSettled(FILES.map((f) => fetch(f, { cache: 'reload' }).then((r) => (r.ok ? c.put(f, r) : null)))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Serve from the cache straight away (fast and offline-proof), and refresh the cached copy in the background.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
    const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return cached || (await fresh) || new Response('Offline', { status: 503 });
  }));
});

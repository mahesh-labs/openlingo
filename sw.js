const CACHE_NAME = 'openlingo-v14';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './styles.css',
  './app.js',
  './assets/icons/openlingo-icon.svg',
  './assets/icons/openlingo-192.png',
  './assets/icons/openlingo-512.png',
  './src/srs.js',
  './src/exercises.js',
  './src/scripts.js',
  './src/drawboard.js',
  './src/config.js',
  './src/catalog.js',
  './src/googleSync.js',
  './manifest.webmanifest',
  './courses/registry.json',
  './courses/schema.json',
  './courses/en-ja/course.json',
  './courses/en-ja/levels/n5.json',
  './courses/en-ja/levels/n4.json',
  './courses/en-ja/levels/n3.json',
  './courses/en-ja/levels/n2.json',
  './courses/en-ja/levels/n1.json',
  './courses/en-es/course.json',
  './courses/en-es/levels/a1.json',
  './courses/en-es/levels/a2.json',
  './courses/en-es/levels/b1.json',
  './courses/en-es/levels/b2.json',
  './courses/en-es/levels/c1.json',
  './courses/en-ml/course.json',
  './courses/en-ml/levels/s1.json',
  './courses/en-ml/levels/s2.json',
  './courses/en-ml/levels/s3.json',
  './courses/en-ml/levels/s4.json',
  './courses/en-ml/levels/s5.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return; // Let GitHub catalog & Google OAuth/Drive requests pass straight through
  }
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

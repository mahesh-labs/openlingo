const CACHE_NAME = 'openlingo-v38';
const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './styles.css',
  './app.js',
  './assets/icons/openlingo-icon.svg',
  './assets/icons/openlingo-192.png',
  './assets/icons/openlingo-512.png',
  './src/icons.js',
  './src/appIcons.js',
  './src/updater.js',
  './src/courseMatrix.js',
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
  './courses/matrix/syllabus.json',
  // AUTO-GENERATED MATRIX LANGS START
  './courses/langs/en.json',
  './courses/langs/ml.json',
  './courses/langs/ta.json',
  './courses/langs/kn.json',
  './courses/langs/te.json',
  './courses/langs/hi.json',
  './courses/langs/ja.json',
  './courses/langs/zh.json',
  './courses/langs/ko.json',
  './courses/langs/ar.json',
  './courses/langs/es.json',
  './courses/langs/fr.json',
  './courses/langs/ru.json',
  './courses/i18n/en.json',
  './courses/i18n/ml.json',
  './courses/i18n/ta.json',
  './courses/i18n/kn.json',
  './courses/i18n/te.json',
  './courses/i18n/hi.json',
  './courses/i18n/ja.json',
  './courses/i18n/zh.json',
  './courses/i18n/ko.json',
  './courses/i18n/ar.json',
  './courses/i18n/es.json',
  './courses/i18n/fr.json',
  './courses/i18n/ru.json'
  // AUTO-GENERATED MATRIX LANGS END
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
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/__desktop/')
  ) {
    return; // Let API, desktop OAuth bridge, GitHub catalog & Google requests pass straight through
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

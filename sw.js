const CACHE_NAME = 'menoufia-forms-v4'; // Bumped version for new caching strategy
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/pages.css',
  './css/responsive.css',
  './js/config.js',
  './js/validators.js',
  './js/app/core.js',
  './js/app/admin.js',
  './js/app/crm.js',
  './js/app/i18n.js',
  './js/app/dashboard.js',
  './js/app/builder.js',
  './js/app/fill.js',
  './js/app/responses.js',
  './js/app/share.js',
  './js/app/compressor.js',
  './js/app/main.js'
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Cache-First for static assets, Network-First for API/HTML
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for our origin
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|woff2?|ttf)$/i);

  if (isStaticAsset) {
    // Cache-First strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  } else {
    // Network-First strategy for HTML and others
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

const CACHE_NAME = 'somnia-sanctum-v1';

// Add the exact filenames of any default local audio or image assets here
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './SomniaSanctum.png'
];

// 1. Install Event: Cache core assets on first load
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Sanctum Service Worker] Sealing core assets in the vault');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting(); // Force the waiting service worker to become the active one
});

// 2. Activate Event: Clean up old caches if the version changes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Sanctum Service Worker] Purging old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all pages immediately
});

// 3. Fetch Event: Strict Cache-First Strategy for Offline Isolation
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // Do not intercept external API calls (like Gemini) or cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return the locally cached version immediately if it exists
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, attempt to fetch from the network
        return fetch(event.request).then((networkResponse) => {
          // If the network response is valid, clone it and put it in the cache for future offline use
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      }).catch(() => {
        // Fallback for when both cache and network fail (e.g., deep offline without cache)
        console.log('[Sanctum Service Worker] Fetch failed, no cached fallback available.');
      })
  );
});

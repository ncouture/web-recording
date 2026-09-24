/**
 * PWA Service Worker (sw-pwa.ts)
 * Provides offline caching and installation for the Progressive Web App.
 * Only loaded in the web browser environment, never inside the Chrome Extension.
 */

interface ExtendableEvent extends Event {
  waitUntil(fn: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

interface ServiceWorkerScope {
  skipWaiting(): Promise<void>;
  clients: {
    claim(): Promise<void>;
  };
}

const sw = self as unknown as ServiceWorkerScope;

const CACHE_NAME = 'voicestudio-pwa-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e: Event) => {
  const event = e as ExtendableEvent;
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (err) {
        console.warn('[SW-PWA] Precache warning:', err);
      }
      return sw.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e: Event) => {
  const event = e as ExtendableEvent;
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => sw.clients.claim())
  );
});

self.addEventListener('fetch', (e: Event) => {
  const event = e as FetchEvent;
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-http schemes
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
          })
          .catch(() => {
            // Offline fallback; cached response is already returned
          });

        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If offline and request is for page navigation, fallback to root
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') as Promise<Response>;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

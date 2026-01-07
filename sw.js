const CACHE_NAME = 'skywatch-v2';
const DYNAMIC_CACHE_NAME = 'skywatch-dynamic-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
        .map(key => caches.delete(key))
      );
    })
  );
});

// Fetch: Implement caching strategies
self.addEventListener('fetch', (event) => {
  const isApiUrl = event.request.url.includes('api.met.no') || event.request.url.includes('api.bigdatacloud.net') || event.request.url.includes('api.sunrise-sunset.org');

  if (isApiUrl) {
    // Stale-while-revalidate for API calls
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

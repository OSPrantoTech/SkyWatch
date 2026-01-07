const CACHE_NAME = 'skywatch-v3';
const DYNAMIC_CACHE_NAME = 'skywatch-dynamic-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'
];

// Install: Cache static assets and take control immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

// Activate: Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
        .map(key => caches.delete(key))
      ).then(() => self.clients.claim()); // Take control of all open clients.
    })
  );
});

// Fetch: Implement network-falling-back-to-cache strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If we get a response from the network, cache it for future offline use
        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          // Only cache successful GET requests
          if (event.request.method === 'GET' && networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // If the network request fails (e.g., offline), try to get it from the cache
        // This will work for both API calls and static assets that have been pre-cached
        return caches.match(event.request);
      })
  );
});

// Notification Click: Handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Close the notification

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window for this PWA is already open, focus it
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Otherwise, open a new window
      return clients.openWindow('/');
    })
  );
});

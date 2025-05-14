// Service Worker for cache management
const CACHE_NAME = 'app-cache-v1';

// Install event - cache basic assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll([
          '/',
          '/index.html',
          // Add other static assets here
        ]);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request).then(
          response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});

// Listen for messages from the main script
self.addEventListener('message', event => {
  if (event.data === 'clearCache') {
    // Clear all caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Notify the main script that cache was cleared
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage('cacheCleared');
        });
      });
    });
  } else if (event.data.type === 'clearCache' && event.data.url) {
    // Clear specific URL from cache
    caches.open(CACHE_NAME).then(cache => {
      cache.delete(event.data.url).then(() => {
        console.log('Specific URL cache cleared:', event.data.url);
      });
    });
  }
});

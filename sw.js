// Service Worker para PWA
const CACHE_NAME = 'credi-jackeline-cache-v1';

// Arquivos para cache inicial
const urlsToCache = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação e limpeza de caches antigos
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

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Não fazer cache de URLs do Google Apps Script
  if (event.request.url.includes('script.google.com')) {
    // Para URLs do GAS, sempre buscar da rede
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.error('Falha ao buscar:', error);
          return caches.match(event.request);
        })
    );
  } else {
    // Para outros recursos, usar estratégia de cache-first
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(response => {
              // Não armazenar se a resposta não for válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clonar a resposta para armazenar no cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            });
        })
    );
  }
});

// Lidar com mensagens do cliente
self.addEventListener('message', event => {
  if (event.data === 'clearCache') {
    console.log('Limpando todo o cache');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage('cacheCleared'));
      });
    });
  } else if (event.data.type === 'clearCache' && event.data.url) {
    console.log('Limpando cache para URL específica:', event.data.url);
    caches.open(CACHE_NAME).then(cache => {
      // Limpar todas as entradas que contêm a URL base
      caches.match(new Request(event.data.url)).then(response => {
        if (response) {
          cache.delete(new Request(event.data.url));
        }
      });
      
      // Também tentar limpar variações da URL com parâmetros
      caches.keys().then(() => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage('cacheCleared'));
        });
      });
    });
  }
});

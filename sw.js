// Service Worker básico
const CACHE_NAME = 'crediario-jak-v1';

// Arquivos para cache inicial
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js'
];

// Instalação do service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tenta adicionar URLs ao cache, mas não falha se algum recurso não estiver disponível
        return cache.addAll(urlsToCache.map(url => new Request(url, { mode: 'no-cors' })))
          .catch(error => {
            console.warn('Alguns recursos não puderam ser cacheados:', error);
          });
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna o recurso do cache se disponível
        if (response) {
          return response;
        }
        
        // Caso contrário, busca na rede
        return fetch(event.request)
          .catch(error => {
            console.error('Falha ao buscar:', error);
            // Você pode retornar uma página offline aqui
          });
      })
  );
});

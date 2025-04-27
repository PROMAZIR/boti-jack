// Nome do cache
const CACHE_NAME = 'crediario-jak-v1.0.3';

// Arquivos para cache inicial
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png'
];

// Instalação do service worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Pré-cache de recursos importantes
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Erro de cache:', error);
      })
  );
});

// Ativação do service worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Garantir que o service worker seja ativado imediatamente
  return self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Ignorar requisições para o Google Apps Script
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retornar resposta do cache
        if (response) {
          return response;
        }
        
        // Clonar a requisição
        const fetchRequest = event.request.clone();
        
        // Fazer a requisição à rede
        return fetch(fetchRequest)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta
            const responseToCache = response.clone();
            
            // Adicionar ao cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Erro de fetch:', error);
            // Você pode retornar uma página offline aqui
          });
      })
  );
});

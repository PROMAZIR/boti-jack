const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `mercado-bf-${CACHE_VERSION}`;
const OFFLINE_URL = './';

// Arquivos para cache
const FILES_TO_CACHE = [
  './',
  './manifest.json'
];

// Instalação - cacheia arquivos essenciais
self.addEventListener('install', event => {
  console.log('🔥 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  console.log('🔥 Service Worker ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - estratégia Network First para Google Apps Script
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Para Google Apps Script, sempre tenta a rede primeiro
  if (url.hostname.includes('google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clona a resposta antes de cachear
          const responseToCache = response.clone();
          
          // Cacheia apenas respostas bem-sucedidas
          if (response.status === 200) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache));
          }
          
          return response;
        })
        .catch(() => {
          // Se falhar, tenta o cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Se não houver cache, retorna página offline
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // Para outros recursos, usa cache first
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then(response => {
            // Não cacheia respostas não-OK
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache));
            
            return response;
          });
      })
  );
});

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🔥 Service Worker BLACK FRIDAY carregado!');

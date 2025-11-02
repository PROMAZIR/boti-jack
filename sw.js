// Service Worker - Black Friday Mercado Delivery PWA
const CACHE_VERSION = 'bf-mercado-v1.0.0';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// URLs dinâmicas (não cachear)
const DYNAMIC_URLS = [
  'https://script.google.com/macros/s/AKfycbyEvu2F1tD3jHHNWvTAGFYsoosmAlYWRv8bwmmUtWujN0R0UXspfxxr298AoWut73YZ/exec'
];

// Instalação - Cache de assets estáticos
self.addEventListener('install', event => {
  console.log('🔥 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        console.log('📦 Cache aberto');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('✅ Assets em cache');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Erro no cache:', err);
      })
  );
});

// Ativação - Limpar caches antigos
self.addEventListener('activate', event => {
  console.log('🔥 Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_VERSION) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker ativado');
        return self.clients.claim();
      })
  );
});

// Estratégia: Network First com fallback para Cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar chrome-extension e outras URLs especiais
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Para URLs dinâmicas (Google Apps Script): sempre buscar da rede
  const isDynamicUrl = DYNAMIC_URLS.some(dynUrl => request.url.includes(dynUrl));
  
  if (isDynamicUrl) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Se offline, retornar mensagem
          return new Response(
            JSON.stringify({ 
              error: 'Sem conexão. Conecte-se à internet para continuar.' 
            }),
            { 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        })
    );
    return;
  }

  // Para assets estáticos: Cache First
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(response => {
            // Cachear apenas respostas válidas
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clonar resposta para cache
            const responseToCache = response.clone();
            
            caches.open(CACHE_VERSION)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback offline
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#000;color:#fff;}h1{color:#FF6B35;}</style></head><body><h1>🔥 Black Friday</h1><p>Sem conexão</p><p>Conecte-se à internet para continuar</p></body></html>',
              { 
                headers: { 'Content-Type': 'text/html' } 
              }
            );
          });
      })
  );
});

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        })
        .then(() => {
          return self.clients.matchAll();
        })
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        })
    );
  }
});

// Background Sync (se suportado)
if (self.registration.sync) {
  self.addEventListener('sync', event => {
    if (event.tag === 'sync-orders') {
      event.waitUntil(
        // Sincronizar pedidos pendentes
        console.log('🔄 Sincronizando pedidos...')
      );
    }
  });
}

console.log(`
🔥 BLACK FRIDAY SERVICE WORKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Versão: ${CACHE_VERSION}
📦 Assets em cache
⚡ Network First
🔄 Auto-update
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

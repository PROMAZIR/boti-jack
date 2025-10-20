// === SERVICE WORKER PARA MERCADO DELIVERY PWA ===
// Versão: 1.0.0

const CACHE_NAME = 'mercado-delivery-v1';
const CACHE_VERSION = '1.0.0';

// URLs essenciais para cache
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Recursos externos essenciais
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// === INSTALAÇÃO ===
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalando...', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache aberto:', CACHE_NAME);
        
        // Cache dos assets principais (com tratamento de erro individual)
        return Promise.allSettled([
          ...CORE_ASSETS.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`⚠️ Não foi possível cachear: ${url} (${response.status})`);
              })
              .catch(error => {
                console.warn(`⚠️ Erro ao cachear ${url}:`, error.message);
              })
          ),
          // Cache de recursos externos
          ...EXTERNAL_RESOURCES.map(url =>
            fetch(url, { mode: 'cors' })
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(error => {
                console.warn(`⚠️ Recurso externo não cacheado: ${url}`);
              })
          )
        ]);
      })
      .then(() => {
        console.log('✅ Cache inicial configurado');
        return self.skipWaiting(); // Ativa imediatamente
      })
      .catch(error => {
        console.error('❌ Erro ao configurar cache:', error);
      })
  );
});

// === ATIVAÇÃO ===
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker ativando...', CACHE_NAME);
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker ativo e pronto');
        return self.clients.claim(); // Assume controle imediatamente
      })
  );
});

// === ESTRATÉGIAS DE CACHE ===

// Network First (para o iframe do mercado - sempre buscar a versão mais recente)
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      // Se a resposta é válida, cacheia e retorna
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(request, responseToCache))
          .catch(err => console.warn('Erro ao cachear:', err));
      }
      return response;
    })
    .catch(() => {
      // Se falhar, tenta buscar do cache
      return caches.match(request)
        .then(response => {
          if (response) {
            console.log('📦 Servindo do cache (fallback):', request.url);
            return response;
          }
          // Se não há cache, retorna erro
          return new Response('Offline - Conteúdo não disponível', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
    });
}

// Cache First (para assets estáticos)
function cacheFirst(request) {
  return caches.match(request)
    .then(response => {
      if (response) {
        console.log('📦 Servindo do cache:', request.url);
        return response;
      }
      
      // Se não está em cache, busca da rede
      return fetch(request)
        .then(fetchResponse => {
          if (fetchResponse && fetchResponse.status === 200) {
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache))
              .catch(err => console.warn('Erro ao cachear:', err));
          }
          return fetchResponse;
        });
    });
}

// === FETCH HANDLER ===
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições de extensões do navegador
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // Ignora requisições POST, PUT, DELETE, etc
  if (request.method !== 'GET') {
    return;
  }

  // Para o HTML principal e manifest - sempre buscar versão mais recente
  if (
    request.url.includes('index.html') || 
    request.url.endsWith('/') ||
    request.url.includes('manifest.json')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Para recursos externos (CDN, APIs, etc) - Network First
  if (
    url.origin !== location.origin ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('script.google.com')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Para assets locais - Cache First
  event.respondWith(cacheFirst(request));
});

// === MENSAGENS ===
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Pulando espera...');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ Limpando cache...');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Removendo cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ Cache limpo com sucesso');
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_CLEARED',
            success: true
          });
        });
      })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({
      type: 'VERSION',
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });
  }
});

// === NOTIFICAÇÕES DE PUSH (Opcional - para futuras funcionalidades) ===
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nova notificação do Mercado Delivery',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'mercado-notification',
      requireInteraction: false,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Mercado Delivery', options)
    );
  }
});

// === CLIQUE EM NOTIFICAÇÃO ===
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Se já existe uma janela aberta, foca nela
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não existe, abre uma nova janela
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// === SINCRONIZAÇÃO EM BACKGROUND (Opcional) ===
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    console.log('🔄 Sincronizando pedidos...');
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    // Aqui você pode implementar lógica de sincronização
    // Por exemplo, enviar pedidos pendentes quando voltar online
    console.log('✅ Sincronização concluída');
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// === LOG DE INICIALIZAÇÃO ===
console.log(`
🛒 MERCADO DELIVERY SERVICE WORKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Cache: ${CACHE_NAME}
🔢 Versão: ${CACHE_VERSION}
🌐 Scope: ${self.registration.scope}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

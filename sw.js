// Service Worker para PWA
const CACHE_NAME = 'cred-jackeline-v1.1'; // Incrementar versão para forçar atualização
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
  console.log('Service Worker instalando...');
  
  // Forçar ativação imediata sem esperar que abas antigas fechem
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker ativando...');
  
  // Tomar controle de todas as páginas imediatamente
  event.waitUntil(
    clients.claim()
      .then(() => {
        // Limpar caches antigos
        return caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName !== CACHE_NAME) {
                console.log('Removendo cache antigo:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        });
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  // Não interceptar requisições do Google Apps Script
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retornar resposta
        if (response) {
          return response;
        }
        
        // Clonar a requisição
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Verificar se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta
            const responseToCache = response.clone();
            
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

// Escutar mensagens do cliente
self.addEventListener('message', event => {
  if (event.data === 'clearCache') {
    console.log('Limpando todo o cache...');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Cache limpo com sucesso');
      // Notificar clientes que o cache foi limpo
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage('cacheCleared'));
      });
    });
  } else if (event.data && event.data.type === 'clearCache' && event.data.url) {
    console.log('Limpando cache para URL específica:', event.data.url);
    caches.open(CACHE_NAME).then(cache => {
      cache.delete(new Request(event.data.url)).then(success => {
        console.log('URL removida do cache:', success);
      });
    });
  }
});

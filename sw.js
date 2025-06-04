// Service Worker para CRED-Fernanda PWA
const CACHE_NAME = 'cred-fernanda-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/site.webmanifest.json',
    'https://i.ibb.co/kj8jVkq/Logotipo-Faustino-Representa-es-e-Vendas-Moderno-Preto-Branco-2.png',
    'https://i.ibb.co/vx4BtbSv/Sem-t-tulo-1.png'
];

// Instalação do Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Cache aberto');
                return cache.addAll(urlsToCache);
            })
            .then(function() {
                console.log('✅ Service Worker: Instalado com sucesso');
                return self.skipWaiting();
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', function(event) {
    console.log('🚀 Service Worker: Ativando...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            console.log('✅ Service Worker: Ativado com sucesso');
            return self.clients.claim();
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Retorna do cache se disponível
                if (response) {
                    return response;
                }
                
                // Senão, busca na rede
                return fetch(event.request).then(function(response) {
                    // Verifica se é uma resposta válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clona a resposta
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(function() {
                // Fallback para quando estiver offline
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Sincronização em background
self.addEventListener('sync', function(event) {
    if (event.tag === 'background-sync') {
        console.log('🔄 Sincronização em background');
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    return new Promise(function(resolve) {
        // Implementar sincronização de dados se necessário
        console.log('📡 Executando sincronização...');
        resolve();
    });
}

// Notificações push (futuro)
self.addEventListener('push', function(event) {
    console.log('📬 Push recebido:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nova notificação da Jackeline! 💖',
        icon: 'https://i.ibb.co/kj8jVkq/Logotipo-Faustino-Representa-es-e-Vendas-Moderno-Preto-Branco-2.png',
        badge: 'https://i.ibb.co/vx4BtbSv/Sem-t-tulo-1.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2'
        },
        actions: [
            {
                action: 'explore',
                title: 'Abrir App',
                icon: 'https://i.ibb.co/kj8jVkq/Logotipo-Faustino-Representa-es-e-Vendas-Moderno-Preto-Branco-2.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: 'https://i.ibb.co/vx4BtbSv/Sem-t-tulo-1.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('CRED-Fernanda', options)
    );
});

// Clique em notificações
self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Notificação clicada:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Apenas fecha a notificação
        return;
    } else {
        // Clique na notificação principal
        event.waitUntil(
            clients.matchAll().then(function(clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Atualização do Service Worker
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Log de erros
self.addEventListener('error', function(event) {
    console.error('❌ Erro no Service Worker:', event.error);
});

console.log('🎉 Service Worker do CRED-Fernanda carregado!');

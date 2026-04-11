/**
 * Service Worker — Storey Luxor PWA
 * Estratégia: Network-First para API, Cache-First para assets estáticos.
 * Garante funcionamento offline e instalação como app no iPhone e Android.
 */

const CACHE_VERSION = 'v3';
const CACHE_STATIC = `storey-luxor-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `storey-luxor-dynamic-${CACHE_VERSION}`;

// Assets que SEMPRE devem estar em cache (shell do app)
const STATIC_ASSETS = [
    '/',
    '/css/output.css',
    '/js/main.js',
    '/js/ui.js',
    '/js/events.js',
    '/js/chat.js',
    '/js/api.js',
    '/js/config.js',
    '/js/modals.js',
    '/js/pdfGenerator.js',
    '/js/skeleton.js',
    '/js/sync.js',
    '/js/utils.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// ─── INSTALAÇÃO: pré-cache dos assets estáticos ─────────────────────────────
self.addEventListener('install', event => {
    console.log('[SW] Instalando Service Worker...');
    self.skipWaiting(); // Ativa imediatamente sem esperar o reload
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => {
            console.log('[SW] Pré-cacheando assets estáticos...');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Alguns assets não puderam ser cacheados:', err);
            });
        })
    );
});

// ─── ATIVAÇÃO: limpa caches antigos ─────────────────────────────────────────
self.addEventListener('activate', event => {
    console.log('[SW] Ativando Service Worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_STATIC && name !== CACHE_DYNAMIC)
                    .map(name => {
                        console.log('[SW] Removendo cache antigo:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Toma controle das abas abertas
    );
});

// ─── FETCH: estratégia por tipo de requisição ────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Requisições de API → Network-First (dados sempre frescos)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 2. Socket.io — não cachear
    if (url.pathname.startsWith('/socket.io/')) {
        event.respondWith(fetch(request));
        return;
    }

    // 3. Assets estáticos → Cache-First (performance máxima)
    event.respondWith(cacheFirst(request));
});

// ─── ESTRATÉGIA: Network-First (para API) ───────────────────────────────────
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        // Cacheia a resposta bem-sucedida da API para fallback offline
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        // Offline: retorna do cache se disponível
        const cached = await caches.match(request);
        if (cached) return cached;
        // Sem cache: retorna erro JSON amigável
        return new Response(
            JSON.stringify({ error: 'Sem conexão. Dados podem estar desatualizados.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ─── ESTRATÉGIA: Cache-First (para assets estáticos) ────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        // Fallback para a raiz se offline e sem cache
        const fallback = await caches.match('/');
        return fallback || new Response('App offline. Sem cache disponível.', { status: 503 });
    }
}

// ─── PUSH NOTIFICATIONS (para notificações futuras) ─────────────────────────
self.addEventListener('push', event => {
    if (!event.data) return;

    let data = {};
    try { data = event.data.json(); } catch (e) { data = { title: 'Storey Luxor', body: event.data.text() }; }

    const options = {
        body: data.body || 'Nova notificação',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
        actions: data.actions || [],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Storey Luxor', options)
    );
});

// ─── Clique na notificação → abre o app ─────────────────────────────────────
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(targetUrl);
        })
    );
});
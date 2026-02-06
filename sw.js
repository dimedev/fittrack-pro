// ==================== REPZY SERVICE WORKER ====================
// Version: 1.0.0
// Stratégie: Cache-first pour assets statiques, Network-first pour API
// Offline-first avec Background Sync

const CACHE_VERSION = 'repzy-v1.0.4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Déterminer le base path (pour GitHub Pages ou localhost)
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, '');

// Assets statiques à pré-cacher (App Shell) - chemins relatifs
const STATIC_ASSETS_RELATIVE = [
    '',
    'index.html',
    'webmanifest',
    // CSS
    'css/style-nike-shadcn.css',
    'css/mobile-premium.css',
    'css/session-manager.css',
    'css/premium-components.css',
    'css/nutrition-premium.css',
    'css/mobile-ux-fixes.css',
    'css/journal-macros.css',
    'css/icons.css',
    'css/theme.css',
    // JS Core
    'js/app.js',
    'js/modules/state.js',
    'js/modules/database.js',
    'js/modules/supabase.js',
    'js/modules/ui.js',
    // JS Training
    'js/modules/training.js',
    'js/modules/session-manager.js',
    'js/modules/session-ui.js',
    'js/modules/smart-training.js',
    'js/modules/health-integration.js',
    'js/modules/timer.js',
    // JS Nutrition
    'js/modules/nutrition.js',
    'js/modules/food-api.js',
    'js/modules/recipes.js',
    'js/modules/meal-templates.js',
    'js/modules/meal-history.js',
    'js/modules/barcode-scanner.js',
    'js/modules/hydration.js',
    // JS Other
    'js/modules/progress.js',
    'js/modules/profile.js',
    'js/modules/goals.js',
    'js/modules/cardio.js',
    'js/modules/photos.js',
    'js/modules/achievements.js',
    'js/modules/haptic.js',
    'js/modules/audio-feedback.js',
    'js/modules/premium-ui.js',
    'js/modules/mobile-gestures.js',
    'js/modules/theme.js',
    'js/modules/plate-calculator.js',
    'js/modules/nutrition-suggestions.js',
    'js/modules/icons.js',
    // JS Data
    'js/data/exercises.js',
    'js/data/foods.js',
    'js/data/programs.js',
    // Icons
    'favicon.ico',
    'favicon.svg',
    'favicon-96x96.png',
    'apple-touch-icon.png',
    'web-app-manifest-192x192.png',
    'web-app-manifest-512x512.png'
];

// Construire les chemins absolus basés sur le BASE_PATH
const STATIC_ASSETS = STATIC_ASSETS_RELATIVE.map(path => BASE_PATH + path);

// CDNs externes à cacher
const EXTERNAL_CDNS = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
    'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Patterns pour identifier les requêtes API
const API_PATTERNS = [
    /supabase\.co/,
    /openfoodfacts\.org/
];

// ==================== INSTALLATION ====================

self.addEventListener('install', (event) => {
    console.log('[SW] Installation...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pré-cache des assets statiques...');
                // Ajouter les assets un par un pour gérer les erreurs individuellement
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Impossible de cacher: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Assets statiques cachés');
                // Activer immédiatement le nouveau SW
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Erreur installation:', error);
            })
    );
});

// ==================== ACTIVATION ====================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activation...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Supprimer les anciens caches
                            return name.startsWith('repzy-') && name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE && name !== API_CACHE;
                        })
                        .map((name) => {
                            console.log(`[SW] Suppression ancien cache: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activé - Prise de contrôle des clients');
                // Prendre le contrôle immédiatement
                return self.clients.claim();
            })
    );
});

// ==================== FETCH STRATEGY ====================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignorer les requêtes chrome-extension et autres non-http
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Stratégie selon le type de ressource
    if (isApiRequest(url)) {
        // API: Network-first avec fallback cache
        event.respondWith(networkFirstStrategy(request, API_CACHE));
    } else if (isStaticAsset(url) || isCdnRequest(url)) {
        // Assets statiques: Cache-first avec fallback network
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else if (url.pathname.includes('/img/') || isImageRequest(request)) {
        // Images: Cache-first avec expiration
        event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
    } else {
        // Autres requêtes: Stale-while-revalidate
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    }
});

// ==================== CACHE STRATEGIES ====================

/**
 * Cache-first: Retourne le cache si disponible, sinon fetch et cache
 */
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            // Mettre à jour le cache en arrière-plan (optionnel)
            fetchAndCache(request, cache);
            return cachedResponse;
        }

        // Pas en cache, fetch et stocker
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache-first error:', error);
        // Retourner une page offline si navigation
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }
        throw error;
    }
}

/**
 * Network-first: Essaie le réseau d'abord, fallback sur cache
 */
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Si c'est une API, retourner une réponse d'erreur structurée
        if (isApiRequest(new URL(request.url))) {
            return new Response(
                JSON.stringify({
                    error: 'offline',
                    message: 'Vous êtes hors ligne. Les données seront synchronisées à la reconnexion.'
                }),
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        throw error;
    }
}

/**
 * Stale-while-revalidate: Retourne le cache immédiatement et met à jour en arrière-plan
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Mettre à jour le cache en arrière-plan
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.warn('[SW] Background fetch failed:', error);
        });

    // Retourner le cache si disponible, sinon attendre le réseau
    return cachedResponse || fetchPromise;
}

/**
 * Fetch et cache en arrière-plan (sans bloquer)
 */
function fetchAndCache(request, cache) {
    fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response);
            }
        })
        .catch(() => {
            // Silencieux - c'est une mise à jour optimiste
        });
}

// ==================== HELPER FUNCTIONS ====================

function isApiRequest(url) {
    return API_PATTERNS.some(pattern => pattern.test(url.href));
}

function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.html', '.json', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
           url.pathname === BASE_PATH ||
           url.pathname === BASE_PATH + 'index.html';
}

function isCdnRequest(url) {
    return url.hostname.includes('cdn.jsdelivr.net') ||
           url.hostname.includes('fonts.googleapis.com') ||
           url.hostname.includes('fonts.gstatic.com');
}

function isImageRequest(request) {
    const acceptHeader = request.headers.get('Accept') || '';
    return acceptHeader.includes('image') ||
           /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(new URL(request.url).pathname);
}

// ==================== BACKGROUND SYNC ====================

self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-pending-data') {
        event.waitUntil(syncPendingData());
    }
});

async function syncPendingData() {
    try {
        // Notifier tous les clients de synchroniser
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_PENDING_DATA',
                timestamp: Date.now()
            });
        });
        console.log('[SW] Sync notification envoyée aux clients');
    } catch (error) {
        console.error('[SW] Erreur sync:', error);
    }
}

// ==================== MESSAGES ====================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CACHE_URLS':
            // Permettre au client de demander le cache d'URLs spécifiques
            if (payload?.urls) {
                cacheUrls(payload.urls);
            }
            break;

        case 'CLEAR_CACHE':
            clearAllCaches();
            break;

        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.source.postMessage({
                    type: 'CACHE_STATUS',
                    payload: status
                });
            });
            break;
    }
});

async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    return Promise.allSettled(
        urls.map(url => cache.add(url).catch(err => console.warn(`Cache failed: ${url}`)))
    );
}

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter(name => name.startsWith('repzy-'))
            .map(name => caches.delete(name))
    );
    console.log('[SW] Tous les caches supprimés');
}

async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};

    for (const name of cacheNames.filter(n => n.startsWith('repzy-'))) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        status[name] = keys.length;
    }

    return {
        version: CACHE_VERSION,
        caches: status,
        timestamp: Date.now()
    };
}

// ==================== PUSH NOTIFICATIONS (Future) ====================

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nouvelle notification Repzy',
        icon: '/web-app-manifest-192x192.png',
        badge: '/favicon-96x96.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Repzy', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // Focuser sur un onglet existant ou en ouvrir un nouveau
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow('/');
            })
    );
});

console.log('[SW] Service Worker chargé - Version:', CACHE_VERSION);

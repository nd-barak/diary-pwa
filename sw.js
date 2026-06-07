const CACHE_NAME = 's-diary-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles/main.css',
    './js/crypto.js',
    './js/db.js',
    './js/auth.js',
    './js/sync.js',
    './js/app.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// Installation du SW : on met en cache les fichiers vitaux
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Fichiers mis en cache avec succès');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activation : Nettoyage des vieux caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interception des requêtes avec stratégie Cache-First
self.addEventListener('fetch', (event) => {
    // Si la requête est en POST (ex. API externe, ce qui n'arrive pas ici, mais au cas où), bypass.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Retourner le cache si trouvé
            if (cachedResponse) {
                return cachedResponse;
            }
            // Sinon récupérer sur le réseau (et optionnellement on pourrait mettre en cache)
            return fetch(event.request).catch(() => {
                console.error('Erreur réseau et aucune ressource en cache pour:', event.request.url);
            });
        })
    );
});

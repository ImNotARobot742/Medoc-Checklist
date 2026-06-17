const CACHE_NAME = 'medoc-checklist-v2';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'script.js',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const pathname = url.pathname || '';

  // Use network-first for main assets so the latest app logic runs and localStorage behavior is current.
  const networkFirstAssets = ['/', '/index.html', 'index.html', '/script.js', 'script.js', '/manifest.json', 'manifest.json'];

  if (networkFirstAssets.includes(pathname) || networkFirstAssets.includes(req.url)) {
    event.respondWith(
      fetch(req).then((res) => {
        // update cache with fresh response
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(req, res.clone()); } catch (e) {}
        });
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }

  // For other assets, prefer cache first for offline availability
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      return caches.open(CACHE_NAME).then((cache) => {
        try { cache.put(req, res.clone()); } catch (e) {}
        return res;
      });
    })).catch(() => caches.match('index.html'))
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = data;
    self.registration.showNotification(title, { body });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
    event.waitUntil(
    clients.matchAll({ type: 'window' }).then((c) => {
      if (c.length > 0) return c[0].focus();
      return clients.openWindow('./');
    })
  );
});

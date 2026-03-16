/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Push Notifications ---
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const payload = data.record || data;

  const title = payload.title || 'BonPlanInfos';
  const options = {
    body: payload.message || 'Nouvelle notification pour vous.',
    icon: '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.data?.link || payload.data?.url || '/notifications',
      ...payload.data
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ],
    tag: payload.type || 'general'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          if (urlToOpen) client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// --- Fetch Event ---
// Intercepter les requêtes pour ignorer le cache des fichiers audio
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 🔹 Ne jamais mettre en cache les mp3
  if (url.endsWith('.mp3')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 🔹 Pour les autres requêtes, passez simplement
  // (vous pouvez ajouter un cache first ou network first ici si vous voulez)
});
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  // Extract notification details from payload (Supabase Edge Function structure)
  // Payload might be { record: { title, message, ... } } or just flat { title, message }
  const payload = data.record || data;
  
  const title = payload.title || 'BonPlanInfos';
  const options = {
    body: payload.message || 'Nouvelle notification pour vous.',
    icon: '/pwa-192x192.png', // Ensure this exists or use fallback
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

  // Sound effect handling (browser dependent)
  // Service Workers cannot play audio directly via Audio(), but 'sound' option works on some platforms
  // or we rely on system notification sounds.
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          if (urlToOpen) {
             client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
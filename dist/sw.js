/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
/* eslint-env serviceworker */
/* global self, clients */

self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('📨 Service Worker: Push Received', event);

  let data = {
    title: 'BonPlanInfos',
    body: 'Nouvelle notification',
    icon: '/icon-192x192.png',
    url: '/'
  };

  if (event.data) {
    try {
      const jsonPayload = event.data.json();
      data = { ...data, ...jsonPayload };
      // Often backend sends data inside a 'record' or 'data' field, adjust if necessary
      if (jsonPayload.data) {
          data = { ...data, ...jsonPayload.data };
      }
    } catch (e) {
      console.warn('Push data is not JSON, using text body');
      data.body = event.data.text();
    }
  }

  console.log('Push notification data:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    image: data.image,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      ...data
    },
    actions: data.actions || [],
    tag: data.tag || 'general-notification',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Notification Clicked', event.notification);
  
  event.notification.close();

  // Get URL to open
  const urlToOpen = event.notification.data?.url || '/';

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, check if there is any window open we can navigate
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
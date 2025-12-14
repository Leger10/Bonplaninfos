/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

// Service Worker for BonPlanInfos
// Handles Push Notifications, Caching, and Background Sync

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('SW: Installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('SW: Activated');
});

// Handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('SW: Push Received', event);

  let data = { 
    title: 'BonPlanInfos', 
    body: 'Nouvelle notification', 
    url: '/',
    icon: '/icon-192x192.png'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: '/badge.png', // Small monochrome icon for status bar
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      id: data.id
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ],
    requireInteraction: true // Keeps notification until user interacts
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // If tab is open, focus it and navigate
        if (client.url && 'focus' in client) {
          return client.focus().then(focusedClient => {
             // Optional: Navigate to specific URL if needed, or just focus
             if (focusedClient.navigate) {
                 return focusedClient.navigate(targetUrl);
             }
             return focusedClient;
          });
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
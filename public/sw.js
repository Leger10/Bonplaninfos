/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
/* eslint-env serviceworker */
/* global self, clients */

// Sons pour différents types de notifications
const notificationSounds = {
  event: '/sounds/event-notification.mp3',
  earning: '/sounds/coin-earned.mp3',
  message: '/sounds/message-received.mp3',
  default: '/sounds/notification-default.mp3'
};
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

// Gestionnaire d'installation
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker installé');
  self.skipWaiting(); // Activation immédiate
});

// Gestionnaire d'activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  event.waitUntil(self.clients.claim());
});

// Gestionnaire de messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestionnaire de notifications push
self.addEventListener('push', (event) => {
  console.log('📨 Notification push reçue:', event);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Erreur parsing données push:', error);
    data = {
      title: 'Nouvelle notification',
      body: 'Vous avez reçu une nouvelle notification.',
    };
  }

  const options = {
    body: data.body || 'Nouvelle notification BonPlanInfos',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    image: data.image,
    data: {
      url: data.url || '/',
      type: data.type || 'general'
    },
    actions: data.actions || [],
    tag: data.tag || 'bonplaninfos-notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'BonPlanInfos', options)
  );
});

// Gestionnaire de clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée:', event.notification);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Chercher un onglet déjà ouvert
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Naviguer vers l'URL de la notification
            if (urlToOpen !== '/') {
              client.postMessage({
                type: 'NAVIGATE_TO',
                url: urlToOpen
              });
            }
          });
        }
      }

      // Ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gestionnaire de fermeture de notification
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification fermée:', event.notification);
});
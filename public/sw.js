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

// Cache name for static assets
const STATIC_CACHE = 'bonplaninfos-static-v1';

// URLs to cache during install
const STATIC_URLS = [
  '/icon-192x192.png',
  '/badge-72x72.png',
  '/sounds/notification-default.mp3'
];

// Gestionnaire d'installation
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker installé');
  
  // Cache les assets statiques importants
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting()) // Activation immédiate
  );
});

// Gestionnaire d'activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE) {
              console.log('🗑️ Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Gestionnaire de messages
self.addEventListener('message', (event) => {
  console.log('📨 Message reçu dans SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestionnaire de notifications push
self.addEventListener('push', (event) => {
  console.log('📨 Notification push reçue');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('❌ Erreur parsing données push:', error);
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
      type: data.type || 'general',
      id: data.id || Date.now().toString()
    },
    actions: data.actions || [],
    tag: data.tag || 'bonplaninfos-notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: data.timestamp || Date.now(),
    silent: data.silent || false
  };

  // Jouer un son si disponible et configuré
  if (data.sound && notificationSounds[data.sound]) {
    playNotificationSound(notificationSounds[data.sound]);
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'BonPlanInfos', 
      options
    ).then(() => {
      console.log('✅ Notification affichée:', data.title);
    }).catch((error) => {
      console.error('❌ Erreur affichage notification:', error);
    })
  );
});

// Gestionnaire de clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée:', event.notification.data);
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Chercher un onglet déjà ouvert sur le même domaine
      const existingClient = clientList.find(client => {
        const clientUrl = new URL(client.url);
        return clientUrl.origin === self.location.origin;
      });

      if (existingClient) {
        // Focus sur l'onglet existant
        existingClient.focus();
        
        // Envoyer un message pour navigation si nécessaire
        if (urlToOpen !== '/') {
          existingClient.postMessage({
            type: 'NAVIGATE_TO',
            url: urlToOpen,
            notificationId: event.notification.data?.id
          });
        }
        return;
      }

      // Ouvrir une nouvelle fenêtre si aucun client existant
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }).catch((error) => {
      console.error('❌ Erreur gestion clic notification:', error);
      // Fallback: ouvrir dans une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gestionnaire de fermeture de notification
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification fermée:', event.notification.data);
  
  // Envoyer un événement de fermeture si nécessaire
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSED',
          notificationId: event.notification.data?.id
        });
      });
    })
  );
});

// Fonction pour jouer un son de notification
function playNotificationSound(soundUrl) {
  // Implémentation basique pour jouer un son
  // Note: Cette fonctionnalité peut avoir des limitations selon le navigateur
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.3;
    audio.play().catch(e => console.log('🔇 Son non joué:', e));
  } catch (error) {
    console.log('🔇 Impossible de jouer le son:', error);
  }
}

// Gestionnaire de fetch pour le cache (optionnel)
self.addEventListener('fetch', (event) => {
  // Cache stratégique pour les assets critiques
  if (event.request.url.includes('/icon-') || event.request.url.includes('/badge-')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
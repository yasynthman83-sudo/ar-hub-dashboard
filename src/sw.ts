/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

// ===== PUSH NOTIFICATIONS (MUST BE FIRST - before any async work) =====
self.addEventListener('push', function (event) {
  // Default fallback data
  let title = '📋 New Pick List';
  let body = 'بكلست جديدة';
  let url = '/';
  let icon = '/pwa-192x192.png';
  let badge = '/pwa-192x192.png';

  if (event.data) {
    try {
      const parsed = event.data.json();
      title = parsed.title || title;
      body = parsed.body || parsed.message || body;
      url = parsed.url || parsed.link || url;
      icon = parsed.icon || icon;
      badge = parsed.badge || badge;
    } catch (_e) {
      try {
        body = event.data.text() || body;
      } catch (_e2) {
        // use defaults
      }
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: 'picklist-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: { url: url, clickAction: url },
  } as NotificationOptions;

  // CRITICAL: waitUntil keeps SW alive until notification is shown
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.clickAction || event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// ===== WORKBOX (loaded AFTER push handlers are registered) =====
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

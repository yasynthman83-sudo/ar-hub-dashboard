// Push notification handler for service worker
self.addEventListener('push', function(event) {
  console.log('[Push SW] Push received:', event);
  
  let data = { title: '📋 New Pick List', body: 'بكلست جديدة' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || 'بكلست جديدة',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'picklist-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: { url: '/' },
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '📋 New Pick List', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Push SW] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].visibilityState === 'visible') {
          return clientList[i].focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

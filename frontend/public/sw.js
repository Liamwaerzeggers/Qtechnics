/* MaxQ Service Worker - Push Notifications */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Push notification received */
self.addEventListener('push', (event) => {
  let data = { title: 'MaxQ', body: 'Nieuwe melding', url: '/' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : 'Nieuwe melding';
  }

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'maxq-notification',
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MaxQ', options)
  );
});

/* Notification click handler */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

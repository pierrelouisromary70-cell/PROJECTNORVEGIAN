/* Nordic Run service worker — push notifications.
 * Kept dependency-free and defensive: a malformed payload must never throw
 * inside the push event or the notification is silently dropped by the browser.
 */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Nordic Run', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Nordic Run';
  const options = {
    body: data.body || '',
    icon: '/icon',
    badge: '/icon',
    tag: data.tag || 'nordic-run',
    renotify: false,
    data: { url: data.url || '/fr/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/fr/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab on the same origin if one is open.
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        } catch (e) {
          /* ignore malformed client URLs */
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});

// Activate immediately on update so a new SW version takes over without a reload.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

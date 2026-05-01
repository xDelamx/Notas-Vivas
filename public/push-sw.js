// Lógica isolada para Notificações Push
// Este arquivo é importado pelo Service Worker principal via importScripts

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Você tem um novo lembrete.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        vibrate: [200, 100, 200],
        tag: 'notas-vivas-notification',
        renotify: true,
        data: {
          url: data.url || '/'
        },
        actions: [
          { action: 'open', title: 'Abrir App' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Notas Vivas', options)
      );
    } catch (e) {
      console.error('Erro ao processar dados do push:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

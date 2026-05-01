// Service Worker para Notas Vivas
// Gerencia notificações Web Push (tarefa 3.4.1)

// Escuta evento de Push do servidor
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Você tem um novo lembrete.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        vibrate: [200, 100, 200],
        tag: 'notas-vivas-notification', // Evita empilhar muitas notificações iguais
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

// Lida com o clique na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Tenta focar em uma aba já aberta com a mesma URL
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não houver aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Necessário para o modo injectManifest do VitePWA (opcional se não usar precache manual)
// if (typeof self.__WB_MANIFEST !== 'undefined') {
//   importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');
//   workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
// }

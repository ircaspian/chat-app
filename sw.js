// Service Worker for Push Notifications
const CACHE_NAME = 'chat-app-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Fetch event - برای PWA
self.addEventListener('fetch', (event) => {
  // فقط برای درخواست‌های GET
  if (event.request.method !== 'GET') return;
  
  // فقط برای درخواست‌های http/https
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data;
    
    self.registration.showNotification(title, {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'chat-message',
      data: data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      actions: [
        { action: 'open', title: 'باز کردن' },
        { action: 'close', title: 'بستن' }
      ]
    });
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            // Send message to open specific chat
            if (event.notification.data && event.notification.data.chatId) {
              client.postMessage({
                type: 'OPEN_CHAT',
                chatId: event.notification.data.chatId
              });
            }
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle push event (for future server-side push)
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'پیام جدید', {
        body: data.body || '',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'chat-message',
        data: data.data || {},
        vibrate: [200, 100, 200]
      })
    );
  }
});

// Service Worker for Push Notifications - Optimized for Android
const CACHE_NAME = 'chat-app-v2';

// Install event - فوری فعال شود
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - کنترل تمام کلاینت‌ها
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // پاک کردن کش قدیمی
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        );
      })
    ])
  );
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
  console.log('📨 SW received message:', event.data?.type);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data;
    
    // نمایش نوتیفیکیشن با تنظیمات بهینه برای اندروید
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || '',
        icon: icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || 'chat-message-' + Date.now(),
        data: data || {},
        vibrate: [100, 50, 100, 50, 100],
        requireInteraction: true, // در اندروید باقی بماند
        renotify: true, // حتی با همان تگ، دوباره نوتیف بده
        silent: false,
        timestamp: Date.now(),
        actions: [
          { action: 'reply', title: '↩️ پاسخ' },
          { action: 'open', title: '📖 باز کردن' }
        ]
      }).then(() => {
        console.log('✅ Notification shown:', title);
      }).catch(err => {
        console.error('❌ Notification error:', err);
      })
    );
  }
  
  // پیام برای چک کردن وضعیت
  if (event.data && event.data.type === 'CHECK_SW') {
    event.ports[0]?.postMessage({ status: 'active', timestamp: Date.now() });
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
  console.log('📬 Push received:', event);
  
  let notificationData = {
    title: 'پیام جدید',
    body: '',
    icon: '/icon-192.png',
    tag: 'chat-push-' + Date.now(),
    data: {}
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: '/icon-192.png',
      tag: notificationData.tag,
      data: notificationData.data,
      vibrate: [100, 50, 100, 50, 100],
      requireInteraction: true,
      renotify: true
    })
  );
});

// Background Sync - برای ارسال پیام‌های آفلاین
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  if (event.tag === 'send-messages') {
    // در آینده می‌توان پیام‌های صف شده را ارسال کرد
  }
});

// Periodic Background Sync - برای چک کردن پیام‌های جدید
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Periodic sync:', event.tag);
  if (event.tag === 'check-messages') {
    // در آینده می‌توان پیام‌های جدید را چک کرد
  }
});

// Sleep On It: offline support and wake-up notifications
const CACHE = 'sleep-on-it-v17';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates show up; fall back to the saved copy when offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || (url.origin === self.location.origin && url.pathname.startsWith('/api/'))) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: e.data && e.data.text() }; }
  if (data.refresh) self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ type: 'refresh' })));
  e.waitUntil(self.registration.showNotification(data.title || 'Something woke up in your jar', {
    body: data.body || 'Still want it?',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'wake',
    renotify: true,
    data: { url: './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});

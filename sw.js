/* Conflictscape ships no service worker.

   The first build cached assets here and kept serving stale ones after a
   redeploy. This file stays only to overwrite that script for browsers that
   still hold it: it unregisters itself and clears every cache it finds. */
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});

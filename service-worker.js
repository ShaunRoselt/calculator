self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
  })());
});
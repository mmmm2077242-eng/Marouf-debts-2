const CACHE = 'debts-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // PDF libraries: cached up front so PDF export also works offline (a failure here must not block install)
    await Promise.all(CDN.map(u => fetch(u, {mode: 'no-cors'}).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && url.hostname !== 'cdnjs.cloudflare.com') return;
  e.respondWith((async () => {
    const hit = await caches.match(req, {ignoreSearch: req.mode === 'navigate'});
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => null);
    if (hit){ e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return caches.match('./index.html');
    return Response.error();
  })());
});

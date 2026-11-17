// Service worker: la app abre sin conexión. La página se pide primero a la red; lo demás, de la caché.
const VERSION = 'mf-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

const networkFirst = async (req) => {
  const cache = await caches.open(VERSION)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    return (await cache.match(req)) || (await cache.match('./index.html'))
  }
}

const cacheFirst = async (req) => {
  const cache = await caches.open(VERSION)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) cache.put(req, res.clone())
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Fotos de productos: caché para que la lista se vea en el súper sin cobertura
  if (url.hostname === 'prod-mercadona.imgix.net') return e.respondWith(cacheFirst(req))
  if (url.origin !== location.origin) return
  if (req.mode === 'navigate' || url.pathname.includes('/data/')) return e.respondWith(networkFirst(req))
  if (url.pathname.includes('/assets/')) return e.respondWith(cacheFirst(req))
  e.respondWith(networkFirst(req))
})

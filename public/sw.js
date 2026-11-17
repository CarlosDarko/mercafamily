// Service worker: la app abre sin conexión. La página se pide primero a la red; lo demás, de la caché.
const VERSION = 'mf-v2'
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

// Avisos push: se muestran aunque la app esté cerrada y al tocarlos abren la sección
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { title: 'MercaFamily', body: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'MercaFamily', {
      body: d.body || '',
      tag: d.tag,
      renotify: !!d.tag,
      icon: './icon-192.png',
      badge: './icon-192.png',
      lang: 'es',
      data: { url: d.url || './' }
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || './'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope)) {
          c.focus()
          return c.navigate ? c.navigate(url) : null
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

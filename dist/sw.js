const CACHE_NAME = 'gulfbridge-shell-v1'
const APP_SHELL = [
  new URL('./', self.location.href).href,
  new URL('./index.html', self.location.href).href,
  new URL('./manifest.webmanifest', self.location.href).href,
  new URL('./gulfbridge.svg', self.location.href).href,
  new URL('./icons/app-192.png', self.location.href).href,
  new URL('./icons/app-512.png', self.location.href).href,
]
const CACHEABLE_PATHS = new Set(APP_SHELL)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('gulfbridge-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    const offlineIndex = new URL('./index.html', self.location.href).href

    event.respondWith(
      fetch(request)
        .then((response) => response.ok
          ? caches.open(CACHE_NAME).then((cache) => cache.put(offlineIndex, response.clone()).then(() => response))
          : response)
        .catch(async () => (await caches.match(request)) || (await caches.match(offlineIndex))),
    )
    return
  }

  if (url.pathname.startsWith(new URL('./assets/', self.location.href).pathname) || CACHEABLE_PATHS.has(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (!response.ok) return response
        const copy = response.clone()
        return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).then(() => response))
      })),
    )
  }
})

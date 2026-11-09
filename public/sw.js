const CACHE_NAME = 'gulfbridge-shell-v1'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/gulfbridge.svg',
  '/icons/app-192.png',
  '/icons/app-512.png',
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
    event.respondWith(
      fetch(request)
        .then((response) => response.ok
          ? caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', response.clone()).then(() => response))
          : response)
        .catch(async () => (await caches.match(request)) || (await caches.match('/index.html'))),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || CACHEABLE_PATHS.has(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (!response.ok) return response
        const copy = response.clone()
        return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).then(() => response))
      })),
    )
  }
})

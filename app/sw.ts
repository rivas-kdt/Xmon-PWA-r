// app/sw.ts

/// <reference lib="webworker" />

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

// Use type assertion instead of redeclaration
const sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener("install", (event) => {
  console.log("Service worker installed")
  sw.skipWaiting()
})

sw.addEventListener("activate", (event) => {
  console.log("Service worker activated")
  return sw.clients.claim()
})

const CACHE_NAME = "xmon-cache-v1"
const urlsToCache = ["/", "/manifest.json", "/icons/icon-192x192.png", "/icons/icon-512x512.png"]

// Cache assets on install
sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
})

// Serve from cache, falling back to network
sw.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})


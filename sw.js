// Service worker: makes the app load even with no internet.
//
// This file runs in the background, outside any page. The browser sends
// every network request from our app through the "fetch" handler below.

// Bumping this name is what retires the old cache: "activate" below
// deletes every cache that isn't the current one. Change it whenever the
// app shell changes, or browsers will keep serving the old files.
const CACHE_NAME = "bead-jar-v2";

// The complete set of files the app needs to run ("the app shell").
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./state.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: download the whole app shell into the cache up front.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: delete caches from older versions of this service worker.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first. Try the real network (and refresh the cache with
// what comes back); if that fails — we're offline — serve from the cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

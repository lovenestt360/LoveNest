importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA2eE9vAKTeqDmXvMqv13K5sTjq77uj1h8",
  authDomain: "lovenest-d7f81.firebaseapp.com",
  projectId: "lovenest-d7f81",
  storageBucket: "lovenest-d7f81.firebasestorage.app",
  messagingSenderId: "724651748498",
  appId: "1:724651748498:web:c3872157317c3461274a4b",
});

const messaging = firebase.messaging();

// Notificações FCM recebidas com a app fechada ou em background
messaging.onBackgroundMessage((payload) => {
  const d = payload.data ?? {};
  self.registration.showNotification(d.title || "LoveNest", {
    body: d.body || "",
    icon: d.icon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: d.url || "/chat" },
    vibrate: [200, 100, 200],
    tag: "lovenest-notif",
    renotify: true,
  });
});

// ── Cache / offline ──────────────────────────────────────────────────────────
const CACHE_NAME = "dk-cache-v7";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || !url.origin.includes(self.location.origin)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request) || caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});

// Quando o browser invalida a subscrição (ex: SW update), notifica a app
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" })
        );
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(targetPath);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetPath);
      })
  );
});

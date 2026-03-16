const CACHE_NAME = "dk-cache-v2";
const OFFLINE_URL = "/offline.html";

// Pre-cache the offline page on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations, cache-first for assets
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "image" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => new Response("", { status: 408 }));
      })
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// Push notification handler
self.addEventListener("push", (event) => {
  console.log("Push event received", event);
  let data = { title: "LoveNest", body: "", icon: "/icon-192.png", data: { url: "/chat" } };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
      console.log("Push data parsed:", data);
    }
  } catch (e) {
    console.error("Error parsing push data:", e);
  }

  // Update App Badge if supported
  if ('setAppBadge' in navigator) {
    if (data.badge_count !== undefined) {
      navigator.setAppBadge(data.badge_count).catch(console.error);
    } else {
      // If no count provided, just ensure it's at least visible (or we could try to increment if we had state)
      // navigator.setAppBadge(1).catch(console.error);
    }
  }

  const options = {
    body: data.body || "Nova atualização no LoveNest",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: data.data || { url: "/chat" },
    vibrate: [200, 100, 200],
    tag: data.tag || 'lovenest-notif', // Use tags to group same-type notifications
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "LoveNest", options)
  );
});

// Click on notification → open the correct route
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Try to find an existing window and navigate it
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          client.navigate(targetPath);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});

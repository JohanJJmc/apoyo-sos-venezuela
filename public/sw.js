const CACHE_NAME = "nexo-v5";
const ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg?v=2",
  "/assets/nexo-logo.svg",
  "/assets/nexo-logo-lite.svg",
  "/assets/nexo-app-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))).then(() => self.clients.claim()),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? {};
  const title = data.title || "NEXO";
  const options = {
    body: data.body || "Tienes una actualización pendiente.",
    icon: data.icon || "/assets/nexo-app-icon.png",
    badge: data.badge || "/assets/nexo-app-icon.png",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(self.location.origin));
      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

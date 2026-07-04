import { supabase } from "./supabaseClient";

function getPublicVapidKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function postSubscription(subscription: PushSubscription) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Debes iniciar sesión para activar notificaciones.");

  const response = await fetch("/api/push-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.message || "No se pudieron activar las notificaciones.");
  }
}

export const pushNotificationService = {
  isSupported() {
    return Boolean("serviceWorker" in navigator && "PushManager" in window && "Notification" in window && getPublicVapidKey());
  },

  permission() {
    return "Notification" in window ? Notification.permission : "denied";
  },

  async enable() {
    const publicKey = getPublicVapidKey();
    if (!publicKey) throw new Error("Falta configurar VITE_VAPID_PUBLIC_KEY en Vercel.");
    if (!this.isSupported()) throw new Error("Este navegador no soporta notificaciones push.");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("No se otorgó permiso para enviar notificaciones.");

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await postSubscription(subscription);
  },
};

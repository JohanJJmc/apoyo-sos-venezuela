import webpush from "web-push";

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@nexo-sos.vercel.app";

  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushToUser(supabase, userId, payload) {
  if (!userId || !configureWebPush()) return;

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) return;

  await Promise.allSettled(
    subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, JSON.stringify(payload));
      } catch (sendError) {
        if ([404, 410].includes(sendError?.statusCode)) {
          await supabase.from("push_subscriptions").delete().eq("id", item.id);
        }
      }
    }),
  );
}

export function pushPayload(title, body, url = "/") {
  return {
    title,
    body,
    url,
    icon: "/assets/nexo-app-icon.png",
    badge: "/assets/nexo-notification-badge.svg",
  };
}

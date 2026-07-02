import { supabase } from "./supabaseClient";

export type RateLimitAction = "signup" | "create_request" | "offer_support";

export async function checkRateLimit(action: RateLimitAction, metadata: Record<string, string | undefined> = {}) {
  if (!navigator.onLine) return;

  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const response = await fetch("/api/check-rate-limit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
    },
    body: JSON.stringify({ action, ...metadata }),
  });

  const result = (await response.json().catch(() => ({}))) as { allowed?: boolean; message?: string };
  if (!response.ok || !result.allowed) {
    throw new Error(result.message || "Has hecho demasiados intentos. Espera un momento e intenta de nuevo.");
  }
}

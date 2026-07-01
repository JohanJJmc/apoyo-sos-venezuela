import { supabase } from "./supabaseClient";

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export function isTurnstileEnabled() {
  return Boolean(turnstileSiteKey);
}

export function getTurnstileSiteKey() {
  return turnstileSiteKey || "";
}

export async function verifyTurnstileToken(token?: string) {
  if (!isTurnstileEnabled()) return;
  if (!token) {
    throw new Error("Completa la verificación de seguridad antes de continuar.");
  }

  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const response = await fetch("/api/verify-turnstile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
    },
    body: JSON.stringify({ token }),
  });

  const result = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };
  if (!response.ok || !result.success) {
    throw new Error(result.message || "No se pudo verificar que eres una persona. Intenta de nuevo.");
  }
}

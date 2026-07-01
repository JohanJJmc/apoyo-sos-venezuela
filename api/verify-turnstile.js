const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ success: false, message: "Método no permitido." });
    return;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) {
    response.status(503).json({ success: false, message: "Turnstile no está configurado en el servidor." });
    return;
  }

  const token = request.body?.token;
  if (!token || typeof token !== "string") {
    response.status(400).json({ success: false, message: "Completa la verificación de seguridad." });
    return;
  }

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);

  const forwardedFor = request.headers["x-forwarded-for"];
  const remoteIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0];
  if (remoteIp) formData.set("remoteip", remoteIp.trim());

  try {
    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    const result = await verifyResponse.json();

    if (!verifyResponse.ok || !result.success) {
      response.status(403).json({
        success: false,
        message: "No se pudo verificar que eres una persona. Intenta de nuevo.",
        codes: result["error-codes"] || [],
      });
      return;
    }

    response.status(200).json({ success: true });
  } catch {
    response.status(502).json({ success: false, message: "No se pudo validar la verificación de seguridad." });
  }
}

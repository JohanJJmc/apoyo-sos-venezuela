const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";

const highRiskPatterns = [
  /\b(venta|vendo|comprar|compro|intercambio|distribuir|distribucion)\b.*\b(droga|drogas|cocaina|cocaína|marihuana|fentanilo|heroina|heroína|crack|metanfetamina)\b/i,
  /\b(droga|drogas|cocaina|cocaína|marihuana|fentanilo|heroina|heroína|crack|metanfetamina)\b.*\b(venta|vendo|comprar|compro|intercambio|distribuir|distribucion)\b/i,
  /\b(venta|vendo|comprar|compro|intercambio|traslado|transportar)\b.*\b(arma|armas|pistola|rifle|fusil|municion|munición|explosivo|granada)\b/i,
  /\b(arma|armas|pistola|rifle|fusil|municion|munición|explosivo|granada)\b.*\b(venta|vendo|comprar|compro|intercambio|traslado|transportar)\b/i,
  /\b(trafico|tráfico|traficar|venta|vender|traslado ilegal)\b.*\b(persona|personas|menor|menores|niño|niña|niños|niñas|mujer|mujeres)\b/i,
  /\b(secuestro|secuestrar|extorsion|extorsión|amenaza|amenazar|sicario|sicariato)\b/i,
];

function collectText(body) {
  const fields = body?.fields && typeof body.fields === "object" ? body.fields : {};
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${String(value ?? "").trim()}`)
    .filter((line) => line.length > 3)
    .join("\n")
    .slice(0, 6000);
}

function localRiskReason(text) {
  return highRiskPatterns.some((pattern) => pattern.test(text))
    ? "El contenido parece relacionado con actividades ilegales o peligrosas."
    : "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ allowed: false, message: "Método no permitido." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(503).json({
      allowed: false,
      message: "La moderación automática no está configurada. Agrega OPENAI_API_KEY en Vercel.",
    });
    return;
  }

  const text = collectText(request.body);
  if (!text) {
    response.status(200).json({ allowed: true });
    return;
  }

  const localReason = localRiskReason(text);
  if (localReason) {
    response.status(200).json({
      allowed: false,
      source: "local_rules",
      message: `${localReason} Por seguridad, esta publicación no puede enviarse.`,
    });
    return;
  }

  try {
    const moderationResponse = await fetch(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });

    const moderation = await moderationResponse.json();
    if (!moderationResponse.ok) {
      response.status(502).json({
        allowed: false,
        message: "No se pudo validar la seguridad del contenido. Intenta nuevamente.",
      });
      return;
    }

    const result = moderation.results?.[0];
    if (result?.flagged) {
      response.status(200).json({
        allowed: false,
        source: "openai_moderation",
        categories: result.categories,
        message: "El contenido fue marcado como riesgoso o no permitido. Revisa el texto y publica solo solicitudes legítimas de ayuda.",
      });
      return;
    }

    response.status(200).json({ allowed: true });
  } catch {
    response.status(502).json({
      allowed: false,
      message: "No se pudo validar la seguridad del contenido. Intenta nuevamente.",
    });
  }
}

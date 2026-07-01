const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";
const OPENAI_MODERATION_ENABLED = process.env.OPENAI_MODERATION_ENABLED === "true";

const validationTree = [
  {
    id: "drugs_commerce",
    reason: "Contenido relacionado con venta, compra o distribución de drogas.",
    any: ["droga", "drogas", "cocaina", "marihuana", "fentanilo", "heroina", "crack", "metanfetamina", "perico", "tusi"],
    context: ["venta", "vendo", "comprar", "compro", "busco", "intercambio", "distribuir", "distribucion", "entrega", "delivery"],
  },
  {
    id: "weapons_commerce",
    reason: "Contenido relacionado con venta, compra o traslado de armas.",
    any: ["arma", "armas", "pistola", "rifle", "fusil", "municion", "balas", "explosivo", "granada"],
    context: ["venta", "vendo", "comprar", "compro", "busco", "intercambio", "traslado", "transportar", "entrega"],
  },
  {
    id: "human_trafficking",
    reason: "Contenido relacionado con tráfico, venta, retención o traslado ilegal de personas.",
    any: ["persona", "personas", "menor", "menores", "nino", "nina", "ninos", "ninas", "mujer", "mujeres", "hombre", "hombres"],
    context: ["trafico", "traficar", "trata", "venta", "vender", "traslado ilegal", "retener", "retenida", "retenido", "captar", "captacion"],
  },
  {
    id: "coercion_or_violence",
    reason: "Contenido relacionado con secuestro, extorsión, amenazas o violencia organizada.",
    direct: ["secuestro", "secuestrar", "secuestrado", "secuestrada", "extorsion", "amenaza", "amenazar", "sicario", "sicariato"],
  },
  {
    id: "minor_sexualization",
    reason: "Contenido que sexualiza o explota a niños, niñas, menores o adolescentes.",
    any: ["nino", "nina", "ninos", "ninas", "menor", "menores", "adolescente", "adolescentes", "bebe", "chamo", "chama"],
    context: [
      "obediente",
      "apartadita",
      "apartadito",
      "sumisa",
      "sumiso",
      "desnuda",
      "desnudo",
      "carinosa",
      "carinoso",
      "sexi",
      "sexy",
      "sensual",
      "virgen",
      "sexo",
      "sexual",
      "discreta",
      "discreto",
    ],
  },
  {
    id: "sexualized_person_description",
    reason: "Contenido sexualizado o sospechoso que no corresponde a una solicitud legítima de ayuda.",
    any: ["mujer", "mujeres", "hombre", "hombres", "chica", "chico", "persona", "personas"],
    context: ["desnuda", "desnudo", "sexi", "sexy", "sexo", "sexual", "sumisa", "sumiso", "obediente", "apartadita", "apartadito"],
  },
  {
    id: "skin_color_plus_sexualized_descriptor",
    reason: "Contenido sospechoso por combinar color de piel o rasgos físicos con descripciones sexualizadas o de sometimiento.",
    any: ["blanca", "blanco", "morena", "moreno", "negra", "negro", "triguena", "trigueno", "piel clara", "piel oscura", "color de piel"],
    context: ["obediente", "apartadita", "apartadito", "sumisa", "sumiso", "desnuda", "desnudo", "carinosa", "carinoso", "sexi", "sexy", "sensual"],
  },
  {
    id: "sexual_exploitation_direct",
    reason: "Contenido relacionado con explotación sexual o prostitución.",
    direct: ["explotacion sexual", "pornografia infantil", "prostitucion", "servicio sexual", "abuso sexual"],
  },
];

function collectText(body) {
  const fields = body?.fields && typeof body.fields === "object" ? body.fields : {};
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${String(value ?? "").trim()}`)
    .filter((line) => line.length > 3)
    .join("\n")
    .slice(0, 6000);
}

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTerm(text, term) {
  const normalizedTerm = normalizeText(term);
  return new RegExp(`(^|\\s)${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
}

function hasAny(text, terms = []) {
  return terms.some((term) => hasTerm(text, term));
}

function localRiskReason(text) {
  const normalizedText = normalizeText(text);

  for (const rule of validationTree) {
    if (rule.direct && hasAny(normalizedText, rule.direct)) {
      return { ruleId: rule.id, reason: rule.reason };
    }

    if (rule.any && hasAny(normalizedText, rule.any) && rule.context && hasAny(normalizedText, rule.context)) {
      return { ruleId: rule.id, reason: rule.reason };
    }
  }

  return null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ allowed: false, message: "Método no permitido." });
    return;
  }

  const text = collectText(request.body);
  if (!text) {
    response.status(200).json({ allowed: true });
    return;
  }

  const localRisk = localRiskReason(text);
  if (localRisk) {
    response.status(200).json({
      allowed: false,
      source: "local_rules",
      ruleId: localRisk.ruleId,
      message: `${localRisk.reason} Por seguridad, esta publicación no puede enviarse.`,
    });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!OPENAI_MODERATION_ENABLED || !apiKey) {
    response.status(200).json({
      allowed: true,
      source: "local_rules_only",
      warning: "OpenAI Moderation está desactivado. Se aplicaron reglas locales.",
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
      const code = moderation?.error?.code || moderation?.error?.type || "";
      const message = moderation?.error?.message || "";
      const lowerMessage = `${code} ${message}`.toLowerCase();

      if (lowerMessage.includes("insufficient_quota") || lowerMessage.includes("quota") || lowerMessage.includes("billing")) {
        response.status(200).json({
          allowed: true,
          source: "local_rules_only",
          warning: "OpenAI no tiene créditos activos. Se aplicaron reglas locales.",
        });
        return;
      }

      if (lowerMessage.includes("invalid_api_key") || lowerMessage.includes("incorrect api key") || lowerMessage.includes("unauthorized")) {
        response.status(401).json({
          allowed: false,
          message: "La clave de OpenAI no es válida. Revisa OPENAI_API_KEY en Vercel.",
        });
        return;
      }

      response.status(502).json({
        allowed: false,
        message: "OpenAI no pudo validar el contenido en este momento. Revisa la API key, créditos o intenta más tarde.",
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

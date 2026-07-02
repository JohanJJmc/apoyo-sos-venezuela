import { createClient } from "@supabase/supabase-js";

const ACTION_LIMITS = {
  signup: {
    user: { limit: 3, windowSeconds: 60 * 60 },
    ip: { limit: 5, windowSeconds: 60 * 60 },
    message: "Demasiados intentos de crear cuenta. Espera un rato e intenta nuevamente.",
  },
  create_request: {
    user: { limit: 4, windowSeconds: 30 * 60 },
    ip: { limit: 12, windowSeconds: 30 * 60 },
    message: "Has creado varias solicitudes en poco tiempo. Espera unos minutos antes de publicar otra.",
  },
  offer_support: {
    user: { limit: 10, windowSeconds: 30 * 60 },
    ip: { limit: 20, windowSeconds: 30 * 60 },
    message: "Has enviado varios apoyos en poco tiempo. Espera unos minutos antes de enviar otro.",
  },
};

function getIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return value?.split(",")[0]?.trim() || request.socket?.remoteAddress || "unknown";
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function checkLimit(supabase, action, identifier, settings) {
  const { data, error } = await supabase
    .rpc("check_rate_limit", {
      p_action: action,
      p_identifier: identifier,
      p_limit: settings.limit,
      p_window_seconds: settings.windowSeconds,
    })
    .single();

  if (error) throw error;
  return data;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ allowed: false, message: "Método no permitido." });
    return;
  }

  if (process.env.RATE_LIMIT_ENABLED !== "true") {
    response.status(200).json({ allowed: true, source: "disabled" });
    return;
  }

  const action = request.body?.action;
  const settings = ACTION_LIMITS[action];
  if (!settings) {
    response.status(400).json({ allowed: false, message: "Acción no soportada para rate limit." });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    response.status(503).json({
      allowed: false,
      message: "Rate limit no está configurado. Falta SUPABASE_SERVICE_ROLE_KEY en Vercel.",
    });
    return;
  }

  try {
    const token = getBearerToken(request);
    let userIdentifier = "";
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      if (data.user?.id) userIdentifier = `user:${data.user.id}`;
    }

    const ipIdentifier = `ip:${getIp(request)}`;
    const checks = [
      checkLimit(supabase, `${action}:ip`, ipIdentifier, settings.ip),
    ];

    if (userIdentifier) {
      checks.push(checkLimit(supabase, `${action}:user`, userIdentifier, settings.user));
    }

    const results = await Promise.all(checks);
    const blocked = results.find((result) => !result.allowed);
    if (blocked) {
      response.status(429).json({
        allowed: false,
        message: settings.message,
        limit: blocked.limit_count,
        count: blocked.current_count,
        resetAt: blocked.reset_at,
      });
      return;
    }

    response.status(200).json({ allowed: true });
  } catch (error) {
    response.status(500).json({
      allowed: false,
      message: error?.message || "No se pudo validar el límite de uso.",
    });
  }
}

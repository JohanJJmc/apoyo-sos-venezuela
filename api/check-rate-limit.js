import { createClient } from "@supabase/supabase-js";

const ACTION_LIMITS = {
  signup: {
    email: { limit: 5, windowSeconds: 60 * 60 },
    ip: { limit: 50, windowSeconds: 60 * 60 },
    message: "Demasiados intentos de crear cuenta desde este origen. Espera un rato e intenta nuevamente.",
  },
  create_request: {
    user: { limit: 10, windowSeconds: 60 * 60 },
    ip: { limit: 10, windowSeconds: 60 * 60 },
    message: "Llegaste al límite de 10 solicitudes por hora. Espera un poco antes de publicar otra.",
  },
  offer_support: {
    activeLimit: 5,
    message: "Ya tienes 5 apoyos pendientes de confirmación. Cuando alguno sea aprobado o expire, podrás ofrecer otro apoyo.",
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function checkActiveSupportSlots(supabase, userId, settings) {
  if (!userId) {
    return {
      allowed: false,
      message: "Para ofrecer apoyo debes iniciar sesión nuevamente.",
    };
  }

  const { count, error } = await supabase
    .from("support_reports")
    .select("id", { count: "exact", head: true })
    .eq("supporter_id", userId)
    .eq("status", "pending_confirmation");

  if (error) throw error;
  const activeCount = count || 0;

  return {
    allowed: activeCount < settings.activeLimit,
    count: activeCount,
    limit: settings.activeLimit,
    message: settings.message,
  };
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
    let userId = "";
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      if (data.user?.id) {
        userId = data.user.id;
        userIdentifier = `user:${data.user.id}`;
      }
    }

    if (action === "offer_support") {
      const supportSlots = await checkActiveSupportSlots(supabase, userId, settings);
      if (!supportSlots.allowed) {
        response.status(429).json({
          allowed: false,
          message: supportSlots.message,
          limit: supportSlots.limit,
          count: supportSlots.count,
        });
        return;
      }

      response.status(200).json({ allowed: true, count: supportSlots.count, limit: supportSlots.limit });
      return;
    }

    const ipIdentifier = `ip:${getIp(request)}`;
    const checks = [
      checkLimit(supabase, `${action}:ip`, ipIdentifier, settings.ip),
    ];

    if (action === "signup") {
      const email = normalizeEmail(request.body?.email);
      if (email) checks.push(checkLimit(supabase, `${action}:email`, `email:${email}`, settings.email));
    } else if (userIdentifier) {
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

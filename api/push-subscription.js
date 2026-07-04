import { createClient } from "@supabase/supabase-js";

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

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

async function getAuthenticatedUser(supabase, request) {
  const token = getBearerToken(request);
  if (!token) throw Object.assign(new Error("Debes iniciar sesión para activar notificaciones."), { statusCode: 401 });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    throw Object.assign(new Error("Tu sesión expiró. Ingresa nuevamente."), { statusCode: 401 });
  }

  return data.user;
}

export default async function handler(request, response) {
  if (!["POST", "DELETE"].includes(request.method)) {
    response.status(405).json({ message: "Método no permitido." });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    response.status(503).json({ message: "Servidor no configurado. Falta SUPABASE_SERVICE_ROLE_KEY." });
    return;
  }

  try {
    const user = await getAuthenticatedUser(supabase, request);

    if (request.method === "DELETE") {
      const endpoint = String(request.body?.endpoint || "").trim();
      if (endpoint) {
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
      }
      response.status(200).json({ ok: true });
      return;
    }

    const subscription = request.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw Object.assign(new Error("Suscripción push inválida."), { statusCode: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) throw error;
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(error?.statusCode || 500).json({
      ok: false,
      message: error?.message || "No se pudo guardar la suscripción push.",
    });
  }
}

import { createClient } from "@supabase/supabase-js";
import { pushPayload, sendPushToUser } from "./_push.js";

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
  if (!token) throw Object.assign(new Error("Debes iniciar sesión para probar notificaciones."), { statusCode: 401 });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    throw Object.assign(new Error("Tu sesión expiró. Ingresa nuevamente."), { statusCode: 401 });
  }

  return data.user;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
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
    await sendPushToUser(
      supabase,
      user.id,
      pushPayload("Prueba de NEXO", "Si ves este aviso, tus notificaciones están funcionando.", "/"),
    );
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(error?.statusCode || 500).json({
      ok: false,
      message: error?.message || "No se pudo enviar la notificación de prueba.",
    });
  }
}

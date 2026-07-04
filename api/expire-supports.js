import { createClient } from "@supabase/supabase-js";
import { pushPayload, sendPushToUser } from "./_push.js";

const SUPPORT_CONFIRMATION_TIMEOUT_HOURS = 6;

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

export default async function handler(request, response) {
  if (!["POST", "GET"].includes(request.method)) {
    response.status(405).json({ message: "Método no permitido." });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    response.status(503).json({ message: "Servidor no configurado. Falta SUPABASE_SERVICE_ROLE_KEY." });
    return;
  }

  try {
    const expiresBefore = new Date(Date.now() - SUPPORT_CONFIRMATION_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString();
    const { data: reports, error: reportError } = await supabase
      .from("support_reports")
      .select("id, request_id, supporter_id")
      .eq("status", "pending_confirmation")
      .lt("created_at", expiresBefore);

    if (reportError) throw reportError;
    if (!reports?.length) {
      response.status(200).json({ ok: true, expired: 0 });
      return;
    }

    const requestIds = [...new Set(reports.map((report) => report.request_id))];
    const { data: requests, error: requestsError } = await supabase
      .from("requests")
      .select("id, created_by, category, item")
      .in("id", requestIds);

    if (requestsError) throw requestsError;

    const { error: updateError } = await supabase
      .from("support_reports")
      .update({ status: "expired" })
      .in("id", reports.map((report) => report.id));

    if (updateError) throw updateError;

    await Promise.allSettled(
      reports.flatMap((report) => {
        const requestRow = requests?.find((item) => item.id === report.request_id);
        const label = requestRow?.item || requestRow?.category || "la solicitud";
        const tasks = [
          sendPushToUser(
            supabase,
            report.supporter_id,
            pushPayload("Tu apoyo expiró", `El apoyo ofrecido para ${label} expiró porque no fue confirmado.`, "/", {
              category: requestRow?.category,
            }),
          ),
        ];

        if (requestRow?.created_by) {
          tasks.push(
            sendPushToUser(
              supabase,
              requestRow.created_by,
              pushPayload("Un apoyo expiró", `Un apoyo ofrecido para ${label} expiró sin confirmación.`, "/", {
                category: requestRow.category,
              }),
            ),
          );
        }

        return tasks;
      }),
    );

    response.status(200).json({ ok: true, expired: reports.length });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error?.message || "No se pudieron expirar apoyos.",
    });
  }
}

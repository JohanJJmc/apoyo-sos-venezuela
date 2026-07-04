import { createClient } from "@supabase/supabase-js";
import { pushPayload, sendPushToUser } from "./_push.js";

const MAX_AREA_REQUESTS_RADIUS_METERS = 70;
const MAX_PENDING_REQUESTS_PER_CATEGORY_ITEM_RADIUS = 20;
const MAX_PENDING_REQUESTS_PER_AREA_RADIUS = 120;
const CREATE_REQUEST_LIMITS = {
  user: { limit: 10, windowSeconds: 60 * 60 },
  ip: { limit: 20, windowSeconds: 60 * 60 },
};
const MAX_ACTIVE_SUPPORTS = 5;

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

async function getAuthenticatedUser(supabase, request) {
  const token = getBearerToken(request);
  if (!token) throw Object.assign(new Error("Debes iniciar sesión para realizar esta acción."), { statusCode: 401 });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    throw Object.assign(new Error("Tu sesión expiró. Ingresa nuevamente."), { statusCode: 401 });
  }

  return data.user;
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

async function enforceCreateRequestRateLimit(supabase, request, userId) {
  if (process.env.RATE_LIMIT_ENABLED !== "true") return;

  const results = await Promise.all([
    checkLimit(supabase, "create_request:ip", `ip:${getIp(request)}`, CREATE_REQUEST_LIMITS.ip),
    checkLimit(supabase, "create_request:user", `user:${userId}`, CREATE_REQUEST_LIMITS.user),
  ]);

  const blocked = results.find((result) => !result.allowed);
  if (blocked) {
    throw Object.assign(
      new Error("Se ha sobrepasado el número de solicitudes por hora. Espera un poco antes de publicar otra."),
      { statusCode: 429 },
    );
  }
}

async function enforceSupportSlots(supabase, userId) {
  if (process.env.RATE_LIMIT_ENABLED !== "true") return;

  const { count, error } = await supabase
    .from("support_reports")
    .select("id", { count: "exact", head: true })
    .eq("supporter_id", userId)
    .eq("status", "pending_confirmation");

  if (error) throw error;
  if ((count || 0) >= MAX_ACTIVE_SUPPORTS) {
    throw Object.assign(
      new Error("Ya tienes 5 apoyos pendientes de confirmación. Cuando alguno sea aprobado o expire, podrás ofrecer otro apoyo."),
      { statusCode: 429 },
    );
  }
}

function distanceInMeters(a, b) {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function enforceAreaCapacity(supabase, input) {
  const { data, error } = await supabase
    .from("requests")
    .select("id, category, item, latitude, longitude, status")
    .eq("status", "pending");

  if (error) throw error;

  const location = { latitude: input.latitude, longitude: input.longitude };
  const nearby = (data || []).filter((request) =>
    distanceInMeters(location, { latitude: request.latitude, longitude: request.longitude }) <= MAX_AREA_REQUESTS_RADIUS_METERS,
  );
  const sameNeed = nearby.filter((request) => request.category === input.category && request.item === input.item);

  if (sameNeed.length >= MAX_PENDING_REQUESTS_PER_CATEGORY_ITEM_RADIUS || nearby.length >= MAX_PENDING_REQUESTS_PER_AREA_RADIUS) {
    throw Object.assign(
      new Error("Ya se crearon demasiados pedidos de apoyo para esta área. Por favor revisa las solicitudes cercanas para sumarte o apoyar una existente."),
      { statusCode: 429 },
    );
  }
}

function requireText(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) throw Object.assign(new Error(`${fieldName} es obligatorio.`), { statusCode: 400 });
  return text;
}

function optionalText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function appendPartialNote(existingNote, nextNote) {
  const cleanExistingNote = optionalText(existingNote);
  const cleanNextNote = optionalText(nextNote);
  if (!cleanNextNote) return cleanExistingNote;
  return cleanExistingNote ? `${cleanExistingNote}\n\n${cleanNextNote}` : cleanNextNote;
}

function requireNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw Object.assign(new Error(`${fieldName} no es válido.`), { statusCode: 400 });
  return number;
}

async function createRequest(supabase, request, user) {
  const input = request.body?.input || {};
  const payload = {
    category: requireText(input.category, "La categoría"),
    item: requireText(input.item, "El artículo"),
    quantity: Number.isFinite(Number(input.quantity)) ? Number(input.quantity) : 1,
    description: optionalText(input.description),
    photo_url: optionalText(input.photoUrl),
    latitude: requireNumber(input.latitude, "La latitud"),
    longitude: requireNumber(input.longitude, "La longitud"),
    status: "pending",
    partial_support: false,
    created_by: user.id,
    requester_name: input.requesterAnonymous ? null : optionalText(input.requesterName),
    requester_phone: input.requesterAnonymous ? null : optionalText(input.requesterPhone),
    requester_anonymous: Boolean(input.requesterAnonymous),
    address: optionalText(input.address),
  };

  await enforceCreateRequestRateLimit(supabase, request, user.id);
  await enforceAreaCapacity(supabase, payload);

  const { data, error } = await supabase.from("requests").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

async function offerSupport(supabase, request, user) {
  const input = request.body?.input || {};
  const requestId = requireText(request.body?.requestId, "La solicitud");

  await enforceSupportSlots(supabase, user.id);

  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id, status, category, item, created_by")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRow) throw Object.assign(new Error("La solicitud no existe."), { statusCode: 404 });
  if (requestRow.status !== "pending") {
    throw Object.assign(new Error("Esta solicitud ya no está pendiente."), { statusCode: 409 });
  }

  const payload = {
    request_id: requestId,
    supporter_id: user.id,
    supporter_name: input.anonymous ? null : optionalText(input.supporterName),
    supporter_phone: input.anonymous ? null : optionalText(input.supporterPhone),
    details: optionalText(input.details),
    photo_url: optionalText(input.photoUrl),
    latitude: input.latitude == null ? null : requireNumber(input.latitude, "La latitud"),
    longitude: input.longitude == null ? null : requireNumber(input.longitude, "La longitud"),
    anonymous: Boolean(input.anonymous),
    status: "pending_confirmation",
  };

  const { data, error } = await supabase.from("support_reports").insert(payload).select("*").single();
  if (error) throw error;

  await sendPushToUser(
    supabase,
    requestRow.created_by,
    pushPayload(
      "Alguien ofreció apoyo",
      `Tu solicitud de ${requestRow.item || requestRow.category} tiene un apoyo pendiente de confirmación.`,
      "/",
      { category: requestRow.category },
    ),
  );

  return data;
}

async function confirmSupport(supabase, request, user) {
  const requestId = requireText(request.body?.requestId, "La solicitud");
  const status = requireText(request.body?.status, "El estado");
  const partialNote = optionalText(request.body?.partialNote);
  const supportReportId = optionalText(request.body?.supportReportId);
  if (!["confirmed", "partial", "rejected"].includes(status)) {
    throw Object.assign(new Error("Estado de apoyo no válido."), { statusCode: 400 });
  }
  if (status === "partial" && !partialNote) {
    throw Object.assign(new Error("Indica qué apoyo falta para mantener la solicitud pendiente."), { statusCode: 400 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id, created_by, category, item, partial_note")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRow) throw Object.assign(new Error("La solicitud no existe."), { statusCode: 404 });
  if (requestRow.created_by !== user.id) {
    throw Object.assign(new Error("Solo quien creó la solicitud puede confirmar el apoyo."), { statusCode: 403 });
  }

  let supportReportQuery = supabase
    .from("support_reports")
    .select("id")
    .eq("request_id", requestId)
    .eq("status", "pending_confirmation");

  if (supportReportId) {
    supportReportQuery = supportReportQuery.eq("id", supportReportId);
  } else {
    supportReportQuery = supportReportQuery.order("created_at", { ascending: false }).limit(1);
  }

  const { data: latestReports, error: reportListError } = await supportReportQuery;

  if (reportListError) throw reportListError;
  const latestReport = latestReports?.[0];
  if (!latestReport) {
    throw Object.assign(new Error("No hay un apoyo pendiente para confirmar."), { statusCode: 409 });
  }

  const requestUpdates = {
    status: status === "confirmed" ? "resolved" : "pending",
    partial_support: status === "partial",
    partial_note: status === "partial" ? appendPartialNote(requestRow.partial_note, partialNote) : null,
    resolved_at: status === "confirmed" ? new Date().toISOString() : null,
  };

  const { error: updateRequestError } = await supabase.from("requests").update(requestUpdates).eq("id", requestId);
  if (updateRequestError) throw updateRequestError;

  const { data: updatedReport, error: updateReportError } = await supabase
    .from("support_reports")
    .update({ status, partial_note: status === "partial" ? partialNote : null })
    .eq("id", latestReport.id)
    .select("id, supporter_id")
    .single();

  let finalUpdatedReport = updatedReport;
  if (updateReportError?.message?.includes("partial_note")) {
    const { data: fallbackReport, error: fallbackReportError } = await supabase
      .from("support_reports")
      .update({ status })
      .eq("id", latestReport.id)
      .select("id, supporter_id")
      .single();
    if (fallbackReportError) throw fallbackReportError;
    finalUpdatedReport = fallbackReport;
  } else if (updateReportError) {
    throw updateReportError;
  }

  if (status === "confirmed" && finalUpdatedReport?.supporter_id) {
    await sendPushToUser(
      supabase,
      finalUpdatedReport.supporter_id,
      pushPayload(
        "Tu apoyo fue aprobado",
        `Confirmaron que tu apoyo para ${requestRow.item || requestRow.category} fue recibido.`,
        "/",
        { category: requestRow.category },
      ),
    );
  }

  return { ok: true };
}

async function cancelRequest(supabase, request, user) {
  const requestId = requireText(request.body?.requestId, "La solicitud");

  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id, created_by")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRow) throw Object.assign(new Error("La solicitud no existe."), { statusCode: 404 });
  if (requestRow.created_by !== user.id) {
    throw Object.assign(new Error("Solo quien creó la solicitud puede cancelarla."), { statusCode: 403 });
  }

  const { error: supportError } = await supabase.from("support_reports").delete().eq("request_id", requestId);
  if (supportError) throw supportError;

  const { error: deleteError } = await supabase.from("requests").delete().eq("id", requestId);
  if (deleteError) throw deleteError;
  return { ok: true };
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
    const action = request.body?.action;
    let data;

    if (action === "create_request") data = await createRequest(supabase, request, user);
    else if (action === "offer_support") data = await offerSupport(supabase, request, user);
    else if (action === "confirm_support") data = await confirmSupport(supabase, request, user);
    else if (action === "cancel_request") data = await cancelRequest(supabase, request, user);
    else throw Object.assign(new Error("Acción no soportada."), { statusCode: 400 });

    response.status(200).json({ ok: true, data });
  } catch (error) {
    response.status(error?.statusCode || 500).json({
      ok: false,
      message: error?.message || "No se pudo completar la acción.",
    });
  }
}

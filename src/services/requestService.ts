import type { Coordinates, Request, SupportReport } from "../types/request";
import { distanceInMeters } from "../utils/distance";
import { getCurrentUserId } from "./authSession";
import { localRequestStore } from "./localRequestStore";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const SIMILAR_REQUEST_RADIUS_METERS = 200;

type RequestRow = {
  id: string;
  category: string;
  item: string;
  quantity: number;
  description: string | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  status: "pending" | "resolved";
  partial_support: boolean;
  created_at: string;
  created_by: string;
  requester_name: string | null;
  requester_phone: string | null;
  requester_anonymous: boolean;
  address: string | null;
};

type SupportReportRow = {
  id: string;
  request_id: string;
  supporter_id: string;
  supporter_name: string | null;
  supporter_phone: string | null;
  details: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  anonymous: boolean;
  status: "pending_confirmation" | "confirmed" | "rejected" | "partial";
  created_at: string;
};

function mapRequest(row: RequestRow, supportReports: SupportReportRow[] = []): Request {
  return {
    id: row.id,
    category: row.category,
    item: row.item,
    quantity: row.quantity,
    description: row.description ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    partialSupport: row.partial_support,
    createdAt: row.created_at,
    createdBy: row.created_by,
    requesterName: row.requester_name ?? undefined,
    requesterPhone: row.requester_phone ?? undefined,
    requesterAnonymous: row.requester_anonymous,
    address: row.address ?? undefined,
    comments: [],
    supportReports: supportReports.map(mapSupportReport),
  };
}

function mapSupportReport(row: SupportReportRow): SupportReport {
  return {
    id: row.id,
    requestId: row.request_id,
    supporterId: row.supporter_id,
    supporterName: row.supporter_name ?? undefined,
    supporterPhone: row.supporter_phone ?? undefined,
    details: row.details ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    anonymous: row.anonymous,
    status: row.status,
    createdAt: row.created_at,
  };
}

function requestToInsert(
  input: Omit<Request, "id" | "status" | "partialSupport" | "createdAt" | "createdBy" | "comments" | "supportReports">,
) {
  return {
    category: input.category,
    item: input.item,
    quantity: input.quantity,
    description: input.description ?? null,
    photo_url: input.photoUrl ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    status: "pending" as const,
    partial_support: false,
    created_by: getCurrentUserId(),
    requester_name: input.requesterName ?? null,
    requester_phone: input.requesterPhone ?? null,
    requester_anonymous: input.requesterAnonymous ?? false,
    address: input.address ?? null,
  };
}

async function listSupabaseRequests() {
  if (!supabase) return [];

  const [{ data: requests, error: requestError }, { data: supportReports, error: supportError }] = await Promise.all([
    supabase.from("requests").select("*").order("created_at", { ascending: false }),
    supabase.from("support_reports").select("*").order("created_at", { ascending: true }),
  ]);

  if (requestError) throw requestError;
  if (supportError) throw supportError;

  return (requests as RequestRow[]).map((request) =>
    mapRequest(
      request,
      (supportReports as SupportReportRow[]).filter((report) => report.request_id === request.id),
    ),
  );
}

export const requestService = {
  get currentUserId() {
    return getCurrentUserId();
  },
  isRemoteEnabled: isSupabaseConfigured,

  async listRequests() {
    if (!supabase) return localRequestStore.listRequests();
    return listSupabaseRequests();
  },

  async createRequest(
    input: Omit<Request, "id" | "status" | "partialSupport" | "createdAt" | "createdBy" | "comments" | "supportReports">,
  ) {
    if (!supabase) return localRequestStore.createRequest(input);

    const { data, error } = await supabase.from("requests").insert(requestToInsert(input)).select("*").single();
    if (error) throw error;
    return mapRequest(data as RequestRow);
  },

  async findSimilarPending(category: string, location: Coordinates, radiusMeters = SIMILAR_REQUEST_RADIUS_METERS) {
    const requests = await this.listRequests();
    return requests.find(
      (request) =>
        request.status === "pending" &&
        request.category === category &&
        distanceInMeters(location, request) <= radiusMeters,
    );
  },

  async addComment(requestId: string, text: string) {
    return localRequestStore.addComment(requestId, text);
  },

  async offerSupport(
    requestId: string,
    input: Partial<Pick<SupportReport, "supporterName" | "supporterPhone" | "details" | "photoUrl" | "latitude" | "longitude" | "anonymous">> = {},
  ) {
    if (!supabase) return localRequestStore.offerSupport(requestId, input);

    const { data, error } = await supabase
      .from("support_reports")
      .insert({
        request_id: requestId,
        supporter_id: getCurrentUserId(),
        supporter_name: input.supporterName ?? null,
        supporter_phone: input.supporterPhone ?? null,
        details: input.details ?? null,
        photo_url: input.photoUrl ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        anonymous: input.anonymous ?? false,
        status: "pending_confirmation",
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapSupportReport(data as SupportReportRow);
  },

  async confirmSupport(requestId: string, status: SupportReport["status"]) {
    if (!supabase) return localRequestStore.confirmSupport(requestId, status);

    const updates = {
      status: status === "confirmed" ? ("resolved" as const) : ("pending" as const),
      partial_support: status === "partial",
    };

    const { error: requestError } = await supabase.from("requests").update(updates).eq("id", requestId);
    if (requestError) throw requestError;

    const { data: latestReports, error: reportListError } = await supabase
      .from("support_reports")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (reportListError) throw reportListError;
    const latestReport = latestReports?.[0] as SupportReportRow | undefined;
    if (!latestReport) return;

    const { error: reportError } = await supabase.from("support_reports").update({ status }).eq("id", latestReport.id);
    if (reportError) throw reportError;
  },
};

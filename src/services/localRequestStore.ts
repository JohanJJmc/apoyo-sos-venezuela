import type { Comment, Coordinates, Request, SupportReport } from "../types/request";
import { distanceInMeters } from "../utils/distance";
import { getCurrentUserId } from "./authSession";

const STORAGE_KEY = "apoyo-sos-requests";
const RESOLVED_RETENTION_MS = 48 * 60 * 60 * 1000;
const SUPPORT_CONFIRMATION_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const seedRequests: Request[] = [
  {
    id: id(),
    category: "Agua",
    item: "Agua potable",
    quantity: 8,
    description: "Familia con dos adultos mayores necesita agua para hoy.",
    requesterName: "Johan meneses",
    requesterPhone: "0412 0000000",
    address: "Av. Lorem ipsum,###, La guaira",
    latitude: 10.501,
    longitude: -66.917,
    status: "pending",
    partialSupport: false,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    resolvedAt: undefined,
    createdBy: "seed-user",
    comments: [],
    supportReports: [],
  },
  {
    id: id(),
    category: "Asistencia médica",
    item: "Atención médica",
    quantity: 1,
    description: "Tratamiento urgente, mantener refrigerado.",
    requesterName: "Name",
    requesterPhone: "Telefono ######",
    address: "Av. Lorem ipsum,###, La guaira",
    latitude: 10.505,
    longitude: -66.913,
    status: "pending",
    partialSupport: true,
    partialSupportNote: "Falta completar la atención médica.",
    createdAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    resolvedAt: undefined,
    createdBy: "seed-user",
    comments: [],
    supportReports: [],
  },
  {
    id: id(),
    category: "Refugio",
    item: "Cobijas",
    quantity: 4,
    description: "Solicitud atendida por vecinos de la zona.",
    requesterName: "Name",
    requesterPhone: "Telefono ######",
    address: "Av. Lorem ipsum,###, La guaira",
    latitude: 10.498,
    longitude: -66.921,
    status: "resolved",
    partialSupport: false,
    createdAt: new Date(Date.now() - 26 * 60 * 60000).toISOString(),
    resolvedAt: new Date(Date.now() - 26 * 60 * 60000).toISOString(),
    createdBy: "seed-user",
    comments: [],
    supportReports: [],
  },
];

function read(): Request[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRequests));
    return seedRequests;
  }

  try {
    return JSON.parse(raw) as Request[];
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRequests));
    return seedRequests;
  }
}

function write(requests: Request[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function removeExpiredResolved(requests: Request[]) {
  const currentTime = Date.now();
  return requests.filter((request) => {
    if (request.status !== "resolved") return true;
    const resolvedTime = request.resolvedAt ? new Date(request.resolvedAt).getTime() : new Date(request.createdAt).getTime();
    return currentTime - resolvedTime < RESOLVED_RETENTION_MS;
  });
}

function expirePendingSupportReports(requests: Request[]) {
  const currentTime = Date.now();
  return requests.map((request) => ({
    ...request,
    supportReports: request.supportReports.map((report) =>
      report.status === "pending_confirmation" &&
      currentTime - new Date(report.createdAt).getTime() > SUPPORT_CONFIRMATION_TIMEOUT_MS
        ? { ...report, status: "expired" as const }
        : report,
    ),
  }));
}

export const localRequestStore = {
  get currentUserId() {
    return getCurrentUserId();
  },

  listRequests() {
    const requests = removeExpiredResolved(expirePendingSupportReports(read()));
    write(requests);
    return requests;
  },

  createRequest(input: Omit<Request, "id" | "status" | "partialSupport" | "createdAt" | "createdBy" | "comments" | "supportReports">) {
    const requests = read();
    const request: Request = {
      ...input,
      id: id(),
      status: "pending",
      partialSupport: false,
      createdAt: now(),
      resolvedAt: undefined,
      createdBy: getCurrentUserId(),
      comments: [],
      supportReports: [],
    };

    write([request, ...requests]);
    return request;
  },

  updateRequest(
    requestId: string,
    input: Partial<Pick<Request, "category" | "item" | "description" | "photoUrl" | "latitude" | "longitude" | "address">>,
  ) {
    const userId = getCurrentUserId();
    let updatedRequest: Request | undefined;
    write(
      read().map((request) => {
        if (request.id !== requestId || request.createdBy !== userId) return request;
        updatedRequest = { ...request, ...input };
        return updatedRequest;
      }),
    );
    if (!updatedRequest) throw new Error("No se pudo editar la solicitud.");
    return updatedRequest;
  },

  findSimilarPending(category: string, location: Coordinates, radiusMeters: number) {
    return read().find(
      (request) =>
        request.status === "pending" &&
        request.category === category &&
        distanceInMeters(location, request) <= radiusMeters,
    );
  },

  addComment(requestId: string, text: string) {
    const requests = read();
    const comment: Comment = {
      id: id(),
      requestId,
      userId: getCurrentUserId(),
      text,
      createdAt: now(),
    };

    write(
      requests.map((request) =>
        request.id === requestId ? { ...request, comments: [...request.comments, comment] } : request,
      ),
    );
    return comment;
  },

  offerSupport(
    requestId: string,
    input: Partial<Pick<SupportReport, "supporterName" | "supporterPhone" | "details" | "photoUrl" | "latitude" | "longitude" | "anonymous">> = {},
  ) {
    const requests = read();
    const report: SupportReport = {
      id: id(),
      requestId,
      supporterId: getCurrentUserId(),
      ...input,
      status: "pending_confirmation",
      createdAt: now(),
    };

    write(
      requests.map((request) =>
        request.id === requestId ? { ...request, supportReports: [...request.supportReports, report] } : request,
      ),
    );
    return report;
  },

  confirmSupport(requestId: string, status: SupportReport["status"], partialNote?: string, supportReportId?: string) {
    const requests = read();
    write(
      requests.map((request) => {
        if (request.id !== requestId) return request;
        const fallbackReportId = [...request.supportReports].reverse().find((report) => report.status === "pending_confirmation")?.id;
        const targetReportId = supportReportId || fallbackReportId;
        return {
          ...request,
          status: status === "confirmed" ? "resolved" : "pending",
          partialSupport: status === "partial" ? true : request.partialSupport,
          partialSupportNote: status === "partial" && partialNote ? partialNote.trim() : request.partialSupportNote,
          resolvedAt: status === "confirmed" ? now() : undefined,
          supportReports: request.supportReports.map((report) => {
            if (report.id !== targetReportId) return report;
            return {
              ...report,
              status,
              partialNote: status === "partial" ? partialNote?.trim() || report.partialNote : report.partialNote,
            };
          }),
        };
      }),
    );
  },

  cancelRequest(requestId: string) {
    const userId = getCurrentUserId();
    write(read().filter((request) => request.id !== requestId || request.createdBy !== userId));
  },

  deleteCurrentUserData() {
    const userId = getCurrentUserId();
    write(
      read().filter((request) => request.createdBy !== userId).map((request) => ({
        ...request,
        supportReports: request.supportReports.filter((report) => report.supporterId !== userId),
      })),
    );
  },
};

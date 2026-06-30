import type { Comment, Coordinates, Request, SupportReport } from "../types/request";
import { distanceInMeters } from "../utils/distance";

const STORAGE_KEY = "apoyo-sos-requests";
const DEFAULT_USER_ID = "local-user";

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
    createdAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
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

export const localRequestStore = {
  currentUserId: DEFAULT_USER_ID,

  listRequests() {
    return read();
  },

  createRequest(input: Omit<Request, "id" | "status" | "partialSupport" | "createdAt" | "createdBy" | "comments" | "supportReports">) {
    const requests = read();
    const request: Request = {
      ...input,
      id: id(),
      status: "pending",
      partialSupport: false,
      createdAt: now(),
      createdBy: DEFAULT_USER_ID,
      comments: [],
      supportReports: [],
    };

    write([request, ...requests]);
    return request;
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
      userId: DEFAULT_USER_ID,
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
      supporterId: DEFAULT_USER_ID,
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

  confirmSupport(requestId: string, status: SupportReport["status"]) {
    const requests = read();
    write(
      requests.map((request) => {
        if (request.id !== requestId) return request;
        return {
          ...request,
          status: status === "confirmed" ? "resolved" : "pending",
          partialSupport: status === "partial" ? true : request.partialSupport,
          supportReports: request.supportReports.map((report, index) =>
            index === request.supportReports.length - 1 ? { ...report, status } : report,
          ),
        };
      }),
    );
  },
};

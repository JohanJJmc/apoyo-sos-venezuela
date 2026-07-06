import type { Request } from "../types/request";

function countryFromAddress(address?: string) {
  const text = (address || "").toLowerCase();
  if (text.includes("brasil") || text.includes("brazil")) return "BR";
  if (text.includes("venezuela")) return "VE";
  if (text.includes("colombia")) return "CO";
  if (text.includes("peru") || text.includes("perú")) return "PE";
  if (text.includes("ecuador")) return "EC";
  if (text.includes("chile")) return "CL";
  if (text.includes("argentina")) return "AR";
  return "NX";
}

function fallbackNumber(id: string) {
  const compactId = id.replace(/-/g, "").slice(0, 8);
  const parsed = Number.parseInt(compactId, 16);
  if (!Number.isFinite(parsed)) return 1;
  return (parsed % 9000) + 1;
}

function requestSequenceNumber(request: Pick<Request, "id" | "createdAt">, allRequests?: Pick<Request, "id" | "createdAt">[]) {
  if (!allRequests?.length) return fallbackNumber(request.id);

  const sortedRequests = [...allRequests].sort((first, second) => {
    const timeDiff = new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return first.id.localeCompare(second.id);
  });

  const index = sortedRequests.findIndex((candidate) => candidate.id === request.id);
  return index >= 0 ? index + 1 : sortedRequests.length + 1;
}

export function publicRequestCode(
  request: Pick<Request, "id" | "address" | "createdAt">,
  allRequests?: Pick<Request, "id" | "createdAt">[],
) {
  return `#${requestSequenceNumber(request, allRequests)}-${countryFromAddress(request.address)}`;
}

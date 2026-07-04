import type { Request } from "../types/request";
import { timeAgo } from "../utils/time";
import { CategoryIcon } from "./CategoryIcon";

interface RequestCardProps {
  request: Request;
  onClick: () => void;
}

export function RequestCard({ request, onClick }: RequestCardProps) {
  const hasPendingSupport = request.supportReports.some((report) => report.status === "pending_confirmation");
  const isResolved = request.status === "resolved";
  const isPartial = request.partialSupport && !isResolved;
  const tone = isResolved
    ? {
        border: "border-sos-resolved",
        category: "text-sos-resolved",
        badge: "bg-sos-resolvedSoft text-sos-resolved",
        label: "Atendido",
      }
    : isPartial
      ? {
          border: "border-sos-partial",
          category: "text-sos-partial",
          badge: "bg-sos-partialSoft text-sos-partial",
          label: "Parcial",
        }
    : {
        border: "border-sos-pending",
        category: "text-sos-pending",
        badge: "bg-sos-pendingSoft text-sos-pending",
        label: timeAgo(request.createdAt).replace("hace", "Hace"),
      };

  return (
    <article>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-[18px] border bg-white px-5 py-4 text-left shadow-soft transition active:scale-[0.99] ${tone.border}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`inline-flex items-center gap-2 text-[18px] font-extrabold leading-tight ${tone.category}`}>
              <CategoryIcon category={request.category} className="h-6 w-6 shrink-0" />
              <span className="truncate">{request.category}</span>
            </p>
            <h3 className="mt-3 text-[21px] font-extrabold leading-tight text-sos-ink">{request.item}</h3>
            <p className="mt-2 line-clamp-2 text-[18px] font-semibold leading-snug text-sos-ink">
              {request.address ?? "Dirección no disponible"}
            </p>
          </div>
          <span className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-extrabold uppercase ${tone.badge}`}>
            {tone.label}
          </span>
        </div>
        {request.partialSupportNote && request.status === "pending" && (
          <p className="mt-4 rounded-input bg-sos-partialSoft px-3 py-2 text-[14px] font-extrabold text-sos-partial">
            Falta: {request.partialSupportNote}
          </p>
        )}
        {hasPendingSupport && request.status === "pending" && (
          <p className="mt-4 rounded-pill bg-sos-primarySoft px-3 py-2 text-center text-[13px] font-extrabold text-sos-primary">
            Apoyo ofrecido, esperando confirmación
          </p>
        )}
      </button>
    </article>
  );
}

import type { Request } from "../types/request";
import { timeAgo } from "../utils/time";
import { CategoryIcon } from "./CategoryIcon";
import { StatusBadge } from "./StatusBadge";

interface RequestCardProps {
  request: Request;
  onClick: () => void;
}

export function RequestCard({ request, onClick }: RequestCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full overflow-hidden rounded-card border border-sos-border bg-white text-left shadow-soft ${
        request.status === "resolved" ? "border-l-[5px] border-l-[#00A651]" : "border-l-[5px] border-l-[#D90429]"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[16px] font-bold text-[#C25700]">
              <CategoryIcon category={request.category} className="h-4 w-4 text-[#0054C8]" />
              {request.category}
            </p>
            <h3 className="mt-2 text-[20px] font-extrabold leading-tight text-sos-ink">{request.item}</h3>
          </div>
          <StatusBadge status={request.status} partialSupport={request.partialSupport} />
        </div>
        <p className="mt-1 text-[15px] font-semibold text-sos-muted">Cantidad: {request.quantity}</p>
        <p className="mt-1 text-[16px] font-medium text-sos-ink">{request.address ?? "Av. Lorem ipsum,###, La guaira"}</p>
        <p className="mt-4 border-t border-sos-border pt-3 text-[13px] font-semibold text-sos-muted">
          Publicada: {timeAgo(request.createdAt)}
        </p>
      </div>
    </button>
  );
}

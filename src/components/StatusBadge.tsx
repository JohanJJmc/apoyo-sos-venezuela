import type { RequestStatus } from "../types/request";

interface StatusBadgeProps {
  status: RequestStatus;
  partialSupport?: boolean;
}

export function StatusBadge({ status, partialSupport }: StatusBadgeProps) {
  if (status === "resolved") {
    return <span className="rounded-pill bg-sos-resolvedSoft px-3 py-1 text-[12px] font-extrabold uppercase text-sos-resolved">Atendida</span>;
  }

  return (
    <span className="rounded-pill bg-sos-pendingSoft px-3 py-1 text-[13px] font-extrabold text-sos-pending">
      {partialSupport ? "Apoyo parcial" : "Sin atender >24h"}
    </span>
  );
}

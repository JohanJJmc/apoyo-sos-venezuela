import type { Request, SupportReport } from "../types/request";
import { timeAgo } from "../utils/time";
import { CategoryIcon } from "./CategoryIcon";
import { StatusBadge } from "./StatusBadge";

interface RequestDetailModalProps {
  request: Request | null;
  currentUserId: string;
  onClose: () => void;
  onOfferSupport: (requestId: string) => void;
  onConfirmSupport: (requestId: string, status: SupportReport["status"]) => void;
}

export function RequestDetailModal({
  request,
  currentUserId,
  onClose,
  onOfferSupport,
  onConfirmSupport,
}: RequestDetailModalProps) {
  if (!request) return null;

  const isOwner = request.createdBy === currentUserId;
  const pendingSupport = request.supportReports.some((report) => report.status === "pending_confirmation");
  const latestSupport = request.supportReports[request.supportReports.length - 1];
  const requesterContact = request.requesterAnonymous
    ? "Anonimo"
    : [request.requesterName, request.requesterPhone].filter(Boolean).join(" - ");

  return (
    <div className="absolute inset-0 z-[1000] bg-white">
      <section className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-24">
        <button type="button" onClick={onClose} className="absolute left-8 top-24 grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-3xl">
          ‹
        </button>

        <div className="mt-14 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[18px] font-bold text-[#C25700]">
              <CategoryIcon category={request.category} className="h-4 w-4 text-[#0054C8]" />
              {request.category}
            </p>
            <h2 className="mt-2 text-[20px] font-extrabold leading-tight text-sos-ink">{request.item}</h2>
            <p className="mt-1 text-[16px] font-medium text-sos-ink">{request.address ?? "Av. Lorem ipsum,###, La guaira"}</p>
            {requesterContact && <p className="mt-1 text-[16px] font-medium text-sos-ink">{requesterContact}</p>}
          </div>
          <StatusBadge status={request.status} partialSupport={request.partialSupport} />
        </div>

        <div className="mt-8 border-t border-sos-border pt-4">
          <p className="text-[13px] font-semibold text-sos-muted">Publicada: {timeAgo(request.createdAt)}</p>
        </div>

        {request.description && <p className="mt-4 text-[16px] font-semibold text-sos-muted">{request.description}</p>}
        {request.photoUrl && <img src={request.photoUrl} alt="Foto de la solicitud" className="mt-4 max-h-52 w-full rounded-card object-cover" />}

        <div className="flex-1" />

        {latestSupport && (
          <div className="mb-7 rounded-input bg-sos-resolvedSoft p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-extrabold text-sos-ink">
                  {latestSupport.anonymous ? "Alguien ofreció apoyo" : `${latestSupport.supporterName || "Persona solidaria"} ofreció apoyo`}
                </p>
                {latestSupport.supporterPhone && <p className="mt-1 text-[15px] font-extrabold text-sos-ink">{latestSupport.supporterPhone}</p>}
                {latestSupport.status === "pending_confirmation" && (
                  <p className="mt-1 text-[13px] font-extrabold text-sos-primary">Esperando confirmación</p>
                )}
              </div>
              <span className="text-4xl">→</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {pendingSupport && isOwner ? (
            <>
                <button
                  type="button"
                  onClick={() => onConfirmSupport(request.id, "confirmed")}
                  className="min-h-14 w-full rounded-pill bg-[#00A651] px-4 text-[16px] font-extrabold text-white"
                >
                  Si, fue atendida
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmSupport(request.id, "partial")}
                  className="min-h-12 w-full rounded-pill border border-sos-muted px-4 text-[15px] font-extrabold text-sos-muted"
                >
                  Recibi ayuda parcial
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmSupport(request.id, "rejected")}
                  className="min-h-12 w-full rounded-pill bg-sos-background px-4 text-[15px] font-extrabold text-sos-muted"
                >
                  No recibi ayuda
                </button>
            </>
          ) : pendingSupport ? (
            <p className="rounded-input bg-sos-primarySoft px-4 py-3 text-center text-[15px] font-extrabold text-sos-primary">
              Apoyo ofrecido. Falta que la persona confirme si recibió la ayuda.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onOfferSupport(request.id)}
              disabled={request.status === "resolved"}
              className="min-h-14 w-full rounded-pill bg-[#00A651] px-5 text-[16px] font-extrabold text-white disabled:bg-sos-border"
            >
              Ofrecer apoyo
            </button>
          )}
            {isOwner && (
              <button
                type="button"
                onClick={() => onConfirmSupport(request.id, "confirmed")}
                className="min-h-14 w-full rounded-pill bg-[#59C431] px-5 text-[16px] font-extrabold text-white"
              >
                ✓ Marcar como Atendida
              </button>
            )}
        </div>
      </section>
    </div>
  );
}

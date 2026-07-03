import { useState } from "react";
import type { Request, SupportReport } from "../types/request";
import { timeAgo } from "../utils/time";
import { CategoryIcon } from "./CategoryIcon";
import { StatusBadge } from "./StatusBadge";
import { BackButton } from "./BackButton";

interface RequestDetailModalProps {
  request: Request | null;
  currentUserId: string;
  onClose: () => void;
  onOfferSupport: (requestId: string) => void;
  onConfirmSupport: (requestId: string, status: SupportReport["status"]) => void;
  onCancelRequest: (requestId: string) => void;
}

function supportStatusLabel(status: SupportReport["status"]) {
  if (status === "pending_confirmation") return "Esperando confirmación";
  if (status === "expired") return "Apoyo agotado sin confirmación";
  if (status === "rejected") return "Apoyo no recibido";
  if (status === "partial") return "Ayuda parcial recibida";
  return "Ayuda confirmada";
}

function maskPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const visibleDigits = digits.slice(-4);

  if (!visibleDigits) return "Teléfono protegido";
  return `Teléfono protegido •••• ${visibleDigits}`;
}

export function RequestDetailModal({
  request,
  currentUserId,
  onClose,
  onOfferSupport,
  onConfirmSupport,
  onCancelRequest,
}: RequestDetailModalProps) {
  const [selectedSupport, setSelectedSupport] = useState<SupportReport | null>(null);
  if (!request) return null;

  const isOwner = request.createdBy === currentUserId;
  const currentUserSupport = request.supportReports.find((report) => report.supporterId === currentUserId);
  const canSeeRequesterPhone = isOwner || Boolean(currentUserSupport);
  const pendingSupport = request.supportReports.some((report) => report.status === "pending_confirmation");
  const latestSupport = request.supportReports[request.supportReports.length - 1];
  const requesterName = request.requesterAnonymous ? "Anonimo" : request.requesterName;
  const requesterPhone = request.requesterPhone
    ? canSeeRequesterPhone
      ? request.requesterPhone
      : maskPhone(request.requesterPhone)
    : "";
  const requesterContact = [requesterName, requesterPhone].filter(Boolean).join(" - ");

  return (
    <div className="absolute inset-0 z-[1000] bg-white">
      <section className="flex h-full flex-col overflow-y-auto px-7 pb-6 pt-20">
        <BackButton onClick={onClose} label="Detalle solicitud" />

        <div className="flex items-start justify-between gap-3">
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
          <button type="button" onClick={() => setSelectedSupport(latestSupport)} className="mb-7 w-full rounded-input bg-sos-resolvedSoft p-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-extrabold text-sos-ink">
                  {latestSupport.anonymous ? "Alguien ofreció apoyo" : `${latestSupport.supporterName || "Persona solidaria"} ofreció apoyo`}
                </p>
                {(isOwner || latestSupport.supporterId === currentUserId) && latestSupport.supporterPhone && (
                  <p className="mt-1 text-[15px] font-extrabold text-sos-ink">{latestSupport.supporterPhone}</p>
                )}
                {!isOwner && latestSupport.supporterId !== currentUserId && latestSupport.supporterPhone && (
                  <p className="mt-1 text-[13px] font-extrabold text-sos-muted">Teléfono visible solo para quien creó la solicitud</p>
                )}
                <p className="mt-1 text-[13px] font-extrabold text-sos-primary">{supportStatusLabel(latestSupport.status)}</p>
              </div>
              <span className="text-4xl">→</span>
            </div>
          </button>
        )}

        <div className="space-y-3">
          {isOwner && request.status !== "resolved" ? (
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
                  onClick={() => onCancelRequest(request.id)}
                  className="min-h-12 w-full rounded-pill bg-sos-background px-4 text-[15px] font-extrabold text-sos-muted"
                >
                  Cancelar pedido
                </button>
            </>
          ) : isOwner && request.status === "resolved" ? (
            <p className="rounded-input bg-sos-resolvedSoft px-4 py-3 text-center text-[15px] font-extrabold text-sos-resolved">
              Esta solicitud ya fue atendida.
            </p>
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
        </div>

        {selectedSupport && (
          <div className="fixed inset-0 z-[1200] bg-white px-7 pb-7 pt-20">
            <BackButton onClick={() => setSelectedSupport(null)} label="Detalle apoyo" />
            <section className="mt-8 space-y-5">
              <div className="rounded-input bg-sos-resolvedSoft p-4">
                <p className="text-[15px] font-extrabold text-sos-muted">¿Quién apoya?</p>
                <p className="mt-2 text-[18px] font-extrabold text-sos-ink">
                  {selectedSupport.anonymous ? "Apoyo anónimo" : selectedSupport.supporterName || "Persona solidaria"}
                </p>
                {(isOwner || selectedSupport.supporterId === currentUserId) && selectedSupport.supporterPhone && (
                  <p className="mt-1 text-[16px] font-extrabold text-sos-ink">{selectedSupport.supporterPhone}</p>
                )}
              </div>

              {selectedSupport.details && (
                <div>
                  <p className="text-[14px] font-extrabold text-sos-muted">Descripción</p>
                  <p className="mt-2 rounded-input border border-sos-border bg-sos-background p-4 text-[16px] font-semibold text-sos-ink">
                    {selectedSupport.details}
                  </p>
                </div>
              )}

              {selectedSupport.photoUrl && (
                <div>
                  <p className="mb-2 text-[14px] font-extrabold text-sos-muted">Foto</p>
                  <img src={selectedSupport.photoUrl} alt="Foto del apoyo" className="max-h-80 w-full rounded-card object-cover" />
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

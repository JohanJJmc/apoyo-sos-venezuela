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
  onConfirmSupport: (requestId: string, status: SupportReport["status"], partialNote?: string, supportReportId?: string) => void;
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
  const prefixMatch = phone.match(/^\s*(\+\d{1,4})/);
  const prefix = prefixMatch?.[1] ?? "+";

  if (!visibleDigits) return `${prefix} ••••`;
  return `${prefix} •••• ${visibleDigits}`;
}

function clockTime(isoDate: string) {
  return new Intl.DateTimeFormat("es", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function shortElapsed(isoDate: string) {
  return timeAgo(isoDate)
    .replace("hace ", "")
    .replace(" minuto", " min")
    .replace(" minutos", " min")
    .replace(" hora", " hr")
    .replace(" horas", " hrs")
    .replace("mas", "más");
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
  const [isPartialNoteOpen, setIsPartialNoteOpen] = useState(false);
  const [partialNote, setPartialNote] = useState("");
  if (!request) return null;

  const isOwner = request.createdBy === currentUserId;
  const currentUserSupport = request.supportReports.find((report) => report.supporterId === currentUserId);
  const canSeeRequesterPhone = isOwner || Boolean(currentUserSupport);
  const pendingSupport = request.supportReports.some((report) => report.status === "pending_confirmation");
  const requesterName = request.requesterAnonymous ? "Anonimo" : request.requesterName;
  const requesterPhone = request.requesterPhone
    ? canSeeRequesterPhone
      ? request.requesterPhone
      : maskPhone(request.requesterPhone)
    : "";
  const requesterContact = [requesterName, requesterPhone].filter(Boolean).join(" - ");
  const activeSupport = [...request.supportReports].reverse().find((report) => report.status === "pending_confirmation");
  const timelineReports = request.supportReports.filter((report) => report.status === "partial" || report.status === "confirmed");

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

        <section className="mt-8 border-t border-sos-border pt-4">
          <div className="relative space-y-4 pl-5">
            <span className="absolute bottom-2 left-[4px] top-4 border-l border-dashed border-sos-muted" />

            <article className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-sos-muted" />
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[13px] font-extrabold text-sos-muted">Publicada: {shortElapsed(request.createdAt)}</p>
                <p className="text-[13px] font-extrabold text-sos-muted">{clockTime(request.createdAt)}</p>
              </div>
              {request.description && (
                <div className="rounded-card bg-sos-background px-4 py-3">
                  <p className="text-[13px] font-extrabold text-sos-muted">Detalle Solicitud</p>
                  <p className="mt-2 text-[16px] font-semibold leading-snug text-sos-ink">{request.description}</p>
                </div>
              )}
            </article>

            {timelineReports.map((supportReport) => {
              const isPartial = supportReport.status === "partial";
              const eventColor = isPartial ? "#C25700" : "#008A3D";
              const eventBg = isPartial ? "bg-sos-partialSoft" : "bg-sos-resolvedSoft";
              const supportDetails = supportReport.details || "Apoyo ofrecido sin descripción.";
              const missingDetails = supportReport.partialNote || request.partialSupportNote || "Pendiente por especificar.";

              return (
              <button
                key={supportReport.id}
                type="button"
                onClick={() => setSelectedSupport(supportReport)}
                className="relative block w-full text-left active:scale-[0.99]"
              >
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: eventColor }} />
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1 text-[14px] font-extrabold" style={{ color: eventColor }}>
                    {isPartial ? "Ayuda parcial" : "Ayuda Completa"} <span className="text-[20px] leading-none">›</span>
                  </p>
                  <p className="text-[13px] font-extrabold" style={{ color: eventColor }}>{clockTime(supportReport.createdAt)}</p>
                </div>
                <div className={`rounded-card px-4 py-3 ${eventBg}`}>
                  <p className="text-[13px] font-extrabold" style={{ color: eventColor }}>Detalle apoyo</p>
                  <p className="mt-2 text-[16px] font-semibold leading-snug text-sos-ink">{supportDetails}</p>
                </div>
                {isPartial && (
                  <div className="mt-3 rounded-card bg-sos-background px-4 py-3">
                    <p className="text-[13px] font-extrabold text-sos-muted">¿Qué falta?</p>
                    <p className="mt-2 text-[16px] font-semibold leading-snug text-sos-ink">{missingDetails}</p>
                  </div>
                )}
              </button>
              );
            })}
          </div>
        </section>
        {request.photoUrl && <img src={request.photoUrl} alt="Foto de la solicitud" className="mt-4 max-h-52 w-full rounded-card object-cover" />}

        <div className="flex-1" />

        {isOwner && activeSupport && (
          <button type="button" onClick={() => setSelectedSupport(activeSupport)} className="mb-7 w-full rounded-input bg-sos-resolvedSoft p-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-extrabold text-sos-ink">
                  {activeSupport.anonymous ? "Alguien ofreció apoyo" : `${activeSupport.supporterName || "Persona solidaria"} ofreció apoyo`}
                </p>
                {isOwner && activeSupport.supporterPhone && (
                  <p className="mt-1 text-[15px] font-extrabold text-sos-ink">{activeSupport.supporterPhone}</p>
                )}
                {!isOwner && activeSupport.supporterPhone && (
                  <p className="mt-1 text-[13px] font-extrabold text-sos-muted">Teléfono visible solo para quien creó la solicitud</p>
                )}
                <p className="mt-1 text-[13px] font-extrabold text-sos-primary">{supportStatusLabel(activeSupport.status)}</p>
              </div>
              <span className="text-4xl">→</span>
            </div>
          </button>
        )}

        <div className="space-y-3">
          {isOwner && request.status !== "resolved" ? (
            <button
              type="button"
              onClick={() => onCancelRequest(request.id)}
              className="min-h-12 w-full rounded-pill bg-sos-background px-4 text-[15px] font-extrabold text-sos-muted"
            >
              Cancelar pedido
            </button>
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
                {isOwner && selectedSupport.supporterPhone && (
                  <p className="mt-1 text-[16px] font-extrabold text-sos-ink">{selectedSupport.supporterPhone}</p>
                )}
                {!isOwner && selectedSupport.supporterPhone && (
                  <p className="mt-2 text-[13px] font-extrabold text-sos-muted">Teléfono visible solo para quien creó la solicitud</p>
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

              {isOwner && request.status !== "resolved" && selectedSupport.status === "pending_confirmation" && (
                <div className="fixed inset-x-7 bottom-7 space-y-3 bg-white pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmSupport(request.id, "confirmed", undefined, selectedSupport.id);
                      setSelectedSupport(null);
                    }}
                    className="min-h-14 w-full rounded-pill bg-[#00A651] px-4 text-[16px] font-extrabold text-white"
                  >
                    Solicitud completada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPartialNote("");
                      setIsPartialNoteOpen(true);
                    }}
                    className="min-h-12 w-full rounded-pill border border-sos-muted px-4 text-[15px] font-extrabold text-sos-muted"
                  >
                    Apoyo parcial
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {isPartialNoteOpen && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[rgba(16,42,67,0.42)] px-7">
            <section className="w-full max-w-[420px] rounded-card bg-white p-6 shadow-modal">
              <h3 className="text-center text-[20px] font-extrabold text-sos-ink">¿Qué apoyo falta?</h3>
              <p className="mt-3 text-center text-[15px] font-semibold leading-snug text-sos-muted">
                Describe brevemente qué quedó pendiente para que otras personas sepan cómo completar la ayuda.
              </p>
              <textarea
                value={partialNote}
                onChange={(event) => setPartialNote(event.target.value.slice(0, 240))}
                placeholder="Ejemplo: faltan 2 cajas de agua y medicamentos para la noche"
                className="mt-5 min-h-28 w-full resize-none rounded-input border border-sos-border bg-sos-background p-4 text-[16px] font-semibold text-sos-ink outline-none focus:border-sos-orange"
              />
              <button
                type="button"
                disabled={!partialNote.trim()}
                onClick={() => {
                  onConfirmSupport(request.id, "partial", partialNote.trim(), selectedSupport?.id);
                  setIsPartialNoteOpen(false);
                  setSelectedSupport(null);
                }}
                className="mt-5 min-h-14 w-full rounded-pill bg-sos-partial px-5 text-[16px] font-extrabold text-white disabled:bg-sos-border"
              >
                Guardar ayuda parcial
              </button>
              <button
                type="button"
                onClick={() => setIsPartialNoteOpen(false)}
                className="mt-3 min-h-12 w-full rounded-pill bg-sos-background px-5 text-[15px] font-extrabold text-sos-muted"
              >
                Cancelar
              </button>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

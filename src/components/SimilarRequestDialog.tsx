import type { Request } from "../types/request";

interface SimilarRequestDialogProps {
  request: Request | null;
  onJoin: () => void;
  onCreateAnyway: () => void;
  onCancel: () => void;
}

export function SimilarRequestDialog({ request, onJoin, onCreateAnyway, onCancel }: SimilarRequestDialogProps) {
  if (!request) return null;

  return (
    <div className="nexo-modal-overlay z-[1100]" onClick={onCancel}>
      <section className="nexo-modal-panel p-5 md:max-w-sm" onClick={(event) => event.stopPropagation()}>
        <p className="text-[13px] font-extrabold text-sos-pending">Solicitud cercana</p>
        <h2 className="mt-2 text-[20px] font-extrabold leading-snug text-sos-ink">
          Ya existe una solicitud similar cerca de esta ubicacion. ¿Quieres sumarte a esa solicitud?
        </h2>
        <p className="mt-3 rounded-input bg-sos-background p-3 text-[15px] font-semibold text-sos-ink">
          {request.category}: {request.item}
        </p>
        <div className="mt-4 space-y-2">
          <button type="button" onClick={onJoin} className="nexo-action-button sos-gradient w-full rounded-pill px-4 font-extrabold text-white">
            Sumarme a esa solicitud
          </button>
          <button
            type="button"
            onClick={onCreateAnyway}
            className="nexo-action-button w-full rounded-pill border border-sos-border px-4 font-extrabold text-sos-ink"
          >
            Crear nueva de todas formas
          </button>
          <button type="button" onClick={onCancel} className="nexo-action-button w-full rounded-pill bg-sos-background px-4 font-extrabold text-sos-muted">
            Cancelar
          </button>
        </div>
      </section>
    </div>
  );
}

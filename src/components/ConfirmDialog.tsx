interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  cancelLabel = "Cancelar",
  confirmLabel = "Eliminar pedido",
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 px-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "confirm-dialog-title" : undefined}
        className="flex min-h-[424px] w-full max-w-[334px] flex-col items-center rounded-[28px] bg-white px-6 pb-7 pt-10 text-center shadow-modal"
      >
        <img src="/assets/functional-alert.svg" alt="" className="h-14 w-14" />
        {title && <h2 id="confirm-dialog-title" className="mt-8 text-[20px] font-extrabold text-sos-ink">{title}</h2>}
        {description && <p className="mt-4 text-[15px] font-semibold leading-snug text-sos-muted">{description}</p>}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="mt-6 min-h-11 w-full rounded-pill px-5 text-[16px] font-extrabold text-[#E60000] disabled:opacity-50"
        >
          {isLoading ? "Procesando..." : confirmLabel}
        </button>
      </section>
    </div>
  );
}

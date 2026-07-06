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
    <div
      className="nexo-modal-overlay z-[1300]"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "confirm-dialog-title" : undefined}
        onClick={(event) => event.stopPropagation()}
        className="nexo-modal-panel flex min-h-[424px] flex-col items-center px-6 pb-7 pt-10 text-center md:max-w-[334px]"
      >
        <img src="/assets/functional-alert.svg" alt="" className="h-14 w-14" />
        {title && <h2 id="confirm-dialog-title" className="mt-8 text-[20px] font-extrabold text-sos-ink">{title}</h2>}
        {description && <p className="mt-4 text-[15px] font-semibold leading-snug text-sos-muted">{description}</p>}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="nexo-action-button sos-gradient w-full rounded-pill px-5 font-extrabold text-white shadow-soft disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="nexo-action-button mt-4 w-full rounded-pill px-5 font-extrabold text-[#E60000] disabled:opacity-50"
        >
          {isLoading ? "Procesando..." : confirmLabel}
        </button>
      </section>
    </div>
  );
}

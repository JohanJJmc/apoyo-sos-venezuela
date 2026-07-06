interface AccountDeletedDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDeletedDialog({ isOpen, onClose }: AccountDeletedDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="nexo-modal-overlay z-[1300]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-deleted-title"
        onClick={(event) => event.stopPropagation()}
        className="nexo-modal-panel flex min-h-[424px] flex-col items-center px-6 pb-7 pt-10 text-center md:max-w-[334px]"
      >
        <img src="/assets/functional-done.svg" alt="" className="h-16 w-16" />
        <h2 id="account-deleted-title" className="mt-10 text-[20px] font-extrabold text-sos-ink">
          Cuenta eliminada
        </h2>
        <p className="mt-4 text-[15px] font-semibold leading-snug text-sos-muted">
          Tu cuenta y los datos asociados fueron eliminados correctamente.
        </p>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onClose}
          className="nexo-action-button sos-gradient w-full rounded-pill px-5 font-extrabold text-white shadow-soft"
        >
          Cerrar
        </button>
      </section>
    </div>
  );
}

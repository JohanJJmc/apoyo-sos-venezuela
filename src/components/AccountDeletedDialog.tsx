interface AccountDeletedDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDeletedDialog({ isOpen, onClose }: AccountDeletedDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 px-5" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-deleted-title"
        onClick={(event) => event.stopPropagation()}
        className="flex min-h-[424px] w-full max-w-[334px] flex-col items-center rounded-[28px] bg-white px-6 pb-7 pt-10 text-center shadow-modal"
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
          className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft"
        >
          Cerrar
        </button>
      </section>
    </div>
  );
}

interface DeleteAccountPasswordDialogProps {
  isOpen: boolean;
  password: string;
  error?: string;
  isLoading?: boolean;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onContinue: () => void;
}

export function DeleteAccountPasswordDialog({
  isOpen,
  password,
  error,
  isLoading = false,
  onPasswordChange,
  onCancel,
  onContinue,
}: DeleteAccountPasswordDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 px-5"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-password-title"
        onClick={(event) => event.stopPropagation()}
        className="flex min-h-[424px] w-full max-w-[334px] flex-col rounded-[28px] bg-white px-6 pb-7 pt-10 text-center shadow-modal"
      >
        <img src="/assets/functional-alert.svg" alt="" className="mx-auto h-14 w-14" />
        <h2 id="delete-password-title" className="mt-8 text-[20px] font-extrabold text-sos-ink">
          Confirma tu contraseña
        </h2>
        <p className="mt-4 text-[15px] font-semibold leading-snug text-sos-muted">
          Para eliminar tu cuenta de forma permanente, ingresa tu contraseña nuevamente.
        </p>

        <input
          value={password}
          onChange={(event) => onPasswordChange(event.target.value.replace(/\s/g, "").slice(0, 12))}
          type="password"
          maxLength={12}
          autoComplete="current-password"
          placeholder="Contraseña"
          className="mt-8 min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange"
        />
        {error && <p className="mt-3 rounded-input bg-sos-pendingSoft p-3 text-left text-[13px] font-bold text-sos-pending">{error}</p>}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="min-h-14 w-full rounded-pill border border-sos-border px-5 text-[16px] font-extrabold text-sos-ink disabled:opacity-50"
        >
          Cancelar acción
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={password.length < 6 || isLoading}
          className="sos-gradient mt-4 min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:bg-sos-border disabled:shadow-none"
        >
          {isLoading ? "Eliminando..." : "Continuar"}
        </button>
      </section>
    </div>
  );
}

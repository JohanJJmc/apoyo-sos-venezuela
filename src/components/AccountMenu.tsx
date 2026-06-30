import { useState } from "react";
import type { AppSession } from "../services/authSession";

interface AccountMenuProps {
  session: AppSession;
  onSignOut: () => void;
  onChangeEmail: () => void;
  onDeleteAccountData: () => void;
}

export function AccountMenu({ session, onSignOut, onChangeEmail, onDeleteAccountData }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = session.isAnonymous ? "Anónimo" : session.email ?? "Cuenta";

  return (
    <div className="relative flex items-center gap-3">
      <span className="max-w-[150px] truncate text-[13px] font-bold text-sos-ink">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="grid h-9 w-9 place-items-center rounded-pill border border-sos-border bg-white text-[20px] text-sos-ink shadow-soft"
        aria-label="Configuración de cuenta"
        aria-expanded={isOpen}
      >
        ⚙
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[1200] w-64 rounded-card border border-sos-border bg-white p-3 text-left shadow-sheet">
          <p className="mb-3 truncate text-[13px] font-extrabold text-sos-muted">{label}</p>
          <button type="button" onClick={onSignOut} className="min-h-11 w-full rounded-input px-3 text-left text-[15px] font-extrabold text-sos-ink hover:bg-sos-background">
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={onChangeEmail}
            disabled={session.isAnonymous}
            className="min-h-11 w-full rounded-input px-3 text-left text-[15px] font-extrabold text-sos-ink hover:bg-sos-background disabled:opacity-40"
          >
            Cambiar correo
          </button>
          <button type="button" onClick={onDeleteAccountData} className="mt-2 min-h-11 w-full rounded-input bg-sos-pendingSoft px-3 text-left text-[15px] font-extrabold text-sos-pending">
            Eliminar cuenta y borrar datos
          </button>
        </div>
      )}
    </div>
  );
}

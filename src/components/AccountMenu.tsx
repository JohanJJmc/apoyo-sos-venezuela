import { useEffect, useRef, useState } from "react";
import type { AppSession } from "../services/authSession";

interface AccountMenuProps {
  session: AppSession;
  onOpenAccount: () => void;
  onSignOut: () => void;
  onDeleteAccountData: () => void;
}

export function AccountMenu({ session, onOpenAccount, onSignOut, onDeleteAccountData }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const label = session.isAnonymous ? "Anónimo" : session.email ?? "Cuenta";

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-[22px] text-sos-ink"
        aria-label="Configuración de cuenta"
        aria-expanded={isOpen}
      >
        ⚙
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[1200] w-64 rounded-card border border-sos-border bg-white p-3 text-left shadow-sheet">
          <p className="mb-3 truncate text-[13px] font-extrabold text-sos-muted">{label}</p>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenAccount();
            }}
            disabled={session.isAnonymous}
            className="min-h-11 w-full rounded-input px-3 text-left text-[15px] font-extrabold text-sos-ink hover:bg-sos-background disabled:opacity-40"
          >
            Mi cuenta
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="min-h-11 w-full rounded-input px-3 text-left text-[15px] font-extrabold text-sos-ink hover:bg-sos-background"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onDeleteAccountData();
            }}
            className="mt-2 min-h-11 w-full rounded-input bg-sos-pendingSoft px-3 text-left text-[15px] font-extrabold text-sos-pending"
          >
            Eliminar cuenta y borrar datos
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import type { AppSession } from "../services/authSession";

interface LoginScreenProps {
  onLogin: (session: AppSession) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const canContinue = phone.trim().length >= 7;

  return (
    <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
      <img src="/assets/logo-sos-ve.svg" alt="SOS Venezuela" className="mx-auto h-16 w-auto" />
      <section className="mt-14">
        <h1 className="text-center text-[24px] font-extrabold">Entrar con teléfono</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-[15px] font-semibold text-sos-muted">
          Usaremos tu teléfono para guardar tus solicitudes y reconocer las que creaste.
        </p>
      </section>

      <div className="mt-10 space-y-3">
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Teléfono"
          inputMode="tel"
          className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange"
        />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre y apellido opcional"
          className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange"
        />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        disabled={!canContinue}
        onClick={() => onLogin({ phone: phone.trim(), name: name.trim() || undefined })}
        className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50"
      >
        Continuar
      </button>
    </main>
  );
}

import { useState } from "react";
import type { AppSession } from "../services/authSession";
import { authService } from "../services/authService";
import { isValidFullName, isValidPhone, sanitizeName } from "../utils/validation";
import { PhoneInput } from "./PhoneInput";
import { TextInput } from "./TextInput";

interface RequiredPhoneScreenProps {
  session: AppSession;
  onComplete: (session: AppSession) => void;
  onSignOut: () => void;
  onNotify?: (message: string, tone?: "info" | "success" | "danger") => void;
}

export function RequiredPhoneScreen({ session, onComplete, onSignOut, onNotify }: RequiredPhoneScreenProps) {
  const [name, setName] = useState(session.name ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveProfile() {
    setError("");
    if (!isValidFullName(name)) {
      setError("Ingresa nombre y apellido usando solo letras.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Ingresa un teléfono válido.");
      return;
    }

    setIsSaving(true);
    try {
      const nextSession = await authService.updateProfile({ name, phone });
      const savedSession = nextSession ?? { ...session, name: name.trim(), phone: phone.trim() };
      onComplete(savedSession);
      onNotify?.("Información guardada correctamente.", "success");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "No se pudo guardar el teléfono.";
      setError(message);
      onNotify?.(message, "danger");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-20 text-sos-ink">
      <img src="/assets/nexo-logo.svg" alt="NEXO" className="mx-auto h-16 w-16 rounded-[12px]" />
      <h1 className="mt-10 text-center text-[22px] font-extrabold">Completa tu información</h1>
      <p className="mt-4 text-center text-[15px] font-semibold leading-snug text-sos-muted">
        Necesitamos tu nombre y teléfono para que una solicitud o apoyo pueda ser confirmado de forma segura.
      </p>

      <section className="mt-10 space-y-5">
        <TextInput
          label="Nombre y apellido"
          value={name}
          onChange={(event) => setName(sanitizeName(event.target.value))}
          placeholder="Nombre y apellido"
          autoComplete="name"
        />
        <PhoneInput
          label="Teléfono"
          value={phone}
          onChange={setPhone}
          placeholder="Ingresa tu teléfono"
          autoComplete="tel"
          error={error}
        />
        <p className="rounded-input bg-sos-primarySoft p-4 text-[13px] font-extrabold leading-snug text-sos-primary">
          Este dato no se muestra públicamente. Solo será visible cuando sea necesario para coordinar ayuda.
        </p>
      </section>

      <div className="min-h-10 flex-1" />

      <button
        type="button"
        onClick={saveProfile}
        disabled={isSaving}
        className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50"
      >
        {isSaving ? "Guardando..." : "Guardar información"}
      </button>
      <button type="button" onClick={onSignOut} className="mt-6 text-[14px] font-extrabold text-sos-muted">
        Cerrar sesión
      </button>
    </main>
  );
}

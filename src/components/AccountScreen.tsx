import { useState } from "react";
import type { AppSession } from "../services/authSession";
import { authService } from "../services/authService";
import { BackButton } from "./BackButton";
import { TextInput } from "./TextInput";

interface AccountScreenProps {
  session: AppSession;
  onBack: () => void;
  onSessionChange: (session: AppSession) => void;
}

function sanitizePassword(value: string) {
  return value.replace(/\s/g, "").slice(0, 12);
}

function accountErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AccountScreen({ session, onBack, onSessionChange }: AccountScreenProps) {
  const [name, setName] = useState(session.name ?? "");
  const [email, setEmail] = useState(session.email ?? "");
  const [phone, setPhone] = useState(session.phone ?? "");
  const [password, setPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function saveProfile() {
    setError("");
    setProfileMessage("");
    setIsSavingProfile(true);

    try {
      let nextSession: AppSession | null = null;
      let nextMessage = "Información actualizada.";
      if (email.trim().toLowerCase() !== (session.email ?? "").toLowerCase()) {
        nextSession = await authService.updateEmail(email);
        nextMessage = "Revisa tu correo para confirmar el cambio de email.";
      }

      const profileSession = await authService.updateProfile({ name, phone });
      nextSession = profileSession ?? nextSession ?? { ...session, name: name.trim(), phone: phone.trim(), email: email.trim() };
      onSessionChange(nextSession);
      setProfileMessage(nextMessage);
    } catch (nextError) {
      setError(accountErrorMessage(nextError, "No se pudo actualizar tu información."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword() {
    setError("");
    setPasswordMessage("");
    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const nextSession = await authService.updatePassword(password);
      if (nextSession) onSessionChange(nextSession);
      setPassword("");
      setPasswordMessage("Contraseña actualizada.");
    } catch (nextError) {
      setError(accountErrorMessage(nextError, "No se pudo cambiar la contraseña."));
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white px-7 pb-7 pt-16 text-sos-ink">
      <BackButton onClick={onBack} label="Mi cuenta" />

      <section className="mt-9 space-y-4">
        <TextInput label="Nombre y apellido" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre y apellido" autoComplete="off" />
        <TextInput label="Correo" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@ejemplo.com" inputMode="email" autoComplete="off" />
        <TextInput label="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono" inputMode="tel" autoComplete="off" />

        {profileMessage && <p className="rounded-input bg-sos-primarySoft p-3 text-[13px] font-extrabold text-sos-primary">{profileMessage}</p>}

        <button
          type="button"
          disabled={isSavingProfile}
          onClick={saveProfile}
          className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50"
        >
          Guardar información
        </button>
      </section>

      <section className="mt-10 space-y-4 border-t border-sos-border pt-8">
        <h2 className="text-[20px] font-extrabold">Contraseña</h2>
        <p className="text-[14px] font-semibold text-sos-muted">Por seguridad no mostramos tu contraseña actual. Puedes crear una nueva aquí.</p>
        <TextInput
          label="Nueva contraseña"
          value={password}
          onChange={(event) => setPassword(sanitizePassword(event.target.value))}
          placeholder="Nueva contraseña"
          type="password"
          maxLength={12}
          autoComplete="new-password"
        />

        {passwordMessage && <p className="rounded-input bg-sos-resolvedSoft p-3 text-[13px] font-extrabold text-sos-resolved">{passwordMessage}</p>}
        {error && <p className="rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}

        <button
          type="button"
          disabled={isSavingPassword}
          onClick={savePassword}
          className="min-h-14 w-full rounded-pill border border-sos-border px-5 text-[16px] font-extrabold text-sos-ink shadow-soft disabled:opacity-50"
        >
          Cambiar contraseña
        </button>
      </section>
    </main>
  );
}

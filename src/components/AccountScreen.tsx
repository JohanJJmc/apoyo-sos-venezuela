import { useEffect, useState } from "react";
import type { AppSession } from "../services/authSession";
import { authService } from "../services/authService";
import { pushNotificationService } from "../services/pushNotificationService";
import { isValidEmail, isValidFullName, isValidPhone, normalizeEmail, sanitizeName, validatePassword } from "../utils/validation";
import { BackButton } from "./BackButton";
import { PhoneInput } from "./PhoneInput";
import { TextInput } from "./TextInput";

interface AccountScreenProps {
  session: AppSession;
  onBack: () => void;
  onSessionChange: (session: AppSession) => void;
  onNotify?: (message: string, tone?: "info" | "success" | "danger") => void;
}

function sanitizePassword(value: string) {
  return value.replace(/\s/g, "").slice(0, 12);
}

function accountErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AccountScreen({ session, onBack, onSessionChange, onNotify }: AccountScreenProps) {
  const [name, setName] = useState(session.name ?? "");
  const [email, setEmail] = useState(session.email ?? "");
  const [phone, setPhone] = useState(session.phone ?? "");
  const [password, setPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void pushNotificationService.isEnabled().then((enabled) => {
      if (isMounted) setPushEnabled(enabled);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function saveProfile() {
    setError("");
    setProfileMessage("");
    if (!isValidFullName(name)) {
      setError("Ingresa nombre y apellido usando solo letras.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Ingresa un teléfono válido.");
      return;
    }
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
      onNotify?.(nextMessage, "success");
    } catch (nextError) {
      const message = accountErrorMessage(nextError, "No se pudo actualizar tu información.");
      setError(message);
      onNotify?.(message, "danger");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword() {
    setError("");
    setPasswordMessage("");
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsSavingPassword(true);
    try {
      const nextSession = await authService.updatePassword(password);
      if (nextSession) onSessionChange(nextSession);
      setPassword("");
      setPasswordMessage("Contraseña actualizada.");
      onNotify?.("Contraseña actualizada correctamente.", "success");
    } catch (nextError) {
      const message = accountErrorMessage(nextError, "No se pudo cambiar la contraseña.");
      setError(message);
      onNotify?.(message, "danger");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function enablePushNotifications() {
    setError("");
    setIsEnablingPush(true);
    try {
      if (pushEnabled) {
        await pushNotificationService.disable();
        setPushEnabled(false);
        onNotify?.("Notificaciones desactivadas.", "info");
      } else {
        await pushNotificationService.enable();
        setPushEnabled(true);
        onNotify?.("Notificaciones activadas correctamente.", "success");
      }
    } catch (nextError) {
      const message = accountErrorMessage(nextError, "No se pudieron activar las notificaciones.");
      setError(message);
      onNotify?.(message, "danger");
    } finally {
      setIsEnablingPush(false);
    }
  }

  async function sendTestPushNotification() {
    setError("");
    setIsTestingPush(true);
    try {
      await pushNotificationService.sendTest();
      onNotify?.("Notificación de prueba enviada.", "success");
    } catch (nextError) {
      const message = accountErrorMessage(nextError, "No se pudo enviar la notificación de prueba.");
      setError(message);
      onNotify?.(message, "danger");
    } finally {
      setIsTestingPush(false);
    }
  }

  return (
    <main className="nexo-form-screen min-h-dvh bg-white px-7 pb-7 pt-16 text-sos-ink">
      <BackButton onClick={onBack} label="Mi cuenta" />

      <section className="mt-9 space-y-4">
        <TextInput label="Nombre y apellido" value={name} onChange={(event) => setName(sanitizeName(event.target.value))} placeholder="Nombre y apellido" autoComplete="off" />
        <TextInput label="Correo" value={email} onChange={(event) => setEmail(normalizeEmail(event.target.value))} placeholder="correo@ejemplo.com" inputMode="email" autoComplete="off" />
        <PhoneInput label="Teléfono" value={phone} onChange={setPhone} placeholder="Teléfono" autoComplete="off" />

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
        <button
          type="button"
          disabled={isEnablingPush || !pushNotificationService.isSupported()}
          onClick={enablePushNotifications}
          className="flex min-h-14 w-full items-center justify-between rounded-input border border-sos-border bg-white px-4 text-left shadow-soft disabled:opacity-50"
          aria-pressed={pushEnabled}
        >
          <span>
            <span className="block text-[16px] font-extrabold text-sos-ink">
              {pushEnabled ? "Notificaciones activadas" : "Notificaciones"}
            </span>
            <span className="mt-0.5 block text-[13px] font-semibold text-sos-muted">
              {pushEnabled ? "Recibirás avisos importantes." : "Activa avisos de apoyo y expiración."}
            </span>
          </span>
          <span
            className={`relative h-8 w-14 shrink-0 rounded-pill transition ${
              pushEnabled ? "bg-sos-orange" : "bg-sos-border"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-pill bg-white shadow-soft transition ${
                pushEnabled ? "left-7" : "left-1"
              }`}
            />
          </span>
        </button>
        <button
          type="button"
          disabled={isTestingPush || !pushNotificationService.isSupported() || !pushEnabled}
          onClick={sendTestPushNotification}
          className="min-h-12 w-full rounded-pill bg-sos-primarySoft px-5 text-[15px] font-extrabold text-sos-primary disabled:opacity-50"
        >
          {isTestingPush ? "Enviando prueba..." : "Enviar notificación de prueba"}
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

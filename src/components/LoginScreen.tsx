import { useEffect, useState } from "react";
import { createAnonymousSession, type AppSession } from "../services/authSession";
import { authService } from "../services/authService";
import { checkRateLimit } from "../services/rateLimitService";
import { verifyTurnstileToken } from "../services/turnstileService";
import { BackButton } from "./BackButton";
import { TurnstileWidget } from "./TurnstileWidget";

interface LoginScreenProps {
  onLogin: (session: AppSession) => void;
  initialView?: AuthView;
  securityNotice?: boolean;
  onCancel?: () => void;
  onNotify?: (message: string, tone?: "info" | "success" | "danger") => void;
}

type AuthView = "login" | "signup" | "verify" | "forgotPassword" | "resetPassword";

function authErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate limit")) {
      return "Se enviaron muchos correos en poco tiempo. Espera unos minutos y vuelve a intentar.";
    }
    if (message.includes("already registered") || message.includes("already been registered")) {
      return "Este correo ya tiene una cuenta. Intenta iniciar sesión.";
    }
    return error.message;
  }
  return "No se pudo completar la acción. Intenta de nuevo.";
}

function sanitizePassword(value: string) {
  return value.replace(/\s/g, "").slice(0, 12);
}

function maskEmail(value: string) {
  const [name = "", domain = ""] = value.split("@");
  if (!name || !domain) return "tu correo";

  const visibleStart = name.slice(0, 1);
  const visibleEnd = name.slice(-3);
  const [domainName = "", domainEnd = ""] = domain.split(".");
  const maskedDomain = domainName ? `${domainName.slice(0, 1)}**` : "***";

  return `${visibleStart}****${visibleEnd}@${maskedDomain}.${domainEnd || "com"}`;
}

function PasswordToggleIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 7.8C4.4 9.4 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 12s-3.5-6-9.5-6c-.9 0-1.8.1-2.6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SecurityNotice() {
  return (
    <div className="rounded-input bg-sos-primarySoft p-4 text-[13px] font-extrabold leading-snug text-sos-primary">
      Por seguridad y para evitar usos indebidos o ilícitos, NEXO requiere registro y validación de usuario para publicar solicitudes de ayuda.
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  autoComplete = "current-password",
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: string;
  name?: string;
}) {
  return (
    <label className="relative block">
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(sanitizePassword(event.target.value))}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        maxLength={12}
        autoComplete={autoComplete}
        className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 pr-14 text-[16px] font-semibold outline-none focus:border-sos-orange"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-pill text-sos-muted"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        <PasswordToggleIcon visible={visible} />
      </button>
    </label>
  );
}

export function LoginScreen({ onLogin, initialView = "login", securityNotice = false, onCancel, onNotify }: LoginScreenProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [fullName, setFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [acceptedSafetyTerms, setAcceptedSafetyTerms] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timeout = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendSeconds]);

  const cleanLoginEmail = loginEmail.trim().toLowerCase();
  const cleanSignupEmail = signupEmail.trim().toLowerCase();
  const cleanResetEmail = resetEmail.trim().toLowerCase();
  const confirmationEmail = cleanSignupEmail || cleanLoginEmail;
  const cleanFullName = fullName.trim();
  const cleanSignupPhone = signupPhone.trim();
  const canLogin = cleanLoginEmail.length > 4 && loginPassword.length >= 6;
  const canSignUp =
    cleanFullName.length >= 3 &&
    cleanSignupPhone.length >= 6 &&
    cleanSignupEmail.length > 4 &&
    signupPassword.length >= 6 &&
    signupPassword === passwordConfirm &&
    acceptedSafetyTerms;

  async function submitLogin() {
    if (!canLogin) return;
    setIsLoading(true);
    setError("");
    try {
      onLogin(await authService.signIn(cleanLoginEmail, loginPassword));
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function submitSignUp() {
    if (!canSignUp) {
      setError("Completa nombre, teléfono, correo válido, contraseñas iguales y acepta el aviso de seguridad.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await verifyTurnstileToken(turnstileToken);
      await checkRateLimit("signup");
      await authService.signUp(cleanSignupEmail, signupPassword, cleanFullName, cleanSignupPhone);
      setInfo(`Te enviamos un correo de confirmación a ${cleanSignupEmail}.`);
      setResendSeconds(60);
      setView("verify");
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function resendEmail() {
    if (!confirmationEmail || resendSeconds > 0) return;
    setIsLoading(true);
    setError("");
    try {
      await authService.resendSignupEmail(confirmationEmail);
      setInfo("Correo reenviado. Puede tardar hasta 1 minuto.");
      setResendSeconds(60);
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function submitForgotPassword() {
    if (cleanResetEmail.length < 5) {
      setError("Ingresa tu correo para enviarte el enlace de recuperación.");
      return;
    }

    setIsLoading(true);
    setError("");
    setInfo("");
    try {
      await authService.resetPasswordForEmail(cleanResetEmail);
      setInfo("Te enviamos un correo para recuperar tu contraseña. Revisa tu bandeja de entrada o spam.");
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function submitResetPassword() {
    if (resetPassword.length < 6) {
      setError("La nueva contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const nextSession = await authService.updatePassword(resetPassword);
      onNotify?.("Contraseña actualizada correctamente.", "success");
      if (nextSession) onLogin(nextSession);
    } catch (nextError) {
      const message = authErrorMessage(nextError);
      setError(message);
      onNotify?.(message, "danger");
    } finally {
      setIsLoading(false);
    }
  }

  function goTo(viewName: AuthView) {
    setView(viewName);
    setError("");
    setInfo("");
  }

  if (view === "signup") {
    return (
      <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
        <BackButton onClick={() => (onCancel ? onCancel() : goTo("login"))} label="Crear cuenta" />
        <p className="mt-10 text-[14px] font-semibold text-sos-ink">
          Crear una cuenta ayuda a que puedas gestionar las solicitudes o apoyo que hagas
        </p>

        <form className="mt-8 space-y-3" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <input name="nexo_register_person_name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre y apellido" autoComplete="off" autoCorrect="off" spellCheck={false} className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
          <input name="nexo_register_phone" value={signupPhone} onChange={(event) => setSignupPhone(event.target.value)} placeholder="Teléfono" inputMode="tel" autoComplete="off" autoCorrect="off" spellCheck={false} className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
          <input name="nexo_register_contact_mail" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="Ingresa tu correo" inputMode="email" autoComplete="off" autoCorrect="off" spellCheck={false} className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
          <PasswordField name="nexo_register_secret_one" value={signupPassword} onChange={setSignupPassword} placeholder="Ingresa tu contraseña" visible={showSignupPassword} onToggle={() => setShowSignupPassword((visible) => !visible)} autoComplete="new-password" />
          <PasswordField name="nexo_signup_password_confirm" value={passwordConfirm} onChange={setPasswordConfirm} placeholder="Confirma tu contraseña" visible={showPasswordConfirm} onToggle={() => setShowPasswordConfirm((visible) => !visible)} autoComplete="new-password" />
        </form>

        <div className="mt-5">
          <SecurityNotice />
          <label className="mt-3 flex items-start gap-3 rounded-input border border-sos-border bg-white p-4 text-[13px] font-extrabold leading-snug text-sos-ink">
            <input
              type="checkbox"
              checked={acceptedSafetyTerms}
              onChange={(event) => setAcceptedSafetyTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              Acepto usar NEXO solo para ayuda legítima. Entiendo que cualquier uso indebido o sospechoso podrá ser bloqueado, registrado, investigado y reportado a las autoridades competentes.
            </span>
          </label>
        </div>

        {error && <p className="mt-4 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}
        <div className="flex-1" />

        <div className="mb-4">
          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
        </div>
        <button type="button" disabled={!canSignUp || isLoading} onClick={submitSignUp} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50">
          Crear cuenta
        </button>
        <button type="button" onClick={() => goTo("login")} className="mt-5 min-h-12 w-full rounded-pill border border-sos-border bg-white px-5 text-[15px] font-extrabold text-sos-ink">
          Ya tengo cuenta
        </button>
      </main>
    );
  }

  if (view === "forgotPassword") {
    return (
      <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
        <BackButton onClick={() => goTo("login")} label="Recuperar contraseña" />
        <p className="mt-10 text-[15px] font-semibold leading-snug text-sos-muted">
          Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
        </p>

        <form className="mt-8 space-y-3" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <input
            name="nexo_recovery_email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            placeholder="Ingresa tu correo"
            inputMode="email"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange"
          />
        </form>

        {info && <p className="mt-5 rounded-input bg-sos-primarySoft p-4 text-[13px] font-extrabold text-sos-primary">{info}</p>}
        {error && <p className="mt-5 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}
        <div className="flex-1" />

        <button type="button" disabled={isLoading} onClick={submitForgotPassword} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50">
          Enviar correo
        </button>
      </main>
    );
  }

  if (view === "resetPassword") {
    return (
      <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
        <img src="/assets/nexo-logo.svg" alt="NEXO" className="mx-auto h-16 w-16 rounded-[12px]" />
        <h1 className="mt-9 text-center text-[22px] font-extrabold">Nueva contraseña</h1>
        <p className="mt-4 text-center text-[15px] font-semibold leading-snug text-sos-muted">
          Crea una nueva contraseña para volver a entrar a tu cuenta.
        </p>

        <form className="mt-10 space-y-3" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <PasswordField
            name="nexo_new_recovery_password"
            value={resetPassword}
            onChange={setResetPassword}
            placeholder="Nueva contraseña"
            visible={showResetPassword}
            onToggle={() => setShowResetPassword((visible) => !visible)}
            autoComplete="new-password"
          />
          <PasswordField
            name="nexo_new_recovery_password_confirm"
            value={resetPasswordConfirm}
            onChange={setResetPasswordConfirm}
            placeholder="Confirma tu contraseña"
            visible={showResetPassword}
            onToggle={() => setShowResetPassword((visible) => !visible)}
            autoComplete="new-password"
          />
        </form>

        {error && <p className="mt-5 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}
        <div className="flex-1" />

        <button type="button" disabled={isLoading} onClick={submitResetPassword} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50">
          Guardar contraseña
        </button>
      </main>
    );
  }

  if (view === "verify") {
    return (
      <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => goTo("signup")} className="grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-sos-ink shadow-soft" aria-label="Volver">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[22px] font-extrabold">Confirma tu cuenta</h1>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <img src="/assets/email-vector.svg" alt="" className="h-24 w-24" />
          <p className="mt-10 text-center text-[18px] font-semibold leading-snug text-sos-ink">
            Te enviamos un email de confirmación al correo:
            <br />
            {maskEmail(confirmationEmail)}. Por favor dale clic al link interno para terminar el registro.
          </p>

          <p className="mt-20 w-full rounded-input bg-[#EAF6FF] p-4 text-[13px] font-extrabold leading-snug text-[#0077C8]">
            El envío del correo puede tardar hasta 1 minuto. Verifica la carpeta de spam o la papelera de tu correo electrónico, o haz clic en "Reenviar correo".
          </p>

          <button type="button" disabled={resendSeconds > 0 || isLoading} onClick={resendEmail} className="mt-8 flex min-h-12 w-[82%] items-center justify-center gap-8 rounded-pill border border-sos-border px-4 text-[14px] font-extrabold text-sos-muted disabled:opacity-50">
            <span>{resendSeconds > 0 ? "Reenviar email" : "Reenviar correo"}</span>
            {resendSeconds > 0 && <span className="font-semibold text-sos-ink">{resendSeconds}s</span>}
          </button>
        </div>

        {info && <p className="mt-4 text-[13px] font-bold text-sos-resolved">{info}</p>}
        {error && <p className="mt-4 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}

        <button type="button" onClick={() => goTo("login")} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft">
          Crear cuenta
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-20 text-sos-ink">
      <img src="/assets/nexo-logo.svg" alt="NEXO" className="mx-auto h-16 w-16 rounded-[12px]" />
      <p className="mt-8 text-center text-[14px] font-extrabold">Conecta. Ayuda. Responde.</p>
      {securityNotice && (
        <div className="mt-8">
          <SecurityNotice />
        </div>
      )}

      <form className="mt-8 space-y-3" autoComplete="on" onSubmit={(event) => event.preventDefault()}>
        <input name="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="Ingresa tu correo" inputMode="email" autoComplete="username" className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
        <PasswordField name="password" value={loginPassword} onChange={setLoginPassword} placeholder="Ingresa tu contraseña" visible={showLoginPassword} onToggle={() => setShowLoginPassword((visible) => !visible)} autoComplete="current-password" />
      </form>

      <button type="button" onClick={() => goTo("forgotPassword")} className="mt-6 text-center text-[14px] font-extrabold text-sos-ink">
        Olvidé mi contraseña
      </button>

      {error && <p className="mt-4 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}
      <div className="flex-1" />

      <button type="button" disabled={!canLogin || isLoading} onClick={submitLogin} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50">
        Iniciar sesión
      </button>
      <button type="button" onClick={() => goTo("signup")} className="mt-6 text-[14px] font-extrabold text-sos-ink">
        Crear cuenta
      </button>
      <button type="button" onClick={() => onLogin(createAnonymousSession())} className="mt-8 text-[14px] font-extrabold text-sos-ink">
        Entrar como anónimo
      </button>
    </main>
  );
}

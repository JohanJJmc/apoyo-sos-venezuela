import { useEffect, useState } from "react";
import { createAnonymousSession, type AppSession } from "../services/authSession";
import { authService } from "../services/authService";

interface LoginScreenProps {
  onLogin: (session: AppSession) => void;
}

type AuthView = "login" | "signup" | "verify";

function authErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "No se pudo completar la acción. Intenta de nuevo.";
}

function sanitizePassword(value: string) {
  return value.replace(/\s/g, "").slice(0, 12);
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

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="relative block">
      <input
        value={value}
        onChange={(event) => onChange(sanitizePassword(event.target.value))}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        maxLength={12}
        autoComplete="current-password"
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

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timeout = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendSeconds]);

  const cleanEmail = email.trim().toLowerCase();
  const canLogin = cleanEmail.length > 4 && password.length >= 6;
  const canSignUp = canLogin && password === passwordConfirm;
  const canVerify = cleanEmail.length > 4 && code.trim().length >= 6;

  async function submitLogin() {
    if (!canLogin) return;
    setIsLoading(true);
    setError("");
    try {
      onLogin(await authService.signIn(cleanEmail, password));
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function submitSignUp() {
    if (!canSignUp) {
      setError("Confirma que el correo sea válido y que las contraseñas coincidan.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await authService.signUp(cleanEmail, password);
      setInfo(`Te enviamos un código a ${cleanEmail}. Revisa tu correo.`);
      setResendSeconds(60);
      setView("verify");
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function submitVerify() {
    if (!canVerify) return;
    setIsLoading(true);
    setError("");
    try {
      onLogin(await authService.verifySignupCode(cleanEmail, code));
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  async function resendCode() {
    if (!cleanEmail || resendSeconds > 0) return;
    setIsLoading(true);
    setError("");
    try {
      await authService.resendSignupCode(cleanEmail);
      setInfo("Código reenviado. Puede tardar hasta 1 minuto.");
      setResendSeconds(60);
    } catch (nextError) {
      setError(authErrorMessage(nextError));
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
        <button type="button" onClick={() => goTo("login")} className="grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-2xl">
          ‹
        </button>
        <h1 className="mt-3 text-[20px] font-extrabold">Crear cuenta</h1>
        <p className="mt-16 text-[14px] font-semibold text-sos-ink">
          Crear una cuenta ayuda a que puedas gestionar las solicitudes o apoyo que hagas
        </p>

        <div className="mt-8 space-y-3">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Ingresa tu correo" inputMode="email" className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
          <PasswordField value={password} onChange={setPassword} placeholder="Ingresa tu contraseña" visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />
          <PasswordField value={passwordConfirm} onChange={setPasswordConfirm} placeholder="Confirma tu contraseña" visible={showPasswordConfirm} onToggle={() => setShowPasswordConfirm((visible) => !visible)} />
        </div>

        {error && <p className="mt-4 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}
        <div className="flex-1" />

        <button type="button" disabled={!canSignUp || isLoading} onClick={submitSignUp} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50">
          Crear cuenta
        </button>
      </main>
    );
  }

  if (view === "verify") {
    return (
      <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-16 text-sos-ink">
        <button type="button" onClick={() => goTo("signup")} className="grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-2xl">
          ‹
        </button>
        <h1 className="mt-3 text-[20px] font-extrabold">Confirma tu cuenta</h1>
        <p className="mt-16 text-[14px] font-semibold text-sos-muted">
          Ingresa el código de verificación que te enviamos al correo: {cleanEmail || "tu correo"}. El código es válido por unos minutos.
        </p>

        <div className="mt-8 space-y-4">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ingresa el código enviado" inputMode="numeric" className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
          <p className="rounded-input bg-[#EAF6FF] p-3 text-[13px] font-extrabold text-[#0077C8]">
            El envío del código puede tardar hasta 1 minuto. Verifica spam o la papelera de tu correo electrónico.
          </p>
          <button type="button" disabled={resendSeconds > 0 || isLoading} onClick={resendCode} className="min-h-12 w-full rounded-pill border border-sos-border px-4 text-[14px] font-extrabold text-sos-muted disabled:opacity-50">
            {resendSeconds > 0 ? `Reenviar el código ${resendSeconds}s` : "Reenviar el código"}
          </button>
        </div>

        {info && <p className="mt-4 text-[13px] font-bold text-sos-resolved">{info}</p>}
        {error && <p className="mt-4 rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}
        <div className="flex-1" />

        <button type="button" disabled={!canVerify || isLoading} onClick={submitVerify} className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50">
          Confirmar cuenta
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-white px-7 pb-7 pt-20 text-sos-ink">
      <img src="/assets/nexo-logo.svg" alt="NEXO" className="mx-auto h-16 w-16 rounded-[12px]" />
      <p className="mt-8 text-center text-[14px] font-extrabold">Conecta. Ayuda. Responde.</p>

      <div className="mt-8 space-y-3">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Ingresa tu correo" inputMode="email" className="min-h-14 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold outline-none focus:border-sos-orange" />
        <PasswordField value={password} onChange={setPassword} placeholder="Ingresa tu contraseña" visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />
      </div>

      <button type="button" className="mt-6 text-center text-[14px] font-extrabold text-sos-ink">
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

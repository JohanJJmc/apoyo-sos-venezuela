import { useEffect, useRef } from "react";
import { getTurnstileSiteKey, isTurnstileEnabled } from "../services/turnstileService";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire: () => void;
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-nexo-turnstile]");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Turnstile no pudo cargar.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.nexoTurnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile no pudo cargar."));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  }, [onExpire, onVerify]);

  useEffect(() => {
    let isMounted = true;
    if (!isTurnstileEnabled() || !containerRef.current) return;

    void loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: getTurnstileSiteKey(),
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current(),
          "error-callback": () => onExpireRef.current(),
          theme: "light",
        });
      })
      .catch(() => onExpireRef.current());

    return () => {
      isMounted = false;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  if (!isTurnstileEnabled()) return null;

  return (
    <div className="rounded-input border border-sos-border bg-white p-3">
      <p className="mb-2 text-[13px] font-extrabold text-sos-muted">Verificación de seguridad</p>
      <div ref={containerRef} className="min-h-[65px]" />
    </div>
  );
}

interface ToastMessageProps {
  message: string;
  tone?: "info" | "success" | "danger";
}

function Icon({ tone }: { tone: "info" | "success" | "danger" }) {
  if (tone === "success") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sos-resolved text-white">
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.2 4.1L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (tone === "danger") {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sos-pending text-white">
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M12 8v5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M12 17h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sos-primary text-white">
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 11v6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M12 7h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ToastMessage({ message, tone = "info" }: ToastMessageProps) {
  const toneClass = {
    danger: "border-sos-pending bg-sos-pendingSoft text-sos-pending",
    success: "border-sos-resolved bg-sos-resolvedSoft text-sos-resolved",
    info: "border-sos-primary bg-sos-primarySoft text-sos-primary",
  }[tone];

  return (
    <div className={`flex items-start gap-3 rounded-card border-2 px-4 py-4 shadow-soft ${toneClass}`} role="status" aria-live="polite">
      <Icon tone={tone} />
      <p className="min-w-0 text-[15px] font-extrabold leading-snug">{message}</p>
    </div>
  );
}

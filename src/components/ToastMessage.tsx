interface ToastMessageProps {
  message: string;
  tone?: "default" | "danger";
}

export function ToastMessage({ message, tone = "default" }: ToastMessageProps) {
  const toneClass =
    tone === "danger"
      ? "border-sos-pending/20 bg-sos-pendingSoft text-sos-pending"
      : "border-sos-border bg-white text-sos-muted";

  return (
    <p className={`rounded-input border px-4 py-3 text-[13px] font-extrabold leading-snug shadow-soft ${toneClass}`}>
      {message}
    </p>
  );
}

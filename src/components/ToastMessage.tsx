interface ToastMessageProps {
  message: string;
}

export function ToastMessage({ message }: ToastMessageProps) {
  return (
    <p className="rounded-input border border-sos-border bg-white px-3 py-2 text-[13px] font-bold text-sos-muted shadow-soft">
      {message}
    </p>
  );
}

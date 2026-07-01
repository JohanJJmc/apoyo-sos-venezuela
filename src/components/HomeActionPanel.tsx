interface HomeActionPanelProps {
  locationReady: boolean;
  address?: string;
  isDetectingAddress?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  onClick: () => void;
}

export function HomeActionPanel({ locationReady, address, isDetectingAddress, disabled, disabledMessage, onClick }: HomeActionPanelProps) {
  const helperText = disabled && disabledMessage
    ? disabledMessage
    : isDetectingAddress
      ? "Detectando dirección..."
      : address || (locationReady ? "Ubicación detectada ✓" : "Mueve el mapa para seleccionar");

  return (
    <section className="absolute bottom-6 left-1/2 z-[900] w-[calc(100%-3.5rem)] max-w-sm -translate-x-1/2 rounded-card bg-white p-3 shadow-soft">
      <p className={`mb-3 line-clamp-2 text-center text-[16px] font-extrabold ${disabled ? "text-sos-muted" : "text-[#00A651]"}`}>
        {helperText}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`h-14 w-full rounded-pill px-6 text-[16px] font-extrabold text-white ${
          disabled ? "bg-sos-muted shadow-none" : "sos-gradient"
        }`}
      >
        Pedir apoyo aquí
      </button>
    </section>
  );
}

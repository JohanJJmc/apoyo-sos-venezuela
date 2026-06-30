interface HomeActionPanelProps {
  locationReady: boolean;
  onClick: () => void;
}

export function HomeActionPanel({ locationReady, onClick }: HomeActionPanelProps) {
  return (
    <section className="absolute bottom-6 left-1/2 z-[900] w-[calc(100%-3.5rem)] max-w-sm -translate-x-1/2 rounded-card bg-white p-3 shadow-soft">
      <p className="mb-3 text-center text-[16px] font-extrabold text-[#00A651]">
        {locationReady ? "Ubicación detectada ✓" : "Selecciona tu ubicación"}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="sos-gradient h-14 w-full rounded-pill px-6 text-[16px] font-extrabold text-white"
      >
        Pedir apoyo aquí
      </button>
    </section>
  );
}

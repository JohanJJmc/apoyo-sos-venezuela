interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sos-gradient absolute bottom-4 left-1/2 z-[900] h-14 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 rounded-pill px-8 text-[16px] font-extrabold text-white shadow-soft active:scale-[0.99]"
    >
      Pedir apoyo aquí
    </button>
  );
}

interface BackButtonProps {
  onClick: () => void;
  label: string;
}

export function BackButton({ onClick, label }: BackButtonProps) {
  return (
    <div className="mb-9 flex items-center gap-4">
      <button
        type="button"
        onClick={onClick}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-sos-background text-sos-ink shadow-soft"
        aria-label="Volver"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h2 className="text-[20px] font-extrabold text-sos-ink">{label}</h2>
    </div>
  );
}

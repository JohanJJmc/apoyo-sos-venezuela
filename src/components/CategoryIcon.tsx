interface CategoryIconProps {
  category: string;
  className?: string;
}

function getIconPath(category: string) {
  switch (category) {
    case "Agua":
      return <path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11Z" />;
    case "Comida":
      return (
        <>
          <path d="M4 10h16" />
          <path d="M6 10a6 6 0 0 0 12 0" />
          <path d="M8 18h8" />
        </>
      );
    case "Herramientas":
      return (
        <>
          <path d="m14.7 6.3 3 3" />
          <path d="m3 21 8.5-8.5" />
          <path d="M15 5a4 4 0 0 0 4 4l-7.5 7.5-4-4L15 5Z" />
        </>
      );
    case "Medicamentos":
      return (
        <>
          <path d="m10 21 11-11a4 4 0 0 0-6-6L4 15a4 4 0 0 0 6 6Z" />
          <path d="m9 11 4 4" />
        </>
      );
    case "Asistencia médica":
      return (
        <>
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M4 7h16v13H4Z" />
          <path d="M12 10v7" />
          <path d="M8.5 13.5h7" />
        </>
      );
    case "Refugio":
      return (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </>
      );
    case "Transporte":
      return (
        <>
          <path d="M5 16V8h10l4 4v4" />
          <path d="M5 16h14" />
          <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </>
      );
    case "Rescate":
      return (
        <>
          <path d="M12 3 3 20h18L12 3Z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
        </>
      );
    case "Comunicación":
      return (
        <>
          <path d="M8 4h8v16H8Z" />
          <path d="M11 17h2" />
          <path d="M17 7c2 1.5 2 5 0 6.5" />
        </>
      );
    default:
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
  }
}

export function CategoryIcon({ category, className = "h-5 w-5" }: CategoryIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
    >
      {getIconPath(category)}
    </svg>
  );
}

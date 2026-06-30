import { CATEGORIES } from "../data/categories";
import type { Filters } from "../types/request";

interface FilterChipsProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  placement?: "overlay" | "static";
}

export function FilterChips({ filters, onChange, placement = "static" }: FilterChipsProps) {
  return (
    <section
      className={`rounded-card border border-sos-border bg-white p-3 shadow-soft ${
        placement === "overlay" ? "absolute left-3 right-3 top-[112px] z-[850]" : ""
      }`}
    >
      <p className="mb-2 text-[13px] font-extrabold text-sos-muted">Estado</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...filters, showPending: !filters.showPending })}
          className={`min-h-11 rounded-pill border px-3 text-[13px] font-extrabold ${
            filters.showPending
              ? "border-sos-pending bg-sos-pendingSoft text-sos-pending"
              : "border-sos-border bg-white text-sos-muted"
          }`}
          aria-pressed={filters.showPending}
        >
          Ver pendientes
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, showResolved: !filters.showResolved })}
          className={`min-h-11 rounded-pill border px-3 text-[13px] font-extrabold ${
            filters.showResolved
              ? "border-sos-resolved bg-sos-resolvedSoft text-sos-resolved"
              : "border-sos-border bg-white text-sos-muted"
          }`}
          aria-pressed={filters.showResolved}
        >
          Ver atendidas
        </button>
      </div>
      <p className="mb-2 mt-4 text-[13px] font-extrabold text-sos-muted">Categoría</p>
      <span className="relative block">
        <select
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          className="min-h-12 w-full appearance-none rounded-input border border-sos-border bg-white px-4 pr-12 text-[15px] font-extrabold text-sos-ink outline-none focus:border-sos-primary focus:ring-4 focus:ring-sos-primarySoft"
          aria-label="Filtrar por categoria"
        >
          <option value="Todas">Todas las categorias</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sos-muted"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </section>
  );
}

import { CATEGORIES } from "../data/categories";
import type { Filters } from "../types/request";

interface FilterChipsProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  placement?: "overlay" | "static";
}

export function FilterChips({ filters, onChange, placement = "static" }: FilterChipsProps) {
  const statusValue = filters.showPending && filters.showResolved ? "all" : filters.showResolved ? "resolved" : "pending";

  const handleStatusChange = (value: string) => {
    if (value === "resolved") {
      onChange({ ...filters, showPending: false, showResolved: true });
      return;
    }

    if (value === "all") {
      onChange({ ...filters, showPending: true, showResolved: true });
      return;
    }

    onChange({ ...filters, showPending: true, showResolved: false });
  };

  return (
    <section
      className={`rounded-card border border-sos-border bg-white p-3 shadow-soft ${
        placement === "overlay" ? "absolute left-3 right-3 top-[112px] z-[850]" : ""
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[13px] font-extrabold text-sos-muted">Estado</span>
          <span className="relative block">
            <select
              value={statusValue}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="min-h-12 w-full appearance-none rounded-input border border-sos-border bg-white px-4 pr-12 text-[15px] font-extrabold text-sos-ink outline-none focus:border-sos-primary focus:ring-4 focus:ring-sos-primarySoft"
              aria-label="Filtrar por estado"
            >
              <option value="pending">Pendientes</option>
              <option value="resolved">Atendidas</option>
              <option value="all">Todas</option>
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
        </label>

        <label className="block">
          <span className="mb-2 block text-[13px] font-extrabold text-sos-muted">Categoría</span>
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
        </label>
      </div>
    </section>
  );
}

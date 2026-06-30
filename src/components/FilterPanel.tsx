import type { Filters } from "../types/request";
import { FilterChips } from "./FilterChips";

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  placement?: "overlay" | "static";
}

export function FilterPanel({ filters, onChange, placement = "overlay" }: FilterPanelProps) {
  return <FilterChips filters={filters} onChange={onChange} placement={placement} />;
}

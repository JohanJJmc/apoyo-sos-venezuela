import { CATEGORY_ITEMS, CATEGORIES } from "../data/categories";
import { CategoryIcon } from "./CategoryIcon";
import { SelectInput } from "./SelectInput";

interface CategoryDropdownProps {
  category: string;
  item: string;
  onCategoryChange: (category: string) => void;
  onItemChange: (item: string) => void;
}

export function CategoryDropdown({ category, item, onCategoryChange, onItemChange }: CategoryDropdownProps) {
  const items = CATEGORY_ITEMS[category] ?? [];

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[14px] font-extrabold text-sos-muted">Categoría</p>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sos-ink">
            <CategoryIcon category={category} />
          </span>
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="min-h-12 w-full appearance-none rounded-input border border-sos-border bg-sos-background py-3 pl-12 pr-12 text-[16px] font-semibold text-sos-ink outline-none transition focus:border-sos-orange focus:ring-4 focus:ring-[#F27405]/10"
          >
            {CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
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
        </div>
      </div>
      <SelectInput
        label=""
        value={item}
        options={items}
        onChange={(event) => onItemChange(event.target.value)}
      />
    </div>
  );
}

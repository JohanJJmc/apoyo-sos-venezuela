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
            className="min-h-12 w-full appearance-none rounded-input border border-sos-border bg-sos-background px-12 text-[16px] font-semibold text-sos-ink outline-none focus:border-sos-orange"
          >
            {CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-2xl text-sos-muted">⌄</span>
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

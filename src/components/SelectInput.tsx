import type { SelectHTMLAttributes } from "react";

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
}

export function SelectInput({ label, options, className, ...props }: SelectInputProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-extrabold text-sos-ink">{label}</span>}
      <select
        {...props}
        className={`min-h-12 w-full rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold text-sos-ink outline-none transition focus:border-sos-orange ${className ?? ""}`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

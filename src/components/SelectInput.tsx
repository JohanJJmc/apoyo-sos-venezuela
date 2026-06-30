import type { SelectHTMLAttributes } from "react";

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
}

export function SelectInput({ label, options, className, ...props }: SelectInputProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-extrabold text-sos-ink">{label}</span>}
      <span className="relative block">
        <select
          {...props}
          className={`min-h-12 w-full appearance-none rounded-input border border-sos-border bg-sos-background px-4 pr-12 text-[16px] font-semibold text-sos-ink outline-none transition focus:border-sos-orange focus:ring-4 focus:ring-[#F27405]/10 ${className ?? ""}`}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
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
  );
}

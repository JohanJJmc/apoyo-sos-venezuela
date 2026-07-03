import { useEffect, useRef, useState } from "react";
import {
  formatPhoneNumber,
  PHONE_COUNTRIES,
  sanitizeNationalPhone,
  splitPhoneNumber,
} from "../utils/validation";

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export function PhoneInput({
  label = "Teléfono",
  value,
  onChange,
  placeholder = "Número de teléfono",
  error,
  disabled = false,
  autoComplete = "tel",
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLSpanElement | null>(null);
  const splitValue = splitPhoneNumber(value);
  const selectedCountry = PHONE_COUNTRIES.find((country) => country.code === splitValue.countryCode) ?? PHONE_COUNTRIES[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function updatePhone(countryCode: string, nationalNumber: string) {
    onChange(formatPhoneNumber(countryCode, nationalNumber));
  }

  return (
    <label className="block">
      {label && <span className="mb-2 block text-[14px] font-extrabold text-sos-muted">{label}</span>}
      <div
        className={`grid min-h-14 grid-cols-[126px_minmax(0,1fr)] overflow-visible rounded-input border border-sos-border bg-sos-background ${
          disabled ? "opacity-70" : "focus-within:border-sos-orange"
        }`}
      >
        <span ref={pickerRef} className="relative border-r border-sos-border bg-white">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen((current) => !current)}
            disabled={disabled}
            className="flex h-full w-full items-center gap-2 bg-transparent py-0 pl-3 pr-7 text-left text-[15px] font-extrabold text-sos-ink outline-none disabled:cursor-not-allowed"
            aria-label="Prefijo del país"
            aria-expanded={isOpen}
          >
            <span className="text-[20px] leading-none" aria-hidden="true">
              {selectedCountry.flag}
            </span>
            <span>{selectedCountry.dialCode}</span>
          </button>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sos-muted"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-[1200] max-h-72 w-[260px] overflow-y-auto rounded-2xl border border-sos-border bg-white p-2 shadow-sos-card">
              {PHONE_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    updatePhone(country.code, splitValue.nationalNumber);
                    setIsOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-bold ${
                    country.code === selectedCountry.code ? "bg-sos-primary-soft text-sos-ink" : "text-sos-ink hover:bg-sos-background"
                  }`}
                >
                  <span className="text-[22px] leading-none" aria-hidden="true">
                    {country.flag}
                  </span>
                  <span className="w-14 shrink-0">{country.dialCode}</span>
                  <span className="min-w-0 truncate text-[13px] text-sos-muted">{country.name}</span>
                </button>
              ))}
            </div>
          )}
        </span>

        <input
          value={splitValue.nationalNumber}
          onChange={(event) => updatePhone(selectedCountry.code, sanitizeNationalPhone(event.target.value))}
          placeholder={placeholder}
          inputMode="tel"
          autoComplete={autoComplete}
          disabled={disabled}
          className="min-w-0 bg-transparent px-4 text-[16px] font-semibold text-sos-ink outline-none placeholder:text-sos-muted disabled:cursor-not-allowed"
        />
      </div>
      {error && <span className="mt-2 block text-[13px] font-bold text-sos-pending">{error}</span>}
    </label>
  );
}

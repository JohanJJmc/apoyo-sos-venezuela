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
  const splitValue = splitPhoneNumber(value);
  const selectedCountry = PHONE_COUNTRIES.find((country) => country.code === splitValue.countryCode) ?? PHONE_COUNTRIES[0];

  function updatePhone(countryCode: string, nationalNumber: string) {
    onChange(formatPhoneNumber(countryCode, nationalNumber));
  }

  return (
    <label className="block">
      {label && <span className="mb-2 block text-[14px] font-extrabold text-sos-muted">{label}</span>}
      <div
        className={`grid min-h-14 grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-input border border-sos-border bg-sos-background ${
          disabled ? "opacity-70" : "focus-within:border-sos-orange"
        }`}
      >
        <span className="relative border-r border-sos-border bg-white">
          <select
            value={splitValue.countryCode}
            onChange={(event) => updatePhone(event.target.value, splitValue.nationalNumber)}
            disabled={disabled}
            className="h-full w-full appearance-none bg-transparent py-0 pl-3 pr-7 text-[15px] font-extrabold text-sos-ink outline-none disabled:cursor-not-allowed"
            aria-label="Prefijo del país"
          >
            {PHONE_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.dialCode}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sos-muted"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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

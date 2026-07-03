const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_ALLOWED_PATTERN = /[^\p{L}\p{M}' -]/gu;
const PHONE_ALLOWED_PATTERN = /[^\d()+\-.\s]/g;
const PHONE_SEQUENCE_PATTERNS = ["0123456789", "1234567890", "0987654321", "9876543210"];

export const PHONE_COUNTRIES = [
  { code: "VE", flag: "🇻🇪", name: "Venezuela", dialCode: "+58", minNationalDigits: 7, maxNationalDigits: 10 },
  { code: "BR", flag: "🇧🇷", name: "Brasil", dialCode: "+55", minNationalDigits: 10, maxNationalDigits: 11 },
  { code: "CO", flag: "🇨🇴", name: "Colombia", dialCode: "+57", minNationalDigits: 10, maxNationalDigits: 10 },
  { code: "US", flag: "🇺🇸", name: "Estados Unidos", dialCode: "+1", minNationalDigits: 10, maxNationalDigits: 10 },
  { code: "PE", flag: "🇵🇪", name: "Perú", dialCode: "+51", minNationalDigits: 8, maxNationalDigits: 9 },
  { code: "EC", flag: "🇪🇨", name: "Ecuador", dialCode: "+593", minNationalDigits: 8, maxNationalDigits: 9 },
  { code: "CL", flag: "🇨🇱", name: "Chile", dialCode: "+56", minNationalDigits: 9, maxNationalDigits: 9 },
  { code: "AR", flag: "🇦🇷", name: "Argentina", dialCode: "+54", minNationalDigits: 10, maxNationalDigits: 11 },
  { code: "MX", flag: "🇲🇽", name: "México", dialCode: "+52", minNationalDigits: 10, maxNationalDigits: 10 },
  { code: "ES", flag: "🇪🇸", name: "España", dialCode: "+34", minNationalDigits: 9, maxNationalDigits: 9 },
] as const;

export function sanitizeName(value: string) {
  return value.replace(NAME_ALLOWED_PATTERN, "").replace(/\s{2,}/g, " ").slice(0, 80);
}

export function sanitizePhone(value: string) {
  return value.replace(PHONE_ALLOWED_PATTERN, "").replace(/\s{2,}/g, " ").slice(0, 24);
}

export function sanitizeNationalPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function splitPhoneNumber(value: string) {
  const cleanValue = sanitizePhone(value).trim();
  const match = PHONE_COUNTRIES.find((country) => cleanValue.startsWith(country.dialCode));
  const country = match ?? PHONE_COUNTRIES[0];
  const withoutDialCode = match ? cleanValue.slice(match.dialCode.length) : cleanValue;

  return {
    countryCode: country.code,
    nationalNumber: sanitizeNationalPhone(withoutDialCode),
  };
}

export function formatPhoneNumber(countryCode: string, nationalNumber: string) {
  const country = PHONE_COUNTRIES.find((item) => item.code === countryCode) ?? PHONE_COUNTRIES[0];
  const digits = sanitizeNationalPhone(nationalNumber);
  return digits ? `${country.dialCode} ${digits}` : country.dialCode;
}

export function isValidPhone(value: string) {
  const cleanValue = sanitizePhone(value).trim();
  const country = PHONE_COUNTRIES.find((item) => cleanValue.startsWith(item.dialCode));
  if (!country) return false;

  const digits = phoneDigits(value);
  const dialDigits = phoneDigits(country.dialCode);
  const nationalDigits = digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;

  if (nationalDigits.length < country.minNationalDigits || nationalDigits.length > country.maxNationalDigits) return false;
  if (/^(\d)\1+$/.test(nationalDigits)) return false;
  if (/(.)\1{5,}/.test(nationalDigits)) return false;
  if (new Set(nationalDigits).size < 3) return false;
  if (PHONE_SEQUENCE_PATTERNS.some((sequence) => sequence.includes(nationalDigits) || sequence.includes(nationalDigits.slice(0, 8)))) {
    return false;
  }

  return true;
}

export function isValidFullName(value: string) {
  const words = sanitizeName(value).trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.join("").length >= 5;
}

export function validatePassword(value: string) {
  if (/\s/.test(value)) return "La contraseña no puede tener espacios.";
  if (value.length < 6) return "La contraseña debe tener mínimo 6 caracteres.";
  if (value.length > 12) return "La contraseña debe tener máximo 12 caracteres.";
  return "";
}

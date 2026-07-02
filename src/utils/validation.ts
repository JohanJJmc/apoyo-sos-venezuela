const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_ALLOWED_PATTERN = /[^\p{L}\p{M}' -]/gu;
const PHONE_ALLOWED_PATTERN = /[^\d()+\-.\s]/g;

export function sanitizeName(value: string) {
  return value.replace(NAME_ALLOWED_PATTERN, "").replace(/\s{2,}/g, " ").slice(0, 80);
}

export function sanitizePhone(value: string) {
  return value.replace(PHONE_ALLOWED_PATTERN, "").replace(/\s{2,}/g, " ").slice(0, 24);
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

export function isValidPhone(value: string) {
  const digits = phoneDigits(value);
  return digits.length >= 7 && digits.length <= 15;
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

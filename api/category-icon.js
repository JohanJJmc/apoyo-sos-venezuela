const ICONS = {
  agua: '<path d="M64 24C52 39 42 51 42 66a22 22 0 0 0 44 0c0-15-10-27-22-42Z"/>',
  comida: '<path d="M31 58h66c-2 25-15 38-33 38S33 83 31 58Z"/><path d="M39 48c5-11 14-18 25-18s20 7 25 18"/>',
  herramientas: '<path d="M39 31a20 20 0 0 0 24 25l34 34-9 9-34-34a20 20 0 0 0-25-24l12 12 10-10-12-12Z"/>',
  medicamentos: '<path d="M38 80 80 38a16 16 0 0 1 23 23L61 103a16 16 0 0 1-23-23Z"/><path d="M59 59l23 23"/>',
  asistencia: '<path d="M34 42h60a8 8 0 0 1 8 8v42a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V50a8 8 0 0 1 8-8Z"/><path d="M52 42v-8a8 8 0 0 1 8-8h8a8 8 0 0 1 8 8v8"/><path d="M64 58v26M51 71h26"/>',
  refugio: '<path d="M24 64 64 31l40 33"/><path d="M35 60v40h58V60"/><path d="M56 100V76h16v24"/>',
  transporte: '<path d="M35 52h58l10 22v22H25V74l10-22Z"/><path d="M43 92a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM85 92a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M38 52l6-16h40l6 16"/>',
  rescate: '<path d="M64 24 108 100H20L64 24Z"/><path d="M64 50v24M64 88h.1"/>',
  comunicacion: '<path d="M45 31h38a8 8 0 0 1 8 8v50a8 8 0 0 1-8 8H45a8 8 0 0 1-8-8V39a8 8 0 0 1 8-8Z"/><path d="M58 84h12"/><path d="M86 35c8 7 12 16 12 29M104 28c11 10 18 23 18 40"/>',
  otros: '<path d="M64 34v60M34 64h60"/>',
};

function normalizeCategory(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function iconKey(category) {
  const normalized = normalizeCategory(category);
  if (normalized.includes("agua")) return "agua";
  if (normalized.includes("comida")) return "comida";
  if (normalized.includes("herramient")) return "herramientas";
  if (normalized.includes("medic")) return normalized.includes("asistencia") ? "asistencia" : "medicamentos";
  if (normalized.includes("refugio")) return "refugio";
  if (normalized.includes("transporte")) return "transporte";
  if (normalized.includes("rescate")) return "rescate";
  if (normalized.includes("comunic")) return "comunicacion";
  return "otros";
}

export default function handler(request, response) {
  const category = request.query?.category || "otros";
  const key = iconKey(category);
  const svg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="url(#paint0_linear)"/>
  <g stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</g>
  <defs><linearGradient id="paint0_linear" x1="0" y1="64" x2="128" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#F44546"/><stop offset="1" stop-color="#EA7304"/></linearGradient></defs>
</svg>`;

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=604800, immutable");
  response.status(200).send(svg);
}

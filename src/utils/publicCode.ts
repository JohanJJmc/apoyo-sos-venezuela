import type { Request } from "../types/request";

function countryFromAddress(address?: string) {
  const text = (address || "").toLowerCase();
  if (text.includes("brasil") || text.includes("brazil")) return "BR";
  if (text.includes("venezuela")) return "VE";
  if (text.includes("colombia")) return "CO";
  if (text.includes("peru") || text.includes("perú")) return "PE";
  if (text.includes("ecuador")) return "EC";
  if (text.includes("chile")) return "CL";
  if (text.includes("argentina")) return "AR";
  return "NX";
}

function stateFromAddress(address?: string) {
  const text = address || "";
  const brazilState = text.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
  if (brazilState?.[1]) return brazilState[1].toUpperCase();

  const venezuelaStates: Record<string, string> = {
    anzoategui: "AN",
    anzoátegui: "AN",
    apure: "AP",
    aragua: "AR",
    barinas: "BA",
    bolivar: "BO",
    bolívar: "BO",
    carabobo: "CA",
    caracas: "DC",
    cojedes: "CO",
    delta: "DA",
    falcon: "FA",
    falcón: "FA",
    guaira: "LG",
    lara: "LA",
    merida: "ME",
    mérida: "ME",
    miranda: "MI",
    monagas: "MO",
    maturin: "MO",
    maturín: "MO",
    portuguesa: "PO",
    sucre: "SU",
    tachira: "TA",
    táchira: "TA",
    trujillo: "TR",
    yaracuy: "YA",
    zulia: "ZU",
  };

  const normalized = text.toLowerCase();
  const match = Object.entries(venezuelaStates).find(([name]) => normalized.includes(name));
  return match?.[1] || "XX";
}

export function publicRequestCode(request: Pick<Request, "id" | "address">) {
  const shortId = request.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${shortId}-${stateFromAddress(request.address)}-${countryFromAddress(request.address)}`;
}

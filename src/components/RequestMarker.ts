import L from "leaflet";
import type { RequestStatus } from "../types/request";
import { colors } from "../design";

function markerIconSvg(category: string) {
  const common = 'fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const paths: Record<string, string> = {
    Agua: `<path ${common} d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11Z"/>`,
    Comida: `<path ${common} d="M4 10h16"/><path ${common} d="M6 10a6 6 0 0 0 12 0"/><path ${common} d="M8 18h8"/>`,
    Herramientas: `<path ${common} d="m14.7 6.3 3 3"/><path ${common} d="m3 21 8.5-8.5"/><path ${common} d="M15 5a4 4 0 0 0 4 4l-7.5 7.5-4-4L15 5Z"/>`,
    Medicamentos: `<path ${common} d="m10 21 11-11a4 4 0 0 0-6-6L4 15a4 4 0 0 0 6 6Z"/><path ${common} d="m9 11 4 4"/>`,
    "Asistencia médica": `<path ${common} d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path ${common} d="M4 7h16v13H4Z"/><path ${common} d="M12 10v7"/><path ${common} d="M8.5 13.5h7"/>`,
    Refugio: `<path ${common} d="m3 11 9-8 9 8"/><path ${common} d="M5 10v10h14V10"/><path ${common} d="M10 20v-6h4v6"/>`,
    Transporte: `<path ${common} d="M5 16V8h10l4 4v4"/><path ${common} d="M5 16h14"/><path ${common} d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path ${common} d="M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>`,
    Rescate: `<path ${common} d="M12 3 3 20h18L12 3Z"/><path ${common} d="M12 9v5"/><path ${common} d="M12 17h.01"/>`,
    Comunicación: `<path ${common} d="M8 4h8v16H8Z"/><path ${common} d="M11 17h2"/><path ${common} d="M17 7c2 1.5 2 5 0 6.5"/>`,
  };

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[category] ?? `<path ${common} d="M12 5v14"/><path ${common} d="M5 12h14"/>`}</svg>`;
}

export function createRequestMarker(status: RequestStatus, category: string) {
  const color = status === "resolved" ? colors.resolved : colors.pending;

  return L.divIcon({
    className: "",
    html: `<div class="sos-marker" style="background:${color}">${markerIconSvg(category)}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

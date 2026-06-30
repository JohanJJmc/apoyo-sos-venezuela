import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { createRequestMarker } from "./RequestMarker";
import type { Coordinates, Request } from "../types/request";

interface MapScreenProps {
  requests: Request[];
  userLocation?: Coordinates;
  manualLocation?: Coordinates;
  pickingLocation: boolean;
  onSelectRequest: (request: Request) => void;
  onManualLocationChange: (location: Coordinates) => void;
}

const DEFAULT_CENTER: Coordinates = { latitude: 10.5, longitude: -66.9167 };

export function MapScreen({
  requests,
  userLocation,
  manualLocation,
  pickingLocation,
  onSelectRequest,
  onManualLocationChange,
}: MapScreenProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const selectedLocationMarker = useRef<L.Marker | null>(null);
  const center = useMemo(() => userLocation ?? DEFAULT_CENTER, [userLocation]);

  useEffect(() => {
    if (!mapElement.current || map.current) return;

    map.current = L.map(mapElement.current, { zoomControl: false }).setView([center.latitude, center.longitude], 14);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map.current);
    markers.current = L.layerGroup().addTo(map.current);
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    if (!map.current || !userLocation) return;
    map.current.setView([userLocation.latitude, userLocation.longitude], 14);
  }, [userLocation]);

  useEffect(() => {
    if (!map.current || !markers.current) return;
    markers.current.clearLayers();

    requests.forEach((request) => {
      L.marker([request.latitude, request.longitude], { icon: createRequestMarker(request.status, request.category) })
        .addTo(markers.current!)
        .on("click", () => onSelectRequest(request));
    });
  }, [requests, onSelectRequest]);

  useEffect(() => {
    if (!map.current) return;

    function handleClick(event: L.LeafletMouseEvent) {
      if (!pickingLocation) return;
      onManualLocationChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    }

    map.current.on("click", handleClick);
    return () => {
      map.current?.off("click", handleClick);
    };
  }, [pickingLocation, onManualLocationChange]);

  useEffect(() => {
    if (!map.current) return;
    if (selectedLocationMarker.current) selectedLocationMarker.current.remove();
    if (!manualLocation) return;

    selectedLocationMarker.current = L.marker([manualLocation.latitude, manualLocation.longitude], {
      icon: L.divIcon({
        className: "",
        html: '<div class="sos-marker" style="background:#102A43"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
    }).addTo(map.current);
  }, [manualLocation]);

  return <div ref={mapElement} className="h-full w-full" aria-label="Mapa de solicitudes de apoyo" />;
}

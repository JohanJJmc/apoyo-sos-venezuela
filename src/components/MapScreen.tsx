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
  onCenterChange: (location: Coordinates) => void;
  onManualLocationPreview: (location: Coordinates) => void;
}

const DEFAULT_CENTER: Coordinates = { latitude: 10.5, longitude: -66.9167 };

export function MapScreen({
  requests,
  userLocation,
  manualLocation,
  pickingLocation,
  onSelectRequest,
  onCenterChange,
  onManualLocationPreview,
}: MapScreenProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const selectedLocationMarker = useRef<L.Marker | null>(null);
  const didCenterOnUser = useRef(false);
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
    if (!map.current || !userLocation || didCenterOnUser.current) return;
    didCenterOnUser.current = true;
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

    const emitCenter = () => {
      const centerPoint = map.current!.getCenter();
      const location = { latitude: centerPoint.lat, longitude: centerPoint.lng };
      onCenterChange(location);
      if (pickingLocation) onManualLocationPreview(location);
    };

    emitCenter();
    map.current.on("moveend zoomend", emitCenter);
    return () => {
      map.current?.off("moveend zoomend", emitCenter);
    };
  }, [onCenterChange, onManualLocationPreview, pickingLocation]);

  useEffect(() => {
    if (!map.current) return;

    function handleClick(event: L.LeafletMouseEvent) {
      if (!pickingLocation) return;
      map.current?.panTo(event.latlng);
      onManualLocationPreview({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    }

    map.current.on("click", handleClick);
    return () => {
      map.current?.off("click", handleClick);
    };
  }, [pickingLocation, onManualLocationPreview]);

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

  return (
    <div className="relative h-full w-full">
      <div ref={mapElement} className="h-full w-full" aria-label="Mapa de solicitudes de apoyo" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] h-9 w-9 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-sos-pending" />
        <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-sos-pending" />
      </div>
    </div>
  );
}

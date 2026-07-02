import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { createRequestClusterMarker, createRequestMarker } from "./RequestMarker";
import type { Coordinates, Request } from "../types/request";

interface MapScreenProps {
  requests: Request[];
  userLocation?: Coordinates;
  pickingLocation: boolean;
  recenterSignal: number;
  mapLayerStyle: MapLayerStyle;
  onSelectRequest: (request: Request) => void;
  onCenterChange: (location: Coordinates) => void;
  onManualLocationPreview: (location: Coordinates) => void;
}

const DEFAULT_CENTER: Coordinates = { latitude: 10.5, longitude: -66.9167 };
const CLUSTER_RADIUS_PX = 58;
const MAP_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
} as const;

export type MapLayerStyle = keyof typeof MAP_LAYERS;

type RequestCluster = {
  requests: Request[];
  point: L.Point;
  latitude: number;
  longitude: number;
};

function clusterRequests(mapInstance: L.Map, requests: Request[]) {
  const clusters: RequestCluster[] = [];

  requests.forEach((request) => {
    const point = mapInstance.latLngToLayerPoint([request.latitude, request.longitude]);
    const cluster = clusters.find((item) => item.point.distanceTo(point) <= CLUSTER_RADIUS_PX);

    if (!cluster) {
      clusters.push({
        requests: [request],
        point,
        latitude: request.latitude,
        longitude: request.longitude,
      });
      return;
    }

    const nextCount = cluster.requests.length + 1;
    cluster.requests.push(request);
    cluster.point = L.point(
      (cluster.point.x * (nextCount - 1) + point.x) / nextCount,
      (cluster.point.y * (nextCount - 1) + point.y) / nextCount,
    );
    cluster.latitude = (cluster.latitude * (nextCount - 1) + request.latitude) / nextCount;
    cluster.longitude = (cluster.longitude * (nextCount - 1) + request.longitude) / nextCount;
  });

  return clusters;
}

export function MapScreen({
  requests,
  userLocation,
  pickingLocation,
  recenterSignal,
  mapLayerStyle,
  onSelectRequest,
  onCenterChange,
  onManualLocationPreview,
}: MapScreenProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const tileLayer = useRef<L.TileLayer | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const didCenterOnUser = useRef(false);
  const center = useMemo(() => userLocation ?? DEFAULT_CENTER, [userLocation]);

  useEffect(() => {
    if (!mapElement.current || map.current) return;

    map.current = L.map(mapElement.current, { zoomControl: false }).setView([center.latitude, center.longitude], 14);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    tileLayer.current = L.tileLayer(MAP_LAYERS.standard.url, {
      attribution: MAP_LAYERS.standard.attribution,
    }).addTo(map.current);
    markers.current = L.layerGroup().addTo(map.current);
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    if (!map.current) return;

    tileLayer.current?.removeFrom(map.current);
    const layer = MAP_LAYERS[mapLayerStyle];
    tileLayer.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19,
    }).addTo(map.current);
  }, [mapLayerStyle]);

  useEffect(() => {
    if (!map.current || !userLocation || didCenterOnUser.current) return;
    didCenterOnUser.current = true;
    map.current.setView([userLocation.latitude, userLocation.longitude], 14);
  }, [userLocation]);

  useEffect(() => {
    if (!map.current || !userLocation || recenterSignal === 0) return;
    map.current.setView([userLocation.latitude, userLocation.longitude], 15);
  }, [recenterSignal, userLocation]);

  useEffect(() => {
    if (!map.current || !markers.current) return;

    const renderMarkers = () => {
      if (!map.current || !markers.current) return;
      markers.current.clearLayers();

      clusterRequests(map.current, requests).forEach((cluster) => {
        if (cluster.requests.length === 1) {
          const request = cluster.requests[0];
          L.marker([request.latitude, request.longitude], { icon: createRequestMarker(request.status, request.category) })
            .addTo(markers.current!)
            .on("click", () => onSelectRequest(request));
          return;
        }

        const hasPending = cluster.requests.some((request) => request.status === "pending");
        const clusterStatus = hasPending ? "pending" : "resolved";
        L.marker([cluster.latitude, cluster.longitude], {
          icon: createRequestClusterMarker(cluster.requests.length, clusterStatus),
        })
          .addTo(markers.current!)
          .on("click", () => {
            const bounds = L.latLngBounds(cluster.requests.map((request) => [request.latitude, request.longitude]));
            if (!bounds.isValid()) return;

            if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
              map.current?.setView(bounds.getCenter(), Math.min((map.current?.getZoom() ?? 14) + 2, 18));
              return;
            }

            map.current?.fitBounds(bounds.pad(0.35), { maxZoom: 18 });
          });
      });
    };

    renderMarkers();
    map.current.on("zoomend moveend", renderMarkers);
    return () => {
      map.current?.off("zoomend moveend", renderMarkers);
    };
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

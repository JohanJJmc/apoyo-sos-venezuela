import type { Coordinates } from "../types/request";

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value: number) => (value * Math.PI) / 180;

export function distanceInMeters(a: Coordinates, b: Coordinates) {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lngDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const value =
    Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

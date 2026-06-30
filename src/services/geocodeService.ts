import type { Coordinates } from "../types/request";

type NominatimResponse = {
  display_name?: string;
};

type BigDataCloudResponse = {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryName?: string;
  localityInfo?: {
    administrative?: Array<{ name?: string; description?: string }>;
  };
};

function coordinateLabel(location: Coordinates) {
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

async function fetchJson<T>(url: string, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Geocode request failed: ${response.status}`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatBigDataCloudAddress(result: BigDataCloudResponse) {
  const administrativeNames =
    result.localityInfo?.administrative
      ?.map((item) => item.name)
      .filter(Boolean)
      .slice(0, 2) ?? [];

  return [
    result.locality,
    result.city,
    ...administrativeNames,
    result.principalSubdivision,
    result.countryName,
  ]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");
}

export async function reverseGeocodeAddress(location: Coordinates) {
  const nominatimUrl =
    `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=es` +
    `&lat=${location.latitude}&lon=${location.longitude}`;

  try {
    const result = await fetchJson<NominatimResponse>(nominatimUrl);
    if (result.display_name) return result.display_name;
  } catch {
    // Try the next public provider below.
  }

  const bigDataCloudUrl =
    `https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=es` +
    `&latitude=${location.latitude}&longitude=${location.longitude}`;

  try {
    const result = await fetchJson<BigDataCloudResponse>(bigDataCloudUrl);
    const address = formatBigDataCloudAddress(result);
    if (address) return address;
  } catch {
    // Fall through to coordinates.
  }

  return coordinateLabel(location);
}

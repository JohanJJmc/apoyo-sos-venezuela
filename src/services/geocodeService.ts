import type { Coordinates } from "../types/request";

type NominatimResponse = {
  display_name?: string;
};

type GeoapifyResponse = {
  features?: Array<{
    properties?: {
      formatted?: string;
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  }>;
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

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
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

function formatGeoapifyAddress(result: GeoapifyResponse) {
  const properties = result.features?.[0]?.properties;
  if (!properties) return "";

  return (
    properties.formatted ||
    [properties.address_line1, properties.address_line2, properties.city, properties.state, properties.country]
      .filter(Boolean)
      .join(", ")
  );
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
  const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined;

  if (geoapifyKey) {
    const geoapifyUrl =
      `https://api.geoapify.com/v1/geocode/reverse?format=geojson&lang=es` +
      `&lat=${location.latitude}&lon=${location.longitude}&apiKey=${encodeURIComponent(geoapifyKey)}`;

    try {
      const result = await fetchJson<GeoapifyResponse>(geoapifyUrl);
      const address = formatGeoapifyAddress(result);
      if (address) return address;
    } catch {
      // Try public providers below.
    }
  }

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

  return "";
}

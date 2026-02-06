export type GeocodeSuggestion = {
  id: string;
  name: string;
  place_name: string;
  center: [number, number];
};

type MapboxGeocodeResponse = {
  features: Array<{
    id: string;
    text: string;
    place_name: string;
    center: [number, number];
  }>;
};

export const fetchGeocodeSuggestions = async (
  query: string,
  token: string,
  limit = 5,
  proximity?: [number, number],
  countryCode = 'ng',
  bbox?: [number, number, number, number]
): Promise<GeocodeSuggestion[]> => {
  if (!query.trim() || !token) return [];
  const proximityParam = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
  const countryParam = countryCode ? `&country=${countryCode}` : '';
  const bboxParam = bbox ? `&bbox=${bbox.join(',')}` : '';
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${encodeURIComponent(query)}.json?` +
    `access_token=${encodeURIComponent(token)}&autocomplete=true&limit=${limit}${proximityParam}${countryParam}${bboxParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Geocoding request failed');
  }

  const data = (await response.json()) as MapboxGeocodeResponse;
  return data.features.map((feature) => ({
    id: feature.id,
    name: feature.text,
    place_name: feature.place_name,
    center: feature.center,
  }));
};

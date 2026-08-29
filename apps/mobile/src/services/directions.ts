export type DirectionsResult = {
  distanceMeters: number;
  geometry: GeoJSON.LineString;
  congestionLevel?: 'low' | 'moderate' | 'heavy' | 'severe';
};

type MapboxDirectionsResponse = {
  routes: Array<{
    distance: number;
    geometry: GeoJSON.LineString;
    legs?: Array<{
      annotation?: {
        congestion?: string[];
      };
    }>;
  }>;
};

const rankCongestion = (values: string[]): DirectionsResult['congestionLevel'] => {
  if (values.some((v) => v === 'severe')) return 'severe';
  if (values.some((v) => v === 'heavy')) return 'heavy';
  if (values.some((v) => v === 'moderate')) return 'moderate';
  if (values.some((v) => v === 'low')) return 'low';
  return undefined;
};

export const fetchDirections = async (
  start: [number, number],
  end: [number, number],
  token: string
): Promise<DirectionsResult> => {
  if (!token) {
    throw new Error('Missing Mapbox token');
  }
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${start[0]},${start[1]};${end[0]},${end[1]}` +
    `?geometries=geojson&overview=full&annotations=congestion&access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Directions request failed');
  }

  const data = (await response.json()) as MapboxDirectionsResponse;
  const route = data.routes[0];
  if (!route) {
    throw new Error('No route found');
  }

  const congestionValues =
    route.legs?.flatMap((leg) => leg.annotation?.congestion ?? []) ?? [];

  return {
    distanceMeters: route.distance,
    geometry: route.geometry,
    congestionLevel: rankCongestion(congestionValues),
  };
};

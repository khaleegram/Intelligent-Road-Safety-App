export type DirectionsResult = {
  distanceMeters: number;
  geometry: GeoJSON.LineString;
};

type MapboxDirectionsResponse = {
  routes: Array<{
    distance: number;
    geometry: GeoJSON.LineString;
  }>;
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
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Directions request failed');
  }

  const data = (await response.json()) as MapboxDirectionsResponse;
  const route = data.routes[0];
  if (!route) {
    throw new Error('No route found');
  }

  return {
    distanceMeters: route.distance,
    geometry: route.geometry,
  };
};

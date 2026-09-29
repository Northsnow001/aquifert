export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_NM = 3440.065;

export function haversine(a: LatLon, b: LatLon): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lon1 = (a.lon * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const lon2 = (b.lon * Math.PI) / 180;
  const dlon = lon2 - lon1;
  const dlat = lat2 - lat1;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathDistance(points: LatLon[]): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += haversine(points[index - 1], points[index]);
  }
  return distance;
}

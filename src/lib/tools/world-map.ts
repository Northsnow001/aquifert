import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import atlas from "@/data/countries-110m.json";

type CountryProps = { name: string };

const topology = atlas as unknown as Topology<{
  countries: GeometryCollection<CountryProps>;
}>;

export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 460;

const projection = geoMercator().scale(148).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + 20]);
const toPath = geoPath(projection);
const countries = feature(topology, topology.objects.countries);

export type CountryShape = {
  id: string;
  name: string;
  d: string;
};

export const COUNTRY_SHAPES: CountryShape[] = countries.features.flatMap((item) => {
  const d = toPath(item as GeoPermissibleObjects);
  if (!d) return [];
  return [
    {
      id: String(item.id ?? "").padStart(3, "0"),
      name: item.properties?.name ?? "Unknown",
      d,
    },
  ];
});

/** Top urea origins. These countries take the green fill while that layer is on. */
export const UREA_EXPORTER_IDS = new Set([
  "643",
  "156",
  "634",
  "682",
  "818",
  "360",
  "458",
  "512",
  "566",
  "780",
  "364",
]);

const FACT_NAME_BY_COUNTRY: Record<string, string> = {
  "United States of America": "USA",
  "Trinidad and Tobago": "Trinidad & Tobago",
};

export function factNameForCountry(name: string) {
  return FACT_NAME_BY_COUNTRY[name] ?? name;
}

export function projectPoint(lon: number, lat: number) {
  const point = projection([lon, lat]);
  if (!point) return null;
  return { x: point[0], y: point[1] };
}

import type { FixtureBand } from "@/lib/freight/fixtures";
import type { PortRecord } from "@/lib/ports";
import { REGIONS, ageInDays, type Fixture } from "@/lib/freight-desk/types";

export type LegMatch = "port" | "country" | "area" | "region" | "cluster" | "unknown";

export type LegGeo = {
  match: LegMatch;
  label: string;
  codes: string[];
  countries: string[];
  areas: string[];
  regions: string[];
};

export type RouteTier = "exact_port_pair" | "country_pair" | "area_pair" | "region_pair";

export const TIER_LABEL: Record<string, string> = {
  exact_port_pair: "Exact port pair",
  country_pair: "Country pair",
  area_pair: "Area pair",
  region_pair: "Region pair",
  wide: "Wide geographic match",
};

export const geoKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[&/.]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const AREAS = [
  { label: "US Gulf", aliases: ["us gulf", "u s gulf", "gulf coast usa", "usg"], regions: ["North America"] },
  { label: "EC Mexico", aliases: ["ec mexico", "east coast mexico", "e c mexico"], regions: ["Central America", "North America"] },
  { label: "WC Mexico", aliases: ["wc mexico", "west coast mexico", "w c mexico"], regions: ["Central America", "North America"] },
  { label: "French Bay", aliases: ["french bay"], regions: ["North America", "Atlantic Europe"] },
];

/** Trade areas smaller than a region that brokers quote, such as US Gulf. */
export function portAreas(port: Pick<PortRecord, "name" | "country" | "code">) {
  const country = geoKey(port.country);
  const name = geoKey(port.name);
  const areas: string[] = [];
  if ((country === "usa" || country === "united states") && (["USHOU", "USMSY", "USMOB"].includes(port.code) || /houston|new orleans|mobile|tampa|corpus christi/.test(name))) areas.push("US Gulf");
  if (country === "mexico" && /veracruz|altamira|tampico|coatzacoalcos|dos bocas/.test(name)) areas.push("EC Mexico");
  if (country === "mexico" && /manzanillo|lazaro cardenas|guaymas|ensenada/.test(name)) areas.push("WC Mexico");
  if ((country === "canada" || country === "france") && /bay comeau|becancour|sept iles|rouen|dunkirk|bordeaux/.test(name)) areas.push("French Bay");
  return areas;
}

export type PortIndex = {
  byCode: Map<string, PortRecord>;
  byName: Map<string, PortRecord[]>;
  byCountry: Map<string, PortRecord[]>;
  byRegion: Map<string, PortRecord[]>;
};

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function indexPorts(ports: PortRecord[]): PortIndex {
  const index: PortIndex = { byCode: new Map(), byName: new Map(), byCountry: new Map(), byRegion: new Map() };
  for (const port of ports) {
    index.byCode.set(port.code.toUpperCase(), port);
    for (const name of unique([port.name, ...(port.aliases ?? [])])) push(index.byName, geoKey(name), port);
    push(index.byCountry, geoKey(port.country), port);
    push(index.byRegion, geoKey(port.region), port);
  }
  return index;
}

export function portGeo(port: PortRecord): LegGeo {
  return { match: "port", label: port.name, codes: [port.code], countries: [port.country], areas: portAreas(port), regions: [port.region] };
}

function groupGeo(match: LegMatch, label: string, ports: PortRecord[], extra: Partial<LegGeo> = {}): LegGeo {
  return {
    match,
    label,
    codes: unique(ports.map((port) => port.code)),
    countries: unique([...(extra.countries ?? []), ...ports.map((port) => port.country)]),
    areas: unique([...(extra.areas ?? []), ...ports.flatMap(portAreas)]),
    regions: unique([...(extra.regions ?? []), ...ports.map((port) => port.region)]),
  };
}

const REGION_KEYS = new Map<string, string>(REGIONS.map((region) => [geoKey(region), region]));
REGION_KEYS.set("se asia", "Southeast Asia");
REGION_KEYS.set("south east asia", "Southeast Asia");

export function regionFor(value: string) {
  return REGION_KEYS.get(geoKey(value)) ?? "";
}

/** Resolves a fixture leg (a port, country, trade area or region, as brokers write it) against the port registry. */
export function resolveLeg(index: PortIndex, name: string, code = "", region = ""): LegGeo {
  const label = (name || region).trim();
  const upper = code.trim().toUpperCase();
  if (upper) {
    const port = index.byCode.get(upper);
    if (port) return portGeo(port);
  }
  const key = geoKey(label);
  if (!key) return { match: "unknown", label: "", codes: [], countries: [], areas: [], regions: unique([regionFor(region)]) };

  const named = index.byName.get(key) ?? [];
  if (named.length === 1) return portGeo(named[0]);

  const country = index.byCountry.get(key);
  if (country?.length) return groupGeo("country", country[0].country, country);

  const area = AREAS.find((item) => item.aliases.includes(key));
  if (area) return { match: "area", label: area.label, codes: [], countries: [], areas: [area.label], regions: area.regions };

  const regionLabel = regionFor(label) || (!named.length ? regionFor(region) : "");
  if (regionLabel) return groupGeo("region", regionLabel, index.byRegion.get(geoKey(regionLabel)) ?? [], { regions: [regionLabel] });

  if (named.length) return groupGeo("cluster", label, named);
  return { match: "unknown", label, codes: [], countries: [], areas: [], regions: [] };
}

const overlaps = (a: string[], b: string[]) => {
  const set = new Set(b.map(geoKey));
  return a.some((value) => set.has(geoKey(value)));
};

/** A fixture leg only counts at the precision it was quoted at: "Brazil" is a country match, never a port match. */
function scoped(geo: LegGeo): LegGeo {
  const portLevel = geo.match === "port" || geo.match === "cluster";
  return {
    ...geo,
    codes: portLevel ? geo.codes : [],
    countries: portLevel || geo.match === "country" ? geo.countries : [],
    areas: portLevel || geo.match === "area" ? geo.areas : [],
  };
}

type LegTier = "port" | "country" | "area" | "region";
const LEG_SCORE: Record<LegTier, number> = { port: 1, country: 0.7, area: 0.5, region: 0.3 };
const LEG_ORDER: LegTier[] = ["port", "country", "area", "region"];
const PAIR_TIER: Record<LegTier, RouteTier> = { port: "exact_port_pair", country: "country_pair", area: "area_pair", region: "region_pair" };

/** A route matches at the looser of its two legs: US Gulf → Brazil is an area pair. */
function routeTier(load: LegGeo, discharge: LegGeo, fixtureLoad: LegGeo, fixtureDischarge: LegGeo): RouteTier | null {
  const a = legTier(load, fixtureLoad);
  const b = legTier(discharge, fixtureDischarge);
  if (!a || !b) return null;
  return PAIR_TIER[LEG_ORDER[Math.max(LEG_ORDER.indexOf(a), LEG_ORDER.indexOf(b))]];
}

function legTier(user: LegGeo, raw: LegGeo): LegTier | null {
  const fixture = scoped(raw);
  if (overlaps(user.codes, fixture.codes)) return "port";
  if (overlaps(user.countries, fixture.countries)) return "country";
  if (overlaps(user.areas, fixture.areas)) return "area";
  if (overlaps(user.regions, fixture.regions)) return "region";
  return null;
}

export function isUsableFixture(fixture: Fixture) {
  return (
    fixture.status === "active" &&
    fixture.rateLow > 0 &&
    fixture.rateHigh > 0 &&
    fixture.rateHigh >= fixture.rateLow &&
    ageInDays(fixture.fixtureDate) !== null
  );
}

const midpoint = (fixture: Fixture) => (fixture.rateLow + fixture.rateHigh) / 2;

function cargoBand(fixture: Fixture) {
  const { cargoMinKt: min, cargoMaxKt: max } = fixture;
  return min > 0 && max > 0 && max >= min ? { min, max } : null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Drops the outer midpoints so one stale or mistyped fixture cannot stretch the band. */
function trim<T extends { mid: number }>(samples: T[]) {
  const sorted = [...samples].sort((a, b) => a.mid - b.mid);
  if (sorted.length <= 4) return sorted;
  if (sorted.length <= 9) return sorted.slice(1, -1);
  const cut = Math.floor(sorted.length * 0.1);
  return cut > 0 ? sorted.slice(cut, sorted.length - cut) : sorted;
}

const TIERS: RouteTier[] = ["exact_port_pair", "country_pair", "area_pair", "region_pair"];
const WINDOWS = [90, 180, 365, 730];
const NEAR_KT = 5;

export type Resolver = (fixture: Fixture) => { load: LegGeo; discharge: LegGeo };

export function fixtureResolver(index: PortIndex): Resolver {
  const cache = new Map<string, { load: LegGeo; discharge: LegGeo }>();
  return (fixture) => {
    const key = `${fixture.id}:${fixture.updatedAt}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = {
        load: resolveLeg(index, fixture.loadName, fixture.loadCode, fixture.loadRegion),
        discharge: resolveLeg(index, fixture.dischargeName, fixture.dischargeCode, fixture.dischargeRegion),
      };
      cache.set(key, hit);
    }
    return hit;
  };
}

/**
 * The verified-rate band for a route: the tightest geographic tier and shortest window that has
 * fixtures in (or near) the cargo size, falling back to a score-weighted wide match.
 */
export function findBenchmarkBand(input: {
  load: PortRecord;
  discharge: PortRecord;
  cargoMt: number;
  fixtures: Fixture[];
  resolve: Resolver;
  now?: number;
}): FixtureBand | null {
  const load = portGeo(input.load);
  const discharge = portGeo(input.discharge);
  const cargoKt = input.cargoMt / 1000;
  const now = input.now ?? Date.now();
  const usable = input.fixtures.filter(isUsableFixture);
  if (!usable.length) return null;

  for (const tier of TIERS) {
    const matches = usable
      .map((fixture) => ({ fixture, geo: input.resolve(fixture) }))
      .filter(({ geo }) => routeTier(load, discharge, geo.load, geo.discharge) === tier)
      .map(({ fixture }) => ({ fixture, age: ageInDays(fixture.fixtureDate, now) ?? Infinity, mid: midpoint(fixture) }));
    if (!matches.length) continue;
    for (const windowDays of WINDOWS) {
      const recent = matches.filter((item) => item.age <= windowDays);
      if (!recent.length) continue;
      const inBand = recent.filter(({ fixture }) => {
        const band = cargoBand(fixture);
        return band ? cargoKt >= band.min && cargoKt <= band.max : false;
      });
      const nearBand = recent.filter(({ fixture }) => {
        const band = cargoBand(fixture);
        return band ? cargoKt >= band.min - NEAR_KT && cargoKt <= band.max + NEAR_KT : false;
      });
      const mode = inBand.length ? "in_band" : nearBand.length ? "near_band" : null;
      if (!mode) continue;
      const samples = trim(mode === "in_band" ? inBand : nearBand);
      if (!samples.length) continue;
      return {
        matchType: tier,
        windowDays,
        sampleSize: samples.length,
        cargoMatchMode: mode,
        rateMin: Math.min(...samples.map(({ fixture }) => fixture.rateLow)),
        rateMax: Math.max(...samples.map(({ fixture }) => fixture.rateHigh)),
        rateMedian: median(samples.map((item) => item.mid)),
        label: TIER_LABEL[tier],
        fixtureIds: samples.map(({ fixture }) => fixture.id),
      };
    }
  }

  const scored = usable
    .map((fixture) => {
      const geo = input.resolve(fixture);
      const loadTier = legTier(load, geo.load);
      const dischargeTier = legTier(discharge, geo.discharge);
      let score = (loadTier ? LEG_SCORE[loadTier] : 0) + (dischargeTier ? LEG_SCORE[dischargeTier] : 0);
      if (!loadTier) {
        const cross = legTier(discharge, geo.load);
        if (cross) score += LEG_SCORE[cross] * 0.5;
      }
      if (!dischargeTier) {
        const cross = legTier(load, geo.discharge);
        if (cross) score += LEG_SCORE[cross] * 0.5;
      }
      if (score <= 0) return null;
      const age = ageInDays(fixture.fixtureDate, now);
      if (age !== null) score *= Math.max(0.1, 1 - age / (365 * 3));
      const band = cargoBand(fixture);
      if (band) {
        const mid = (band.min + band.max) / 2;
        score *= 0.5 + (mid > 0 ? Math.min(cargoKt, mid) / Math.max(cargoKt, mid) : 0) * 0.5;
      }
      return { fixture, score, mid: midpoint(fixture) };
    })
    .filter((item): item is { fixture: Fixture; score: number; mid: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  const total = scored.reduce((sum, item) => sum + item.score, 0);
  if (!scored.length || total <= 0) return null;

  const byMid = [...scored].sort((a, b) => a.mid - b.mid);
  let running = 0;
  let weightedMedian = byMid[0].mid;
  for (const item of byMid) {
    running += item.score;
    if (running >= total / 2) {
      weightedMedian = item.mid;
      break;
    }
  }
  return {
    matchType: "wide",
    windowDays: 730,
    sampleSize: scored.length,
    cargoMatchMode: "in_band",
    rateMin: Math.min(...scored.map(({ fixture }) => fixture.rateLow)),
    rateMax: Math.max(...scored.map(({ fixture }) => fixture.rateHigh)),
    rateMedian: weightedMedian,
    label: TIER_LABEL.wide,
    fixtureIds: scored.map(({ fixture }) => fixture.id),
  };
}

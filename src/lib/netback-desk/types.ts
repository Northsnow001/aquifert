import { BENCHMARK_DATE, BENCHMARK_ORIGINS, NETBACK_CONSTANTS, type Basis, type NetbackCosts, type NetbackOrigin } from "@/lib/netback/calculate";
import type { Plan } from "@/lib/session-shared";

export type BenchmarkSource = "built-in" | "file" | "manual";

export type Benchmark = NetbackOrigin & {
  active: boolean;
  source: BenchmarkSource;
  series: string;
  product: string;
  low: number | null;
  high: number | null;
};

export type NitrogenRow = {
  priceDate: string;
  week: string;
  year: string;
  granularity: string;
  product: string;
  packaging: string;
  incoterm: string;
  series: string;
  low: number;
  mid: number;
  high: number;
  unit: string;
};

export type PriceFile = {
  fileName: string;
  uploadedAt: string;
  week: string;
  year: string;
  priceDate: string;
  lineCount: number;
  rawLength: number;
  rows: NitrogenRow[];
};

export type PriceSnapshot = { week: string; date: string; savedAt: string; prices: Record<string, number> };

export type DutyTone = "active" | "warn" | "ok" | "dim";

export type DutyRecord = { country: string; rate: number; active: boolean; afrmm: boolean; note: string; tone: DutyTone };

export type NetbackSettings = {
  limitCore: number;
  limitGrowth: number;
  limitEnterprise: number;
  retentionDays: number;
  costs: NetbackCosts;
};

export type NetbackDesk = {
  benchmarks: Benchmark[];
  week: string;
  date: string;
  priceFile: PriceFile | null;
  history: PriceSnapshot[];
  duties: DutyRecord[];
  settings: NetbackSettings;
  updatedAt: string | null;
};

export type NetbackMode = "netback" | "forward";

export type NetbackRankRow = { key: string; label: string; value: number; freightMt: number; margin: number | null };

export type NetbackLog = {
  id: string;
  at: string;
  user: { id: string; name: string; email: string; plan: Plan; admin: boolean };
  mode: NetbackMode;
  destination: { code: string; name: string; country: string; region: string };
  input: {
    cargoMt: number;
    basis: Basis;
    packaging: "bagged" | "bulk";
    currency: string;
    fx: number;
    farmLocal: number;
    farmUsd: number;
    inlandUsd: number;
    dutyEnabled: boolean;
    dutyPercent: number;
    afrmm: boolean;
  };
  output: {
    week: string;
    best: NetbackRankRow & { port: string; status: string | null; nauticalMiles: number; vessel: string };
    ranking: NetbackRankRow[];
  };
};

export const NO_DUTY_NOTE = "No specific duty data for this country — verify with local customs authority before contracting.";

export const DUTY_TONES: { value: DutyTone; label: string; hint: string }[] = [
  { value: "active", label: "Duty applies", hint: "Red banner" },
  { value: "warn", label: "Check first", hint: "Amber banner" },
  { value: "ok", label: "Clear", hint: "Green banner" },
  { value: "dim", label: "Neutral", hint: "Grey banner" },
];

export const DEFAULT_DUTIES: DutyRecord[] = [
  { country: "India", rate: 5, active: false, afrmm: false, note: "India reference duty is 5%. Confirm the contracted rate before relying on it.", tone: "warn" },
  { country: "Brazil", rate: 0, active: false, afrmm: true, note: "The AFRMM merchant marine levy is charged on ocean freight into Brazil. Confirm any import duty with local customs.", tone: "ok" },
];

export const DEFAULT_NETBACK_SETTINGS: NetbackSettings = {
  limitCore: 50,
  limitGrowth: 200,
  limitEnterprise: 1000,
  retentionDays: 365,
  costs: { ...NETBACK_CONSTANTS },
};

export const seedBenchmarks = (): Benchmark[] =>
  BENCHMARK_ORIGINS.map((origin) => ({ ...origin, active: true, source: "built-in", series: "", product: "", low: null, high: null }));

export const DEFAULT_WEEK = { week: "28", date: BENCHMARK_DATE };

export function planLimit(settings: NetbackSettings, plan: Plan) {
  return plan === "enterprise" ? settings.limitEnterprise : plan === "growth" ? settings.limitGrowth : settings.limitCore;
}

/** Origins members are ranked against: switched on and priced. */
export const liveOrigins = (benchmarks: Benchmark[]): NetbackOrigin[] =>
  benchmarks.filter((item) => item.active && item.fob > 0).map(({ key, label, port, region, fob, lat, lon }) => ({ key, label, port, region, fob, lat, lon }));

export const weekLabel = (week: string, date: string) => [week ? `Week ${week}` : "", date.slice(0, 4)].filter(Boolean).join(" ");

export const findDuty = (duties: DutyRecord[], country: string) => duties.find((item) => item.country.toLowerCase() === country.trim().toLowerCase());

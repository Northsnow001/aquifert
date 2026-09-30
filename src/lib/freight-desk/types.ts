import type { FixtureBand } from "@/lib/freight/fixtures";
import {
  CARGO_PREMIUMS,
  DEFAULT_BDI,
  DEFAULT_BUNKERS,
  DEFAULT_IRAN_PREMIUM,
  ORIGIN_PREMIUMS,
  PREMIUM_TAPER,
  SEASONAL_PREMIUM,
  type Market,
  type PremiumTaper,
} from "@/lib/freight/reference";
import type { PortRecord } from "@/lib/ports";
import type { Plan } from "@/lib/session-shared";

export const REGIONS = [
  "North Africa",
  "West Africa",
  "East Africa",
  "Southern Africa",
  "Mediterranean",
  "Black Sea",
  "Baltic",
  "Northern Europe",
  "Atlantic Europe",
  "Middle East",
  "Indian Subcontinent",
  "Southeast Asia",
  "East Asia",
  "Oceania",
  "North America",
  "Central America",
  "Caribbean",
  "South America",
] as const;

export const regionSlug = (region: string) => region.toLowerCase().replace(/[^a-z0-9]+/g, "_");

export type PortEntry = PortRecord & { aliases: string[]; active: boolean };

export type FixtureStatus = "active" | "inactive";
export type FixtureOrigin = "manual" | "csv" | "ai";

export type FixtureInput = {
  loadName: string;
  loadCode: string;
  loadRegion: string;
  dischargeName: string;
  dischargeCode: string;
  dischargeRegion: string;
  cargoMinKt: number;
  cargoMaxKt: number;
  rateLow: number;
  rateHigh: number;
  cargoType: string;
  source: string;
  fixtureDate: string;
  confidence?: number;
  excerpt?: string;
};

export type Fixture = FixtureInput & {
  id: string;
  origin: FixtureOrigin;
  batchId: string | null;
  confidence: number;
  excerpt: string;
  status: FixtureStatus;
  createdAt: string;
  updatedAt: string;
};

export type FixtureBatch = { id: string; origin: Exclude<FixtureOrigin, "manual">; label: string; count: number; createdAt: string };

export type FetchStatus = {
  sourceUrl: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type BunkerHub = { city: string; price: number };

export type BunkerState = FetchStatus & { prices: BunkerHub[]; manualAt: string | null };

export type BdiSource = "default" | "fetched" | "fetched-ai" | "manual";

export type BdiState = FetchStatus & { value: number; tradeDate: string | null; source: BdiSource; manualAt: string | null };

export type FreightSettings = {
  limitCore: number;
  limitGrowth: number;
  limitEnterprise: number;
  showBunkerBar: boolean;
  iranEnabled: boolean;
  iranPremium: number;
  iranLabel: string;
  cargoPremiums: Record<string, number>;
  originPremiums: Record<string, number>;
  seasonalPremium: number;
  taper: PremiumTaper;
  fixtureMaxWeight: number;
  algoMinWeight: number;
};

export type DebugLevel = "info" | "warn" | "error";
export type DebugEntry = { at: string; level: DebugLevel; message: string; context: Record<string, unknown> };

export type Extraction = { fileName: string; mimeType: string; at: string; rows: FixtureInput[]; rawText: string };

export type FreightDesk = {
  ports: PortEntry[];
  portsCustomized: boolean;
  fixtures: Fixture[];
  batches: FixtureBatch[];
  bunker: BunkerState;
  bdi: BdiState;
  settings: FreightSettings;
  lastExtraction: Extraction | null;
  debug: DebugEntry[];
  updatedAt: string | null;
};

export type LogPort = { code: string; name: string; country: string };

export type CalcLog = {
  id: string;
  at: string;
  user: { id: string; name: string; email: string; plan: Plan; admin: boolean };
  load: LogPort;
  discharge: LogPort;
  input: {
    cargoMt: number;
    cargoType: string;
    cargoPremium: number;
    market: Market;
    bunkerPrice: number;
    loadPortCost: number;
    dischargePortCost: number;
    agencyCost: number;
    extraPortDays: number;
  };
  output: {
    quotedRate: number;
    algorithmRate: number;
    baseRate: number;
    totalPremium: number;
    iranPremium: number;
    nauticalMiles: number;
    totalDays: number;
    vessel: string;
    canal: string;
    routeType: string;
    bdi: number;
    grossRevenue: number;
    tcePerDay: number;
    fixtureWeight: number;
    inRange: boolean;
    band: FixtureBand | null;
  };
};

export const BUNKER_SOURCE = "https://shipandbunker.com/prices";
export const BDI_SOURCE = "https://tradingeconomics.com/commodity/baltic";

export const DEFAULT_FREIGHT_SETTINGS: FreightSettings = {
  limitCore: 50,
  limitGrowth: 0,
  limitEnterprise: 0,
  showBunkerBar: true,
  iranEnabled: true,
  iranPremium: DEFAULT_IRAN_PREMIUM,
  iranLabel: "Iran war-risk premium",
  cargoPremiums: { ...CARGO_PREMIUMS },
  originPremiums: { ...ORIGIN_PREMIUMS },
  seasonalPremium: SEASONAL_PREMIUM,
  taper: { ...PREMIUM_TAPER },
  fixtureMaxWeight: 0.9,
  algoMinWeight: 0.15,
};

export const emptyFetchStatus = (sourceUrl: string): FetchStatus => ({ sourceUrl, lastAttemptAt: null, lastSuccessAt: null, lastError: null });

export const DEFAULT_BUNKER: BunkerState = { ...emptyFetchStatus(BUNKER_SOURCE), prices: DEFAULT_BUNKERS.map((hub) => ({ ...hub })), manualAt: null };

export const DEFAULT_BDI_STATE: BdiState = { ...emptyFetchStatus(BDI_SOURCE), value: DEFAULT_BDI, tradeDate: null, source: "default", manualAt: null };

export function planLimit(settings: FreightSettings, plan: Plan) {
  return plan === "enterprise" ? settings.limitEnterprise : plan === "growth" ? settings.limitGrowth : settings.limitCore;
}

/** Days since a `YYYY-MM-DD` date, or null when it does not parse. */
export function ageInDays(date: string | null | undefined, now = Date.now()) {
  if (!date) return null;
  const at = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(at)) return null;
  return Math.max(0, (now - at) / 86_400_000);
}

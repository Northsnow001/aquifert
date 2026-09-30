import { blendRate, type BlendWeights, type FixtureBand } from "@/lib/freight/fixtures";
import {
  CANAL_RATES,
  DEFAULT_BDI,
  DEFAULT_IRAN_PREMIUM,
  DISCHARGE_RATES,
  LOAD_RATES,
  ORIGIN_PREMIUMS,
  SEASONAL_PREMIUM,
  VESSEL_SPECS,
  dailyHire,
  premiumTaper,
  vesselForCargo,
  type Market,
  type PremiumTaper,
  type VesselType,
} from "@/lib/freight/reference";
import { buildRoute, isGulfPort, type BuiltRoute, type Canal, type PortPoint } from "@/lib/freight/route";

/** Admin-tuned pricing. Anything left out falls back to the built-in reference values. */
export type PricingOverrides = {
  originPremiums?: Record<string, number>;
  seasonalPremium?: number;
  taper?: PremiumTaper;
  blend?: BlendWeights;
};

export type FreightQuoteInput = {
  cargoMt: number;
  cargoPremium: number;
  market: Market;
  loadRegion: string;
  distanceNm: number;
  canal: Canal;
  bunkerPrice: number;
  loadPortCost?: number;
  dischargePortCost?: number;
  agencyCost?: number;
  extraPortDays?: number;
  bdi?: number;
  iranWarRisk?: boolean;
  iranPremiumPerMt?: number;
  fixtureBand?: FixtureBand | null;
  pricing?: PricingOverrides;
};

export type FreightQuote = {
  vessel: VesselType;
  vesselLabel: string;
  dailyHire: number;
  seaDays: number;
  loadDays: number;
  dischargeDays: number;
  totalDays: number;
  bunkerTonnes: number;
  bunkerCost: number;
  canalCost: number;
  portCost: number;
  voyageCost: number;
  timeCost: number;
  baseRate: number;
  originPremium: number;
  seasonalPremium: number;
  taper: number;
  rawPremium: number;
  iranPremium: number;
  totalPremium: number;
  algorithmRate: number;
  quotedRate: number;
  grossRevenue: number;
  tcePerDay: number;
  inRange: boolean;
  fixtureWeight: number;
};

export function quoteFreight(input: FreightQuoteInput): FreightQuote {
  const vessel = vesselForCargo(input.cargoMt);
  const specs = VESSEL_SPECS[vessel];
  const hire = dailyHire(vessel, input.market, input.bdi ?? DEFAULT_BDI);
  const seaDays = input.distanceNm / (specs.speed * 24);
  const loadDays = input.cargoMt / LOAD_RATES[vessel];
  const dischargeDays = input.cargoMt / DISCHARGE_RATES[vessel];
  const extraPortDays = input.extraPortDays ?? 2.5;
  const totalDays = seaDays + loadDays + dischargeDays + extraPortDays;
  const bunkerTonnes = totalDays * specs.consumption;
  const bunkerCost = bunkerTonnes * input.bunkerPrice;
  const canalCost = input.cargoMt * (CANAL_RATES[input.canal]?.[vessel] ?? 0);
  const loadPortCost = input.loadPortCost ?? 9000;
  const dischargePortCost = input.dischargePortCost ?? 12000;
  const agencyCost = input.agencyCost ?? 5000;
  const portCost = loadPortCost + dischargePortCost;
  const voyageCost = bunkerCost + canalCost + portCost + agencyCost;
  const timeCost = totalDays * hire;
  const baseRate = (voyageCost + timeCost) / input.cargoMt;
  const pricing = input.pricing ?? {};
  const originPremium = (pricing.originPremiums ?? ORIGIN_PREMIUMS)[input.loadRegion] ?? 0;
  const seasonalPremium = pricing.seasonalPremium ?? SEASONAL_PREMIUM;
  const rawPremium = input.cargoPremium + originPremium + seasonalPremium;
  const taper = premiumTaper(input.distanceNm, input.canal, pricing.taper);
  const iranPremium = input.iranWarRisk ? (input.iranPremiumPerMt ?? DEFAULT_IRAN_PREMIUM) : 0;
  const totalPremium = rawPremium * taper + iranPremium;
  const algorithmRate = baseRate + totalPremium;
  const blend = blendRate(algorithmRate, input.fixtureBand ?? null, pricing.blend);
  const quotedRate = blend.displayRate;
  const grossRevenue = quotedRate * input.cargoMt;

  return {
    vessel,
    vesselLabel: specs.label,
    dailyHire: hire,
    seaDays,
    loadDays,
    dischargeDays,
    totalDays,
    bunkerTonnes,
    bunkerCost,
    canalCost,
    portCost,
    voyageCost,
    timeCost,
    baseRate,
    originPremium,
    seasonalPremium,
    taper,
    rawPremium,
    iranPremium,
    totalPremium,
    algorithmRate,
    quotedRate,
    grossRevenue,
    tcePerDay: (grossRevenue - voyageCost) / totalDays,
    inRange: blend.inRange,
    fixtureWeight: blend.fixtureWeight,
  };
}

export type FreightRequest = {
  load: PortPoint;
  discharge: PortPoint;
  cargoMt: number;
  cargoPremium: number;
  market: Market;
  bunkerPrice: number;
  loadPortCost?: number;
  dischargePortCost?: number;
  agencyCost?: number;
  extraPortDays?: number;
  bdi?: number;
  iranEnabled?: boolean;
  iranPremiumPerMt?: number;
  fixtureBand?: FixtureBand | null;
  pricing?: PricingOverrides;
};

export type FreightResult = FreightQuote & {
  route: BuiltRoute;
  iranApplied: boolean;
};

export function calculateFreight(request: FreightRequest): FreightResult {
  const route = buildRoute(request.load, request.discharge);
  const iranApplied = Boolean(
    request.iranEnabled !== false && (isGulfPort(request.load) || isGulfPort(request.discharge)),
  );
  const quote = quoteFreight({
    cargoMt: request.cargoMt,
    cargoPremium: request.cargoPremium,
    market: request.market,
    loadRegion: request.load.region,
    distanceNm: route.nauticalMiles,
    canal: route.canal,
    bunkerPrice: request.bunkerPrice,
    loadPortCost: request.loadPortCost,
    dischargePortCost: request.dischargePortCost,
    agencyCost: request.agencyCost,
    extraPortDays: request.extraPortDays,
    bdi: request.bdi,
    iranWarRisk: iranApplied,
    iranPremiumPerMt: request.iranPremiumPerMt,
    fixtureBand: request.fixtureBand,
    pricing: request.pricing,
  });
  return { ...quote, route, iranApplied };
}

import { pathDistance } from "@/lib/geo";
import { buildRoute, type PortPoint } from "@/lib/freight/route";

export const NETBACK_CONSTANTS = {
  discharge: 15,
  margin: 10,
  inspection: 1,
  insurance: 1,
  bagged: 12,
  lcRate: 0.08,
  lcDays: 30,
  hireBase: 2044,
  bunkerPrice: 816,
  loadRate: 10000,
  dischargeRate: 11000,
  extraDays: 2.5,
  portAndAgency: 26000,
  cargoPremium: 5,
  seasonalPremium: 2.5,
  afrmmRate: 0.0025,
  haulageLocal: 15,
  haulageRegional: 25,
  haulageRemote: 40,
};

export type NetbackCosts = typeof NETBACK_CONSTANTS;

export type NetbackOrigin = { key: string; label: string; port: string; region: string; fob: number; lat: number; lon: number };

export type Basis = "cfr" | "exw" | "local" | "regional" | "remote";

export type BasisCosts = {
  haulage: number;
  includeDischarge: boolean;
  includeMargin: boolean;
  includePackaging: boolean;
};

const ORIGIN_FREIGHT_PREMIUM: Record<string, number> = {
  "North Africa": 1,
  "West Africa": 2,
  "Black Sea": -2,
  Baltic: 1,
  "Middle East": 1,
  "East Asia": 2,
  "Southeast Asia": 0,
  "Indian Subcontinent": 1,
};

/**
 * Granular urea FOB midpoints for week 28 2026 (priced 9 Jul), the built-in
 * set until the admin loads a nitrogen file or edits prices. Freight is still
 * calculated; these figures are only the commercial FOB input.
 */
export const BENCHMARK_DATE = "2026-07-09";

export const BENCHMARK_ORIGINS: NetbackOrigin[] = [
  { key: "egypt", label: "Egypt (Europe)", port: "Port Said", region: "North Africa", fob: 440, lat: 32.1, lon: 31.8 },
  { key: "algeria", label: "Algeria", port: "Arzew", region: "North Africa", fob: 430, lat: 35.85, lon: -0.32 },
  { key: "nigeria", label: "Nigeria", port: "Onne", region: "West Africa", fob: 395, lat: 4.72, lon: 7.2 },
  { key: "black_sea", label: "Black Sea", port: "Poti", region: "Black Sea", fob: 390, lat: 42.15, lon: 41.67 },
  { key: "baltic", label: "Baltic", port: "Riga", region: "Baltic", fob: 365, lat: 56.95, lon: 24.11 },
  { key: "middle_east", label: "Middle East", port: "Ruwais", region: "Middle East", fob: 355, lat: 24.11, lon: 52.73 },
  { key: "se_asia", label: "SE Asia", port: "Singapore", region: "Southeast Asia", fob: 410, lat: 1.29, lon: 103.85 },
  { key: "iran", label: "Iran", port: "Bandar Abbas", region: "Middle East", fob: 345, lat: 27.19, lon: 56.27 },
  { key: "china", label: "China", port: "Shanghai", region: "East Asia", fob: 395, lat: 31.23, lon: 121.47 },
];

export function basisCosts(basis: Basis, costs: NetbackCosts = NETBACK_CONSTANTS): BasisCosts {
  switch (basis) {
    case "cfr":
      return { haulage: 0, includeDischarge: false, includeMargin: false, includePackaging: true };
    case "local":
      return { haulage: costs.haulageLocal, includeDischarge: true, includeMargin: true, includePackaging: true };
    case "regional":
      return { haulage: costs.haulageRegional, includeDischarge: true, includeMargin: true, includePackaging: true };
    case "remote":
      return { haulage: costs.haulageRemote, includeDischarge: true, includeMargin: true, includePackaging: true };
    default:
      return { haulage: 0, includeDischarge: true, includeMargin: true, includePackaging: true };
  }
}

export function lcFactor(costs: NetbackCosts = NETBACK_CONSTANTS): number {
  return (costs.lcRate / 365) * costs.lcDays;
}

function netbackWaypoints(labels: string[]): string {
  const drop = new Set(["Gulf", "Destination", "Origin", "Sri Lanka", "Ras al Hadd", "Pacific"]);
  const kept = labels.filter((label) => !drop.has(label));
  const source = kept.length >= 2 ? kept : labels;
  return source.join(" → ").replaceAll("Strait of Malacca", "Malacca");
}

export function estimateNetbackFreight(origin: PortPoint, destination: PortPoint, cargoMt: number, costs: NetbackCosts = NETBACK_CONSTANTS) {
  const vessel = cargoMt >= 45000 ? "panamax" : "supramax";
  const specs =
    vessel === "panamax"
      ? { label: "Panamax", consumption: 38, speed: 12, bdiMult: 8 }
      : { label: "Supramax", consumption: 32, speed: 12.5, bdiMult: 7.5 };
  const routed = buildRoute(origin, destination);
  const hire = costs.hireBase * specs.bdiMult;
  const seaDays = routed.nauticalMiles / (specs.speed * 24);
  const loadDays = cargoMt / costs.loadRate;
  const dischargeDays = cargoMt / costs.dischargeRate;
  const totalDays = seaDays + loadDays + dischargeDays + costs.extraDays;
  const bunkerCost = totalDays * specs.consumption * costs.bunkerPrice;
  const canalRate = routed.canal === "suez" ? 4.5 : routed.canal === "panama" ? 5 : 0;
  const canalCost = cargoMt * canalRate;
  const voyageCost = bunkerCost + canalCost + costs.portAndAgency;
  const timeCost = totalDays * hire;
  const premium = costs.cargoPremium + (ORIGIN_FREIGHT_PREMIUM[origin.region] ?? 0) + costs.seasonalPremium;
  const freightMt = (voyageCost + timeCost) / cargoMt + premium;
  return {
    freightMt: Number(freightMt.toFixed(2)),
    nauticalMiles: routed.nauticalMiles,
    canal: routed.canal,
    waypoints: netbackWaypoints(routed.waypoints),
    vessel: specs.label,
    totalDays: Number(totalDays.toFixed(1)),
  };
}

export type ForwardOrigin = {
  key: string;
  label: string;
  port: string;
  fob: number;
  freightMt: number;
  cfr: number;
  finCost: number;
  dutyCost: number;
  afrmmCost: number;
  dischargeCost: number;
  marginCost: number;
  packCost: number;
  haulage: number;
  inlandCost: number;
  totalFarm: number;
  nauticalMiles: number;
  canal: string;
  waypoints: string;
  vessel: string;
};

export function forwardOrigin(input: {
  key: string;
  label: string;
  port: string;
  fob: number;
  freightMt: number;
  nauticalMiles: number;
  canal: string;
  waypoints: string;
  vessel: string;
  basis: Basis;
  packaging: "bagged" | "bulk";
  dutyEnabled: boolean;
  dutyPercent: number;
  afrmm: boolean;
  inlandUsd: number;
  costs?: NetbackCosts;
}): ForwardOrigin {
  const costs = input.costs ?? NETBACK_CONSTANTS;
  const basis = basisCosts(input.basis, costs);
  const cfr = input.fob + input.freightMt;
  const finCost = Number((cfr * lcFactor(costs)).toFixed(2));
  const dutyCost =
    input.dutyEnabled && input.dutyPercent > 0
      ? Number((((cfr + costs.insurance) * input.dutyPercent) / 100).toFixed(2))
      : 0;
  const afrmmCost = input.afrmm ? Number((input.freightMt * costs.afrmmRate).toFixed(2)) : 0;
  const dischargeCost = basis.includeDischarge ? costs.discharge : 0;
  const marginCost = basis.includeMargin ? costs.margin : 0;
  const packCost = basis.includePackaging && input.packaging === "bagged" ? costs.bagged : 0;
  const delivery =
    dischargeCost +
    packCost +
    marginCost +
    costs.inspection +
    costs.insurance +
    finCost +
    basis.haulage +
    dutyCost +
    afrmmCost +
    input.inlandUsd;
  return {
    key: input.key,
    label: input.label,
    port: input.port,
    fob: input.fob,
    freightMt: input.freightMt,
    cfr,
    finCost,
    dutyCost,
    afrmmCost,
    dischargeCost,
    marginCost,
    packCost,
    haulage: basis.haulage,
    inlandCost: input.inlandUsd,
    totalFarm: Number((cfr + delivery).toFixed(2)),
    nauticalMiles: input.nauticalMiles,
    canal: input.canal,
    waypoints: input.waypoints,
    vessel: input.vessel,
  };
}

export type ReverseOrigin = {
  key: string;
  label: string;
  port: string;
  impliedFob: number;
  actualFob: number;
  margin: number;
  impliedCfr: number;
  freightMt: number;
  impliedLc: number;
  impliedDuty: number;
  afrmmCost: number;
  nauticalMiles: number;
  canal: string;
  waypoints: string;
  status: "Viable" | "Marginal" | "Tight" | "Unviable";
};

export function reverseOrigin(input: {
  key: string;
  label: string;
  port: string;
  actualFob: number;
  freightMt: number;
  nauticalMiles: number;
  canal: string;
  waypoints: string;
  farmUsd: number;
  basis: Basis;
  packaging: "bagged" | "bulk";
  dutyEnabled: boolean;
  dutyPercent: number;
  afrmm: boolean;
  inlandUsd: number;
  costs?: NetbackCosts;
}): ReverseOrigin {
  const costs = input.costs ?? NETBACK_CONSTANTS;
  const basis = basisCosts(input.basis, costs);
  const dischargeCost = basis.includeDischarge ? costs.discharge : 0;
  const marginCost = basis.includeMargin ? costs.margin : 0;
  const packCost = basis.includePackaging && input.packaging === "bagged" ? costs.bagged : 0;
  const cash = dischargeCost + packCost + marginCost + costs.inspection + costs.insurance + basis.haulage + input.inlandUsd;
  const afrmmCost = input.afrmm ? Number((input.freightMt * costs.afrmmRate).toFixed(2)) : 0;
  const dutyRate = input.dutyEnabled ? input.dutyPercent / 100 : 0;
  const impliedCfr = (input.farmUsd - cash - afrmmCost) / (1 + lcFactor(costs) + dutyRate);
  const impliedFob = Number((impliedCfr - input.freightMt).toFixed(2));
  const margin = Number((impliedFob - input.actualFob).toFixed(2));
  const status: ReverseOrigin["status"] =
    margin >= 10 ? "Viable" : margin >= 0 ? "Marginal" : margin >= -20 ? "Tight" : "Unviable";
  return {
    key: input.key,
    label: input.label,
    port: input.port,
    impliedFob,
    actualFob: input.actualFob,
    margin,
    impliedCfr: Number(impliedCfr.toFixed(2)),
    freightMt: input.freightMt,
    impliedLc: Number((impliedCfr * lcFactor(costs)).toFixed(2)),
    impliedDuty: Number((impliedCfr * dutyRate).toFixed(2)),
    afrmmCost,
    nauticalMiles: input.nauticalMiles,
    canal: input.canal,
    waypoints: input.waypoints,
    status,
  };
}

export function rankForward(
  destination: PortPoint,
  cargoMt: number,
  options: Omit<Parameters<typeof forwardOrigin>[0], "key" | "label" | "port" | "fob" | "freightMt" | "nauticalMiles" | "canal" | "waypoints" | "vessel">,
  origins: NetbackOrigin[] = BENCHMARK_ORIGINS,
): ForwardOrigin[] {
  return origins
    .map((origin) => {
      const freight = estimateNetbackFreight({ ...origin, name: origin.port }, destination, cargoMt, options.costs);
      return forwardOrigin({
        ...options,
        key: origin.key,
        label: origin.label,
        port: origin.port,
        fob: origin.fob,
        freightMt: freight.freightMt,
        nauticalMiles: freight.nauticalMiles,
        canal: freight.canal,
        waypoints: freight.waypoints,
        vessel: freight.vessel,
      });
    })
    .sort((left, right) => left.totalFarm - right.totalFarm);
}

export function rankReverse(
  destination: PortPoint,
  cargoMt: number,
  farmUsd: number,
  options: Omit<
    Parameters<typeof reverseOrigin>[0],
    "key" | "label" | "port" | "actualFob" | "freightMt" | "nauticalMiles" | "canal" | "waypoints" | "farmUsd"
  >,
  origins: NetbackOrigin[] = BENCHMARK_ORIGINS,
): ReverseOrigin[] {
  return origins
    .map((origin) => {
      const freight = estimateNetbackFreight({ ...origin, name: origin.port }, destination, cargoMt, options.costs);
      return reverseOrigin({
        ...options,
        key: origin.key,
        label: origin.label,
        port: origin.port,
        actualFob: origin.fob,
        freightMt: freight.freightMt,
        nauticalMiles: freight.nauticalMiles,
        canal: freight.canal,
        waypoints: freight.waypoints,
        farmUsd,
      });
    })
    .sort((left, right) => right.margin - left.margin);
}

export function straightLineNm(a: PortPoint, b: PortPoint): number {
  return Math.round(pathDistance([a, b]));
}

import { haversineNm, vesselBand, type LaneEstimate, type LaneEstimateInput } from "@/lib/aq-analytics/contracts";

const HIRE_BY_BAND: Record<string, number> = {
  Handysize: 13500,
  "Handymax / Supramax": 14500,
  Ultramax: 15500,
  Panamax: 17000,
};
const VESSEL_NAME_BY_BAND: Record<string, string> = {
  Handysize: "Handysize",
  "Handymax / Supramax": "Supramax",
  Ultramax: "Ultramax",
  Panamax: "Panamax",
};

export type PortCoords = { port: string; lat: number; lon: number };

export const LANE_METHOD =
  "Great-circle distance × 1.18 routing factor · 12.5 kn · 28 t/day at sea, 5 t/day in port · VLSFO USD 590/t · indicative market hire";

export function estimateLaneFromCoords(from: PortCoords, to: PortCoords, input: LaneEstimateInput): LaneEstimate {
  const distanceNm = Math.round(haversineNm(from.lat, from.lon, to.lat, to.lon) * 1.18);
  const seaDays = distanceNm / (12.5 * 24);
  const loadDays = input.quantityMt / 12000 + 0.4 + input.extraPortDays / 2;
  const dischDays = input.quantityMt / 9000 + 0.4 + input.extraPortDays / 2;
  const voyageDays = seaDays + loadDays + dischDays;
  const band = vesselBand(input.quantityMt);
  const vesselType = VESSEL_NAME_BY_BAND[band] ?? "Supramax";
  const marketMult = input.market === "tight" ? 1.15 : input.market === "soft" ? 0.87 : 1;
  const dailyHire = Math.round((HIRE_BY_BAND[band] ?? 14500) * marketMult);
  const bunkerT = Math.round(seaDays * 28 + (loadDays + dischDays) * 5);
  const bunkerPriceT = 590;
  const bunkerCost = bunkerT * bunkerPriceT;
  const portCosts = input.loadPortCostUsd + input.dischPortCostUsd;
  const canalCosts = 0;
  const agencyFees = input.agencyUsd;
  const totalVoyageCost = bunkerCost + portCosts + canalCosts + agencyFees;
  const totalTimeCost = Math.round(voyageDays * dailyHire);
  const margin = input.market === "tight" ? 1.12 : input.market === "soft" ? 1.0 : 1.05;
  const grossRevenue = Math.round((totalVoyageCost + totalTimeCost) * margin);
  const freightPerMt = grossRevenue / input.quantityMt;
  const tcePerDay = Math.round((grossRevenue - totalVoyageCost) / voyageDays);
  return {
    loadPort: input.loadPort,
    dischPort: input.dischPort,
    distanceNm,
    vesselType,
    voyageDays: Math.round(voyageDays * 10) / 10,
    seaDays: Math.round(seaDays * 10) / 10,
    loadDays: Math.round(loadDays * 10) / 10,
    dischDays: Math.round(dischDays * 10) / 10,
    freightPerMt: Math.round(freightPerMt * 100) / 100,
    grossRevenue,
    tcePerDay,
    bunkerT,
    bunkerPriceT,
    bunkerCost,
    portCosts,
    canalCosts,
    agencyFees,
    totalVoyageCost,
    dailyHire,
    totalTimeCost,
    fobNetback: input.cfrPriceUsd == null ? null : Math.round((input.cfrPriceUsd - freightPerMt) * 100) / 100,
    bdiReference: 1642,
    method: LANE_METHOD,
  };
}

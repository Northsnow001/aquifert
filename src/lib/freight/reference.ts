export const VESSEL_SPECS = {
  handymax: { label: "Handymax", consumption: 28, speed: 13, bdiMult: 5.6 },
  supramax: { label: "Supramax", consumption: 32, speed: 12.5, bdiMult: 7.5 },
  panamax: { label: "Panamax", consumption: 38, speed: 12, bdiMult: 8 },
  capesize: { label: "Capesize", consumption: 55, speed: 11.5, bdiMult: 12.5 },
} as const;

export type VesselType = keyof typeof VESSEL_SPECS;

export const LOAD_RATES: Record<VesselType, number> = {
  handymax: 8000,
  supramax: 10000,
  panamax: 12000,
  capesize: 15000,
};

export const DISCHARGE_RATES: Record<VesselType, number> = {
  handymax: 9000,
  supramax: 11000,
  panamax: 13000,
  capesize: 16000,
};

export const CANAL_RATES: Record<string, Record<VesselType, number>> = {
  suez: { handymax: 3.5, supramax: 4.5, panamax: 5.5, capesize: 6 },
  panama: { handymax: 4, supramax: 5, panamax: 6, capesize: 7 },
  cape: { handymax: 0, supramax: 0, panamax: 0, capesize: 0 },
  none: { handymax: 0, supramax: 0, panamax: 0, capesize: 0 },
};

export const MARKET_FACTORS = {
  tight: 1.1,
  normal: 1,
  oversupplied: 0.9,
} as const;

export type Market = keyof typeof MARKET_FACTORS;

export const CARGO_PREMIUMS: Record<string, number> = {
  "Fertilizer / DAP / Urea": 5,
  "Phosphate Rock": 4,
  "Grain / Wheat": 3,
  Coal: 2,
  "Iron Ore": 1,
  "Other Bulk": 0,
};

export const ORIGIN_PREMIUMS: Record<string, number> = {
  Arctic: 10,
  Baltic: 6,
  "Northern Europe": 6,
  "North America": 6,
  "Black Sea": 3,
  Oceania: 5,
  "South America": 4,
  "East Africa": 3,
  "Middle East": 2,
  "Southern Africa": 4,
  "Indian Subcontinent": 2,
  "East Asia": 2,
  "West Africa": 2,
  "North Africa": 1,
  Mediterranean: 1,
  "Atlantic Europe": 1,
  "Southeast Asia": 0,
  Caribbean: 2,
  "Central America": 2,
};

export const PREMIUM_TAPER = {
  baseDistanceNm: 5000,
  capeFloor: 0.25,
  capeSpanNm: 9000,
  nonCapeFloor: 0.6,
  nonCapeSpanNm: 20000,
};

export const DEFAULT_BDI = 2044;
export const DEFAULT_IRAN_PREMIUM = 16;
export const SEASONAL_PREMIUM = 2.5;

export const DEFAULT_BUNKERS = [
  { city: "Singapore", price: 726 },
  { city: "Fujairah", price: 724 },
  { city: "Rotterdam", price: 691 },
  { city: "Houston", price: 707 },
  { city: "Hong Kong", price: 775 },
  { city: "New York", price: 692 },
];

export function vesselForCargo(cargoMt: number): VesselType {
  if (cargoMt < 45000) return "handymax";
  if (cargoMt < 65000) return "supramax";
  if (cargoMt < 90000) return "panamax";
  return "capesize";
}

export function dailyHire(vessel: VesselType, market: Market, bdi = DEFAULT_BDI): number {
  return Math.round(bdi * VESSEL_SPECS[vessel].bdiMult * MARKET_FACTORS[market]);
}

export function premiumTaper(distanceNm: number, canal: string): number {
  if (distanceNm <= PREMIUM_TAPER.baseDistanceNm) return 1;
  if (canal === "cape") {
    return Math.max(
      PREMIUM_TAPER.capeFloor,
      1 - (distanceNm - PREMIUM_TAPER.baseDistanceNm) / PREMIUM_TAPER.capeSpanNm,
    );
  }
  return Math.max(
    PREMIUM_TAPER.nonCapeFloor,
    1 - (distanceNm - PREMIUM_TAPER.baseDistanceNm) / PREMIUM_TAPER.nonCapeSpanNm,
  );
}

export type FixtureBand = {
  matchType: string;
  windowDays: number;
  sampleSize: number;
  cargoMatchMode: "in_band" | "near_band" | "out_of_band";
  rateMin: number;
  rateMax: number;
  rateMedian: number;
  label?: string;
  fixtureIds?: string[];
};

export type BlendResult = {
  displayRate: number;
  fixtureWeight: number;
  algoWeight: number;
  fixtureRate: number | null;
  algoRate: number;
  inRange: boolean;
  hasFixtures: boolean;
};

export type BlendWeights = { fixtureMax: number; algoMin: number };

export const DEFAULT_BLEND: BlendWeights = { fixtureMax: 0.9, algoMin: 0.15 };

export function blendRate(algorithmRate: number, band: FixtureBand | null, weights: BlendWeights = DEFAULT_BLEND): BlendResult {
  if (!band || band.sampleSize < 1) {
    return {
      displayRate: algorithmRate,
      fixtureWeight: 0,
      algoWeight: 1,
      fixtureRate: null,
      algoRate: algorithmRate,
      inRange: false,
      hasFixtures: false,
    };
  }

  const tierFactor =
    band.matchType === "exact_port_pair"
      ? 0.9
      : band.matchType === "country_pair"
        ? 0.7
        : band.matchType === "area_pair"
          ? 0.5
          : 0.3;
  const recencyFactor = Math.max(0.15, 1 - band.windowDays / (365 * 3));
  const cargoFactor =
    band.cargoMatchMode === "in_band" ? 1 : band.cargoMatchMode === "near_band" ? 0.85 : 0.6;
  const countFactor = band.sampleSize >= 5 ? 1 : band.sampleSize >= 3 ? 0.8 : band.sampleSize >= 1 ? 0.6 : 0;
  const rawWeight = tierFactor * recencyFactor * cargoFactor * countFactor;
  const fixtureWeight = Math.min(weights.fixtureMax, rawWeight);
  const algoWeight = Math.max(weights.algoMin, 1 - fixtureWeight);
  const inRange = algorithmRate >= band.rateMin && algorithmRate <= band.rateMax;
  const fixtureRate = Number.isFinite(band.rateMedian)
    ? band.rateMedian
    : (band.rateMin + band.rateMax) / 2;
  const displayRate = inRange
    ? algorithmRate
    : (fixtureRate * fixtureWeight + algorithmRate * algoWeight) / (fixtureWeight + algoWeight);

  return {
    displayRate,
    fixtureWeight: Math.round(fixtureWeight * 100) / 100,
    algoWeight: Math.round(algoWeight * 100) / 100,
    fixtureRate,
    algoRate: algorithmRate,
    inRange,
    hasFixtures: true,
  };
}

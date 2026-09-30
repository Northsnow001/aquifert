import { parseNumber, rateBand, type NitrogenAnswers } from "@/lib/nitrogen/engine";

/** Mirrors the shipment split in the report so the preview and the document agree. */
export function shipmentPlan(a: NitrogenAnswers) {
  const annual = parseNumber(a.annualVolume);
  if (!(annual > 0)) return null;
  const given = parseNumber(a.warehouseCapacity);
  const capacity = given || 50;
  const count = Math.max(1, Math.min(6, Math.round(annual / Math.max(25, capacity)) || 1));
  return { count, per: Math.round(annual / count), assumed: !given, annual };
}

/** Total seasonal N in tonnes, rounded to one decimal like the report. */
export function seasonalN(a: NitrogenAnswers): [number, number] | null {
  const band = rateBand(a.cropType, a.soilTexture);
  const area = parseNumber(a.areaHectares);
  if (!band || !(area > 0)) return null;
  return [Math.round((area * band[0]) / 100) / 10, Math.round((area * band[1]) / 100) / 10];
}

export const tonnes = (value: number) => value.toLocaleString("en-GB", { maximumFractionDigits: 1 });

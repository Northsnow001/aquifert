import "server-only";

import { calculateFreight, type FreightResult } from "@/lib/freight/calculate";
import type { FixtureBand } from "@/lib/freight/fixtures";
import { MARKET_FACTORS, type Market } from "@/lib/freight/reference";
import { findBenchmarkBand, fixtureResolver, indexPorts } from "@/lib/freight-desk/benchmark";
import { activePorts } from "@/lib/freight-desk/store";
import type { FreightDesk } from "@/lib/freight-desk/types";
import type { PortRecord } from "@/lib/ports";

export type QuoteRequest = {
  loadCode: string;
  dischargeCode: string;
  cargoMt: number;
  cargoType: string;
  market: Market;
  bunkerPrice: number;
  loadPortCost: number;
  dischargePortCost: number;
  agencyCost: number;
  extraPortDays: number;
};

export type Quote = {
  load: PortRecord;
  discharge: PortRecord;
  request: QuoteRequest;
  cargoPremium: number;
  result: FreightResult;
  band: FixtureBand | null;
  bdi: number;
};

const bounded = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function cleanQuoteRequest(raw: Partial<QuoteRequest>): QuoteRequest {
  return {
    loadCode: String(raw.loadCode ?? "").trim().toUpperCase().slice(0, 8),
    dischargeCode: String(raw.dischargeCode ?? "").trim().toUpperCase().slice(0, 8),
    cargoMt: Math.round(bounded(raw.cargoMt, 1000, 400_000, 35_000)),
    cargoType: String(raw.cargoType ?? "").slice(0, 80),
    market: (Object.keys(MARKET_FACTORS) as Market[]).find((key) => key === raw.market) ?? "normal",
    bunkerPrice: bounded(raw.bunkerPrice, 50, 3000, 700),
    loadPortCost: bounded(raw.loadPortCost, 0, 2_000_000, 9000),
    dischargePortCost: bounded(raw.dischargePortCost, 0, 2_000_000, 12_000),
    agencyCost: bounded(raw.agencyCost, 0, 1_000_000, 5000),
    extraPortDays: bounded(raw.extraPortDays, 0, 60, 2.5),
  };
}

export function quoteFromDesk(desk: FreightDesk, raw: Partial<QuoteRequest>): { ok: true; quote: Quote } | { ok: false; message: string } {
  const request = cleanQuoteRequest(raw);
  const ports = activePorts(desk);
  const load = ports.find((port) => port.code === request.loadCode);
  const discharge = ports.find((port) => port.code === request.dischargeCode);
  if (!load || !discharge) return { ok: false, message: "Choose a load port and a discharge port from the list." };
  if (load.code === discharge.code) return { ok: false, message: "Load and discharge ports must be different." };

  const { settings } = desk;
  const cargoPremium = settings.cargoPremiums[request.cargoType] ?? 0;
  const band = findBenchmarkBand({ load, discharge, cargoMt: request.cargoMt, fixtures: desk.fixtures, resolve: fixtureResolver(indexPorts(ports)) });
  const result = calculateFreight({
    load,
    discharge,
    cargoMt: request.cargoMt,
    cargoPremium,
    market: request.market,
    bunkerPrice: request.bunkerPrice,
    loadPortCost: request.loadPortCost,
    dischargePortCost: request.dischargePortCost,
    agencyCost: request.agencyCost,
    extraPortDays: request.extraPortDays,
    bdi: desk.bdi.value,
    iranEnabled: settings.iranEnabled,
    iranPremiumPerMt: settings.iranPremium,
    fixtureBand: band,
    pricing: {
      originPremiums: settings.originPremiums,
      seasonalPremium: settings.seasonalPremium,
      taper: settings.taper,
      blend: { fixtureMax: settings.fixtureMaxWeight, algoMin: settings.algoMinWeight },
    },
  });
  return { ok: true, quote: { load, discharge, request, cargoPremium, result, band, bdi: desk.bdi.value } };
}

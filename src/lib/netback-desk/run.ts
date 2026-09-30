import { rankForward, rankReverse, type Basis, type ForwardOrigin, type NetbackCosts, type NetbackOrigin, type ReverseOrigin } from "@/lib/netback/calculate";
import { findDuty, type DutyRecord, type NetbackMode } from "@/lib/netback-desk/types";
import type { PortRecord } from "@/lib/ports";

export type NetbackConfig = { origins: NetbackOrigin[]; costs: NetbackCosts; duties: DutyRecord[]; week: string };

export type NetbackRequest = {
  mode: NetbackMode;
  port: string;
  cargoMt: number;
  basis: Basis;
  packaging: "bagged" | "bulk";
  currency: string;
  fx: number;
  farm: number;
  inland: number;
  dutyEnabled: boolean;
  dutyPercent: number;
};

const BASES: Basis[] = ["cfr", "exw", "local", "regional", "remote"];

const finite = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function cleanRequest(raw: Partial<NetbackRequest>): NetbackRequest {
  return {
    mode: raw.mode === "forward" ? "forward" : "netback",
    port: String(raw.port ?? "").trim().toUpperCase().slice(0, 8),
    cargoMt: finite(raw.cargoMt, 5000, 100_000, 35_000),
    basis: BASES.includes(raw.basis as Basis) ? (raw.basis as Basis) : "exw",
    packaging: raw.packaging === "bulk" ? "bulk" : "bagged",
    currency: /^[A-Z]{3}$/.test(String(raw.currency ?? "")) ? String(raw.currency) : "USD",
    fx: finite(raw.fx, 0.0001, 1_000_000, 1),
    farm: finite(raw.farm, 0, 100_000_000, 0),
    inland: finite(raw.inland, 0, 100_000_000, 0),
    dutyEnabled: Boolean(raw.dutyEnabled),
    dutyPercent: finite(raw.dutyPercent, 0, 50, 0),
  };
}

export const toUsd = (amount: number, currency: string, fx: number) => (currency === "USD" || fx === 1 ? amount : amount / (fx || 1));

export function computeNetback(config: NetbackConfig, request: NetbackRequest, destination: PortRecord) {
  const afrmm = findDuty(config.duties, destination.country)?.afrmm ?? false;
  const farmUsd = toUsd(request.farm, request.currency, request.fx);
  const inlandUsd = toUsd(request.inland, request.currency, request.fx);
  const options = {
    basis: request.basis,
    packaging: request.packaging,
    dutyEnabled: request.dutyEnabled,
    dutyPercent: request.dutyPercent,
    afrmm,
    inlandUsd,
    costs: config.costs,
  };
  const forward: ForwardOrigin[] = request.mode === "forward" ? rankForward(destination, request.cargoMt, options, config.origins) : [];
  const reverse: ReverseOrigin[] = request.mode === "netback" ? rankReverse(destination, request.cargoMt, farmUsd, options, config.origins) : [];
  return { forward, reverse, farmUsd, inlandUsd, afrmm };
}

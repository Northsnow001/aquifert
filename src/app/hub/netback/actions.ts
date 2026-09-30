"use server";

import { logCalculation } from "@/app/hub/log-actions";
import { isAdminUser } from "@/lib/admin-access";
import { activePorts, getFreightDesk, nextReset } from "@/lib/freight-desk/store";
import { cleanRequest, computeNetback, type NetbackRequest } from "@/lib/netback-desk/run";
import { getNetbackDesk, netbackUsage, recordNetbackLog } from "@/lib/netback-desk/store";
import { liveOrigins, planLimit, weekLabel } from "@/lib/netback-desk/types";
import { findPort } from "@/lib/ports";
import { getSession } from "@/lib/session";

export type NetbackUsage = { used: number; limit: number; resetsOn: string };

export type NetbackRunResponse = { ok: true; usage: NetbackUsage } | { ok: false; message: string; usage?: NetbackUsage };

export async function runNetback(raw: Partial<NetbackRequest>): Promise<NetbackRunResponse> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again to calculate." };
  const admin = isAdminUser(user);
  const desk = await getNetbackDesk();
  const limit = admin ? 0 : planLimit(desk.settings, user.plan);
  const used = await netbackUsage(user.id);
  const usage = { used, limit, resetsOn: nextReset() };
  if (limit > 0 && used >= limit) {
    return { ok: false, message: `You have used all ${limit} netback calculations for this month. Your allowance resets on ${usage.resetsOn}.`, usage };
  }

  const request = cleanRequest(raw);
  const destination = findPort(request.port, activePorts(await getFreightDesk()));
  if (!destination) return { ok: false, message: "Choose a destination port from the list.", usage };
  const origins = liveOrigins(desk.benchmarks);
  if (!origins.length) return { ok: false, message: "Benchmark prices are being updated. Try again shortly.", usage };

  const week = weekLabel(desk.week, desk.date);
  const { forward, reverse, farmUsd, inlandUsd, afrmm } = computeNetback({ origins, costs: desk.settings.costs, duties: desk.duties, week }, request, destination);
  const ranking =
    request.mode === "forward"
      ? forward.map((row) => ({ key: row.key, label: row.label, value: row.totalFarm, freightMt: row.freightMt, margin: null }))
      : reverse.map((row) => ({ key: row.key, label: row.label, value: row.impliedFob, freightMt: row.freightMt, margin: row.margin }));
  const top = request.mode === "forward" ? forward[0] : reverse[0];
  if (!top || !ranking[0]) return { ok: false, message: "No origins could be priced for this destination.", usage };

  await recordNetbackLog(
    {
      id: `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, admin },
      mode: request.mode,
      destination: { code: destination.code, name: destination.name, country: destination.country, region: destination.region },
      input: {
        cargoMt: request.cargoMt,
        basis: request.basis,
        packaging: request.packaging,
        currency: request.currency,
        fx: request.fx,
        farmLocal: request.farm,
        farmUsd: Number(farmUsd.toFixed(2)),
        inlandUsd: Number(inlandUsd.toFixed(2)),
        dutyEnabled: request.dutyEnabled,
        dutyPercent: request.dutyPercent,
        afrmm,
      },
      output: {
        week,
        best: {
          ...ranking[0],
          port: top.port,
          status: "status" in top ? top.status : null,
          nauticalMiles: top.nauticalMiles,
          vessel: "vessel" in top ? top.vessel : "",
        },
        ranking,
      },
    },
    desk.settings.retentionDays,
  );
  await logCalculation("netback", { mode: request.mode, port: destination.code, cargo: request.cargoMt, basis: request.basis, packaging: request.packaging }, { key: ranking[0].key });

  return { ok: true, usage: { ...usage, used: used + 1 } };
}

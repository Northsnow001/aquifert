"use server";

import { logCalculation } from "@/app/hub/log-actions";
import { isAdminUser } from "@/lib/admin-access";
import type { FreightResult } from "@/lib/freight/calculate";
import type { FixtureBand } from "@/lib/freight/fixtures";
import { quoteFromDesk, type QuoteRequest } from "@/lib/freight-desk/quote";
import { getFreightDesk, monthlyUsage, nextReset, recordCalcLog } from "@/lib/freight-desk/store";
import { planLimit } from "@/lib/freight-desk/types";
import { getSession } from "@/lib/session";

export type Usage = { used: number; limit: number; resetsOn: string };

export type QuoteResponse =
  | { ok: true; result: FreightResult; band: FixtureBand | null; bdi: number; cargoPremium: number; usage: Usage }
  | { ok: false; message: string; usage?: Usage };

export async function runFreightQuote(input: Partial<QuoteRequest>): Promise<QuoteResponse> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again to calculate." };
  const admin = isAdminUser(user);
  const desk = await getFreightDesk();
  const limit = admin ? 0 : planLimit(desk.settings, user.plan);
  const used = await monthlyUsage(user.id);
  const usage = { used, limit, resetsOn: nextReset() };
  if (limit > 0 && used >= limit) {
    return { ok: false, message: `You have used all ${limit} freight calculations for this month. Your allowance resets on ${usage.resetsOn}.`, usage };
  }

  const outcome = quoteFromDesk(desk, input);
  if (!outcome.ok) return { ok: false, message: outcome.message, usage };
  const { quote } = outcome;
  const { result } = quote;

  await recordCalcLog({
    id: `calc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, admin },
    load: { code: quote.load.code, name: quote.load.name, country: quote.load.country },
    discharge: { code: quote.discharge.code, name: quote.discharge.name, country: quote.discharge.country },
    input: { ...quote.request, cargoPremium: quote.cargoPremium },
    output: {
      quotedRate: result.quotedRate,
      algorithmRate: result.algorithmRate,
      baseRate: result.baseRate,
      totalPremium: result.totalPremium,
      iranPremium: result.iranPremium,
      nauticalMiles: result.route.nauticalMiles,
      totalDays: result.totalDays,
      vessel: result.vesselLabel,
      canal: result.route.canal,
      routeType: result.route.routeType,
      bdi: quote.bdi,
      grossRevenue: result.grossRevenue,
      tcePerDay: result.tcePerDay,
      fixtureWeight: result.fixtureWeight,
      inRange: result.inRange,
      band: quote.band,
    },
  });
  await logCalculation(
    "freight",
    { load: quote.load.code, discharge: quote.discharge.code, cargoMt: quote.request.cargoMt, market: quote.request.market },
    { quotedRate: result.quotedRate, nauticalMiles: result.route.nauticalMiles },
  );

  return { ok: true, result, band: quote.band, bdi: quote.bdi, cargoPremium: quote.cargoPremium, usage: { ...usage, used: used + 1 } };
}

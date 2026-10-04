"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, Calculator, RefreshCw, Share2, Ship } from "lucide-react";
import { runFreightQuote, type QuoteResponse, type Usage } from "@/app/hub/freight-calculator/actions";
import { PortField } from "@/components/calculators/port-field";
import { TIER_LABEL } from "@/lib/freight-desk/benchmark";
import { DISCHARGE_RATES, LOAD_RATES, type Market } from "@/lib/freight/reference";
import { findPort, type PortRecord } from "@/lib/ports";

type Success = Extract<QuoteResponse, { ok: true }>;

const usd0 = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (value: number, digits = 0) => value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

function seasonalName(date = new Date()) {
  const month = date.getMonth();
  if (month <= 1 || month === 11) return "Winter";
  if (month <= 4) return "Spring";
  if (month <= 7) return "Summer";
  return "Fall";
}

function canalLabel(canal: string) {
  if (canal === "cape") return "Cape of Good Hope";
  if (canal === "suez") return "Suez Canal";
  if (canal === "panama") return "Panama Canal";
  return "Direct";
}

function routeBadge(canal: string) {
  if (canal === "cape") return "Cape Route";
  if (canal === "suez") return "Suez Route";
  if (canal === "panama") return "Panama Route";
  return "Direct Route";
}

function usageLine(usage: Usage) {
  const resets = new Date(`${usage.resetsOn}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
  const remaining = usage.limit > 0 ? `${Math.max(0, usage.limit - usage.used).toLocaleString()} remaining` : "unlimited";
  return `${usage.used.toLocaleString()}${usage.limit > 0 ? ` of ${usage.limit.toLocaleString()}` : ""} calculated · ${remaining} · resets ${resets}`;
}

function Row({ label, value, strong = false, accent = false }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 text-[13px] ${strong ? "mt-1 border-t border-border pt-2 font-semibold" : ""} ${accent ? "text-[#c2410c]" : ""}`}>
      <span className="text-mid">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  );
}

export function FreightCalculator({
  ports,
  bunkers,
  defaultBunker,
  bdi,
  cargoPremiums,
  iranLabel,
  usage: initialUsage,
}: {
  ports: PortRecord[];
  bunkers: { city: string; price: number }[];
  defaultBunker: number;
  bdi: number;
  cargoPremiums: Record<string, number>;
  iranLabel: string;
  usage: Usage;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const cargoTypes = Object.keys(cargoPremiums);
  const legacyType = cargoTypes.find((label) => String(cargoPremiums[label]) === params.get("cargoPremium"));
  const [load, setLoad] = useState<PortRecord | null>(findPort(params.get("load") ?? "", ports) ?? null);
  const [discharge, setDischarge] = useState<PortRecord | null>(findPort(params.get("discharge") ?? "", ports) ?? null);
  const [cargoType, setCargoType] = useState(() => {
    const requested = params.get("cargoType");
    return (requested && cargoTypes.includes(requested) ? requested : legacyType) ?? cargoTypes.find((label) => /fertili[sz]er/i.test(label)) ?? cargoTypes[0] ?? "";
  });
  const [cargoMt, setCargoMt] = useState(Number(params.get("cargo") ?? 35000));
  const [market, setMarket] = useState<Market>((params.get("market") as Market) || "normal");
  const [bunkerPrice, setBunkerPrice] = useState(Number(params.get("bunker") ?? defaultBunker));
  const [loadPortCost, setLoadPortCost] = useState(Number(params.get("lpc") ?? 9000));
  const [dischargePortCost, setDischargePortCost] = useState(Number(params.get("dpc") ?? 12000));
  const [agencyCost, setAgencyCost] = useState(Number(params.get("agency") ?? 5000));
  const [extraPortDays, setExtraPortDays] = useState(Number(params.get("days") ?? 2.5));
  const [quote, setQuote] = useState<(Success & { key: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState(initialUsage);
  const [pending, startTransition] = useTransition();

  const request = {
    loadCode: load?.code ?? "",
    dischargeCode: discharge?.code ?? "",
    cargoMt,
    cargoType,
    market,
    bunkerPrice,
    loadPortCost,
    dischargePortCost,
    agencyCost,
    extraPortDays,
  };
  const requestKey = JSON.stringify(request);
  const result = quote?.result ?? null;
  const band = quote?.band ?? null;
  const stale = Boolean(quote && quote.key !== requestKey);
  const limitReached = usage.limit > 0 && usage.used >= usage.limit;

  function calculate() {
    if (!load || !discharge) {
      setError("Choose a load port and a discharge port from the list.");
      return;
    }
    const key = requestKey;
    startTransition(async () => {
      const response = await runFreightQuote(request);
      if (response.usage) setUsage(response.usage);
      if (response.ok) {
        setQuote({ ...response, key });
        setError(null);
      } else {
        setError(response.message);
      }
    });
  }

  function share() {
    const query = new URLSearchParams({
      load: load?.code ?? "",
      discharge: discharge?.code ?? "",
      cargo: String(cargoMt),
      cargoType,
      market,
      bunker: String(bunkerPrice),
      lpc: String(loadPortCost),
      dpc: String(dischargePortCost),
      agency: String(agencyCost),
      days: String(extraPortDays),
    });
    router.replace(`/hub/freight-calculator?${query.toString()}`);
    void navigator.clipboard?.writeText(`${window.location.origin}/hub/freight-calculator?${query.toString()}`);
    setCopied(true);
  }

  const season = seasonalName();
  const shared = Boolean(params.get("load") && params.get("discharge"));

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Freight Calculator — Dry Bulk Voyage Estimate</h1>
        <p className="text-sm text-mid">Freight Rate · Route & Voyage Days · Cost Breakdown · Benchmark Check</p>
      </div>

      <div className={`rounded-xl border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] ${limitReached ? "border-[#f3c9c5] bg-[#fdf2f1] text-[#b42318]" : "border-border bg-surface text-mid"}`}>
        {usageLine(usage)}
      </div>

      {bunkers.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-1.5 pl-4" aria-label="VLSFO bunker prices">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">VLSFO bunker</span>
          {bunkers.map((hub) => (
            <button
              key={hub.city}
              type="button"
              onClick={() => setBunkerPrice(hub.price)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${bunkerPrice === hub.price ? "border-[#b7e0c8] bg-[#e8f7ee] text-[#178a4c]" : "border-border text-mid"}`}
            >
              {hub.city} <span className="font-mono">${num(hub.price)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <form
          className="rounded-xl border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            calculate();
          }}
        >
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">— Voyage parameters</p>
          <PortField countryLabel="Load country" label="Load port" value={load} onSelect={setLoad} ports={ports} />
          <div className="flex justify-center py-2 text-dim">
            <ArrowDown className="h-4 w-4" />
          </div>
          <PortField countryLabel="Discharge country" label="Discharge port" value={discharge} onSelect={setDischarge} ports={ports} />
          <div className="my-4 h-px bg-border" />
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">— Cargo parameters</p>
          <label className="mb-3 block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Cargo type</span>
            <select value={cargoType} onChange={(event) => setCargoType(event.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
              {cargoTypes.map((label) => (
                <option key={label} value={label}>
                  {label} (+${cargoPremiums[label]}/MT)
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Cargo (MT)</span>
              <input type="number" value={cargoMt} min={1000} onChange={(event) => setCargoMt(Number(event.target.value))} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
            </label>
            <label>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Market</span>
              <select value={market} onChange={(event) => setMarket(event.target.value as Market)} className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                <option value="normal">Normal</option>
                <option value="tight">Tight (+10%)</option>
                <option value="oversupplied">Oversupplied (-10%)</option>
              </select>
            </label>
          </div>
          <div className="my-4 h-px bg-border" />
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">— Port costs (editable)</p>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Load port ($)</span>
              <input type="number" value={loadPortCost} onChange={(event) => setLoadPortCost(Number(event.target.value))} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
            </label>
            <label>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Discharge port ($)</span>
              <input type="number" value={dischargePortCost} onChange={(event) => setDischargePortCost(Number(event.target.value))} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
            </label>
            <label>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Agency ($)</span>
              <input type="number" value={agencyCost} onChange={(event) => setAgencyCost(Number(event.target.value))} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
            </label>
            <label>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Extra port days</span>
              <input type="number" step="0.5" value={extraPortDays} onChange={(event) => setExtraPortDays(Number(event.target.value))} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm" />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={pending || limitReached}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Calculator className="h-4 w-4" />
              {pending ? "Calculating…" : stale ? "Recalculate" : "Calculate"}
            </button>
            {result ? (
              <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-mid">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-2 rounded-lg bg-[#fdecec] px-3 py-2 text-xs text-[#b42318]">{error}</p> : null}
          {copied ? <p className="mt-2 rounded-lg bg-[#e8f7ee] px-3 py-2 text-xs text-[#178a4c]">Share link copied to clipboard.</p> : null}
        </form>

        {!result ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/70 px-8 text-center">
            <Ship className="mb-3 h-8 w-8 text-dim" />
            <p className="max-w-sm text-sm leading-relaxed text-mid">
              {shared && load && discharge
                ? `${load.name} to ${discharge.name} is loaded from a shared link. Press Calculate to see the voyage breakdown.`
                : "Select load and discharge ports, set cargo parameters, and calculate to see the full voyage breakdown."}
            </p>
          </div>
        ) : (
          <div className={`space-y-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
            {stale ? (
              <button
                type="button"
                onClick={calculate}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#f5dfb3] bg-[#fff6e5] px-4 py-2.5 text-left text-[13px] font-medium text-[#9a5b00]"
              >
                The inputs changed since this estimate.
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recalculate
                </span>
              </button>
            ) : null}

            <div className="rounded-xl border border-border bg-surface px-6 py-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Estimated freight rate</p>
              <div className="mt-1 flex items-end gap-3">
                <p className="font-mono text-5xl font-semibold tracking-tight text-blue">{usd2(result.quotedRate)}</p>
                <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-mid">USD / MT</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-mid">
                <p>Gross Revenue: <span className="font-mono text-ink">{usd0(result.grossRevenue)}</span></p>
                <p>TCE: <span className="font-mono text-ink">{usd0(result.tcePerDay)}/day</span></p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface px-5 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="font-mono text-2xl font-semibold text-ink">{num(result.route.nauticalMiles)} nm</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-mid">Nautical miles</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="font-mono text-2xl font-semibold text-ink">{num(result.totalDays, 1)} days</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-mid">Total days</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-lg font-semibold text-ink">{result.vesselLabel}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-mid">BDI {num(quote?.bdi ?? bdi)}</p>
                </div>
                <span className="ml-auto rounded-full border border-[#b7e0c8] bg-[#e8f7ee] px-3 py-1 text-xs font-semibold text-[#178a4c]">
                  {routeBadge(result.route.canal)}
                </span>
              </div>
              <p className="mt-3 text-sm text-mid">
                <span className="font-mono text-[10px] uppercase tracking-wider">Route</span>{" "}
                <span className="text-ink">
                  {[canalLabel(result.route.canal), ...result.route.waypoints]
                    .filter((part, index, parts) => part && parts.indexOf(part) === index)
                    .join(" · ")}
                </span>
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Voyage costs</p>
                <Row label="Bunker Qty" value={`${num(Math.round(result.bunkerTonnes))} MT`} />
                <Row label="VLSFO Price" value={`${usd0(bunkerPrice)}/MT (VLSFO)`} />
                <Row label="Bunker Cost" value={usd0(result.bunkerCost)} />
                <Row label="Port Costs" value={usd0(result.portCost)} />
                <Row label="Canal Cost" value={result.canalCost > 0 ? usd0(result.canalCost) : "—"} />
                <Row label="Agency" value={usd0(agencyCost)} />
                <Row label="Total Voyage" value={usd0(result.voyageCost)} strong />
                <div className="mt-1 flex items-baseline justify-between border-t-2 border-blue pt-2 text-[13px] font-semibold text-blue">
                  <span>Total Cost</span>
                  <span className="font-mono">{usd0(result.voyageCost + result.timeCost)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Time costs</p>
                <Row label="Sea Days" value={`${num(result.seaDays, 1)} d`} />
                <Row label="Load Days" value={`${num(result.loadDays, 1)} d (${num(LOAD_RATES[result.vessel])} MT/day)`} />
                <Row label="Disch Days" value={`${num(result.dischargeDays, 1)} d (${num(DISCHARGE_RATES[result.vessel])} MT/day)`} />
                <Row label="Port/Anchorage" value={`${num(extraPortDays, 1)} d`} />
                <Row label="Total Days" value={`${num(result.totalDays, 1)} d`} />
                <Row label="Daily Hire" value={`${usd0(result.dailyHire)}/day`} />
                <Row label="BDI" value={num(quote?.bdi ?? bdi)} />
                <Row label="Total Time" value={usd0(result.timeCost)} strong />
              </div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Premiums ($/MT)</p>
                <Row label="Cargo Type" value={`+${usd2(quote?.cargoPremium ?? 0)}/MT`} accent />
                <Row label="Origin Region" value={`+${usd2(result.originPremium)}/MT (${load?.region ?? "—"})`} accent />
                <Row label="Seasonal" value={`+${usd2(result.seasonalPremium)}/MT (${season})`} accent />
                {result.iranApplied ? <Row label={iranLabel} value={`+${usd2(result.iranPremium)}/MT`} accent /> : null}
                <Row label="Total Premium" value={`+${usd2(result.totalPremium)}/MT`} strong accent />
              </div>
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Rate summary</p>
                <Row label="Base Rate" value={`${usd2(result.baseRate)}/MT`} />
                <Row label="+ Premiums" value={`+${usd2(result.totalPremium)}/MT`} />
                <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 text-[13px] font-semibold text-blue">
                  <span>Final Rate</span>
                  <span className="font-mono">{usd2(result.quotedRate)}/MT</span>
                </div>
                <Row label="Gross Revenue" value={usd0(result.grossRevenue)} />
                <Row label="Actual TCE" value={`${usd0(result.tcePerDay)}/day`} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface px-5 py-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">Market benchmark (verified rates)</p>
              {band ? (
                <dl className="mt-3 divide-y divide-border text-[13px]">
                  <div className="flex justify-between py-2"><dt className="text-mid">Match tier</dt><dd>{band.label ?? TIER_LABEL[band.matchType] ?? band.matchType}</dd></div>
                  <div className="flex justify-between py-2"><dt className="text-mid">Window / sample</dt><dd>{band.windowDays} days · {band.sampleSize} matching {band.sampleSize === 1 ? "fixture" : "fixtures"}</dd></div>
                  <div className="flex justify-between py-2"><dt className="text-mid">Cargo match</dt><dd>{band.cargoMatchMode.replace(/_/g, " ")}</dd></div>
                  <div className="flex justify-between py-2"><dt className="text-mid">Benchmark band</dt><dd>{usd2(band.rateMin)}–{usd2(band.rateMax)}/MT</dd></div>
                  <div className="flex justify-between py-2"><dt className="text-mid">Median midpoint</dt><dd>{usd2(band.rateMedian)}/MT</dd></div>
                  <div className="flex justify-between py-2"><dt className="text-mid">Algorithm rate</dt><dd className="font-mono text-blue">{usd2(result.algorithmRate)}/MT</dd></div>
                  <div className="flex justify-between py-2"><dt className="text-mid">Displayed final rate</dt><dd className="font-mono font-semibold text-blue">{usd2(result.quotedRate)}/MT</dd></div>
                  <div className="flex justify-between py-2">
                    <dt className="text-mid">Verification</dt>
                    <dd className={result.inRange ? "text-[#178a4c]" : "text-danger"}>{result.inRange ? "In range" : "Outside band"}</dd>
                  </div>
                  <div className="flex justify-between gap-6 py-2">
                    <dt className="text-mid">Explanation</dt>
                    <dd className="max-w-md text-right text-ink">
                      {result.inRange
                        ? "The calculated rate sits inside the verified fixture band."
                        : `The calculated rate sits outside the band, so the displayed rate blends in the fixture midpoint at ${Math.round(result.fixtureWeight * 100)}% weight.`}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-mid">
                  No verified fixtures match this route yet, so the displayed rate is the algorithm estimate of {usd2(result.algorithmRate)}/MT.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface px-5 py-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">AI market assessment</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                This panel is advisory on the live hub and does not replace the headline rate. The Gemini assessment is not connected in this build, so no suggested adjustment is applied.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

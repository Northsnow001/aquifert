"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Calculator, PackageOpen, Share2 } from "lucide-react";
import { runNetback, type NetbackUsage } from "@/app/hub/netback/actions";
import { PortField } from "@/components/calculators/port-field";
import { CURRENCIES, findCurrency } from "@/lib/netback/currencies";
import { basisCosts, type Basis, type ForwardOrigin, type NetbackCosts, type ReverseOrigin } from "@/lib/netback/calculate";
import { computeNetback, toUsd, type NetbackConfig, type NetbackRequest } from "@/lib/netback-desk/run";
import { NO_DUTY_NOTE, findDuty, type DutyRecord, type DutyTone } from "@/lib/netback-desk/types";
import { findPort, type PortRecord } from "@/lib/ports";

type Mode = "netback" | "forward";

const basisRows = (costs: NetbackCosts): Array<{ id: Basis; label: string; haulage: number }> => [
  { id: "cfr", label: "CFR Port — discharge & merchant excluded", haulage: 0 },
  { id: "exw", label: "EXW Port", haulage: 0 },
  { id: "local", label: "Local <50 km", haulage: costs.haulageLocal },
  { id: "regional", label: "Regional 50–150 km", haulage: costs.haulageRegional },
  { id: "remote", label: "Remote >150 km", haulage: costs.haulageRemote },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function usageLine(usage: NetbackUsage) {
  const [year, month] = usage.resetsOn.split("-");
  const resets = `${MONTHS[Number(month) - 1] ?? ""} ${year ?? ""}`.toUpperCase();
  const remaining = usage.limit > 0 ? `${Math.max(0, usage.limit - usage.used).toLocaleString()} remaining` : "unlimited";
  return `${usage.used.toLocaleString()}${usage.limit > 0 ? ` of ${usage.limit.toLocaleString()}` : ""} calculated · ${remaining} · resets ${resets}`;
}

const DUTY_BANNER: Record<DutyTone, string> = {
  active: "border-[#f5c2c2] bg-[#fdf1f1] text-[#b42318]",
  warn: "border-[#f5dfb3] bg-[#fff8ea] text-[#9a5b00]",
  ok: "border-[#cdebd8] bg-[#f1faf4] text-[#1f7a45]",
  dim: "border-border bg-s2 text-dim",
};

const pct = (value: number) => `${Number((value * 100).toFixed(2))}%`;

function usd(value: number) {
  return `$${Math.abs(value).toFixed(2)}`;
}

function pillLocal(usdValue: number, symbol: string, code: string, fx: number) {
  if (code === "USD" || fx === 1) return `$${usdValue % 1 === 0 ? usdValue.toFixed(0) : usdValue.toFixed(2)}/MT`;
  const amount = usdValue * fx;
  const text = amount >= 100 ? amount.toFixed(0) : amount.toFixed(1);
  return `${symbol}${text} ${code}/MT`;
}

function dual(usdValue: number, symbol: string, code: string, fx: number) {
  const dollars = `$${Number(usdValue).toFixed(2)}`;
  if (code === "USD" || fx === 1) return { primary: dollars, secondary: "" };
  const local = usdValue * fx;
  const localText = Math.abs(local) >= 1000 ? local.toFixed(0) : local.toFixed(2);
  return { primary: dollars, secondary: `${symbol}${localText} ${code}` };
}

function heroMoney(usdValue: number, symbol: string, code: string, fx: number) {
  if (code === "USD" || fx === 1) return { primary: usd(usdValue), unit: "USD/MT", usdRef: "" };
  const amount = Math.abs(usdValue * fx);
  const text = amount >= 1000 ? amount.toFixed(0) : amount.toFixed(2);
  return { primary: `${symbol}${text}`, unit: `${code}/MT`, usdRef: usd(usdValue) };
}

function statusTone(margin: number) {
  if (margin >= 10) return { label: "Viable", color: "#10b981", badge: "bg-[#e8f7ee] text-[#178a4c]" };
  if (margin >= 0) return { label: "Marginal", color: "#f59e0b", badge: "bg-[#fff7e8] text-[#b45309]" };
  if (margin >= -20) return { label: "Tight", color: "#f59e0b", badge: "bg-[#fff7e8] text-[#b45309]" };
  return { label: "Unviable", color: "#ef4444", badge: "bg-[#fdecec] text-[#dc2626]" };
}

function heroStatus(margin: number) {
  if (margin >= 10) return { label: "Viable origin", className: "bg-[#e8f7ee] text-[#178a4c]" };
  if (margin >= 0) return { label: "Marginal at this price", className: "bg-[#fff7e8] text-[#b45309]" };
  return { label: "No viable origin at this price", className: "bg-[#fdecec] text-[#dc2626]" };
}

export function NetbackCalculator({ ports, config, usage: initialUsage }: { ports: PortRecord[]; config: NetbackConfig; usage: NetbackUsage }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialCurrency = findCurrency(params.get("currency") ?? "USD");
  const initialDestination = findPort(params.get("port") ?? "", ports) ?? null;
  const initialDuty = initialDestination ? findDuty(config.duties, initialDestination.country) : undefined;
  const fxFromLink = params.get("fx") != null;
  const [mode, setMode] = useState<Mode>(params.get("tab") === "forward" ? "forward" : "netback");
  const [destination, setDestination] = useState<PortRecord | null>(initialDestination);
  const [farm, setFarm] = useState(Number(params.get("farm") ?? 800));
  const [fx, setFx] = useState(Number(params.get("fx") ?? 1));
  const [fxSource, setFxSource] = useState(fxFromLink ? "cached today" : initialCurrency.code !== "USD" ? "Fetching live rate..." : "");
  const [currencyCode, setCurrencyCode] = useState(initialCurrency.code);
  const [cargo, setCargo] = useState(Number(params.get("cargo") ?? 35000));
  const [packaging, setPackaging] = useState<"bagged" | "bulk">(params.get("packaging") === "bulk" ? "bulk" : "bagged");
  const [basis, setBasis] = useState<Basis>((params.get("basis") as Basis) || "exw");
  const [inland, setInland] = useState(Number(params.get("inland") ?? 0));
  const [showInland, setShowInland] = useState(Number(params.get("inland") ?? 0) > 0);
  const [dutyEnabled, setDutyEnabled] = useState(params.has("duty") ? params.get("duty") === "1" : Boolean(initialDuty?.active));
  const [dutyPercent, setDutyPercent] = useState(params.has("duty_rate") ? Number(params.get("duty_rate")) : (initialDuty?.rate ?? 0));
  const [run, setRun] = useState<{ request: NetbackRequest; destination: PortRecord } | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [running, startRun] = useTransition();
  const initialCurrencyCode = useRef(initialCurrency.code);
  const fxLocked = useRef(fxFromLink);
  const currency = findCurrency(currencyCode);
  const costs = config.costs;
  const basisCost = basisCosts(basis, costs);
  const duty: DutyRecord | undefined = destination ? findDuty(config.duties, destination.country) : undefined;
  const afrmm = Boolean(duty?.afrmm);
  const farmUsd = toUsd(farm, currency.code, fx);
  const ran = run !== null;

  function selectDestination(port: PortRecord | null) {
    setDestination(port);
    if (!port) return;
    const record = findDuty(config.duties, port.country);
    setDutyEnabled(Boolean(record?.active));
    setDutyPercent(record?.rate ?? 0);
  }

  function changeCurrency(code: string) {
    setCurrencyCode(code);
    if (code === "USD") {
      setFx(1);
      setFxSource("");
    } else if (!(fxLocked.current && code === initialCurrencyCode.current)) {
      setFxSource("Fetching live rate...");
    }
  }

  useEffect(() => {
    if (currency.code === "USD") return;
    if (fxLocked.current && currency.code === initialCurrencyCode.current) return;
    const controller = new AbortController();
    fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal, cache: "no-cache" })
      .then((response) => response.json())
      .then((payload: { result?: string; rates?: Record<string, number> }) => {
        const rate = payload.rates?.[currency.code];
        if (payload.result === "success" && rate) {
          setFx(Number(rate.toFixed(4)));
          setFxSource("live");
        }
      })
      .catch((error: { name?: string }) => {
        if (error?.name === "AbortError") return;
        setFxSource("cached today");
      });
    return () => controller.abort();
  }, [currency.code]);

  const result = useMemo(() => (run ? computeNetback(config, run.request, run.destination) : null), [config, run]);
  const forward = result?.forward ?? [];
  const reverse = result?.reverse ?? [];

  function calculate() {
    if (!destination) return;
    const request: NetbackRequest = {
      mode,
      port: destination.code,
      cargoMt: cargo,
      basis,
      packaging,
      currency: currency.code,
      fx,
      farm,
      inland,
      dutyEnabled,
      dutyPercent,
    };
    setError("");
    startRun(async () => {
      const response = await runNetback(request);
      if (response.usage) setUsage(response.usage);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setRun({ request, destination });
    });
  }

  function share() {
    const query = new URLSearchParams({
      tab: mode,
      port: destination?.code ?? "",
      cargo: String(cargo),
      packaging,
      basis,
      currency: currency.code,
      fx: String(fx),
      farm: String(farm),
      inland: String(inland),
      duty: dutyEnabled ? "1" : "0",
      duty_rate: String(dutyPercent),
    });
    router.replace(`/hub/netback?${query.toString()}`);
    void navigator.clipboard?.writeText(`${window.location.origin}/hub/netback?${query.toString()}`);
    setShared(true);
  }

  const bestReverse = reverse[0];
  const bestForward = forward[0];
  const lcPreview = bestReverse?.impliedLc ?? bestForward?.finCost;
  const maxMargin = Math.max(...reverse.map((origin) => Math.abs(origin.margin)), 1);
  const shown = run ? { ...run.request, currency: findCurrency(run.request.currency) } : null;

  if (!config.origins.length) {
    return (
      <section className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Granular Urea — Netback & Landed Cost</h1>
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/70 px-8 text-center">
          <PackageOpen className="mb-3 h-8 w-8 text-dim" />
          <p className="text-base font-semibold text-ink">Awaiting pricing data</p>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-mid">Netback is available again as soon as the team publishes this week&apos;s benchmark prices.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">Granular Urea — Netback & Landed Cost</h1>
        <p className="text-sm text-mid">FOB Netback · On-Farm Landed Cost · Origin Ranking{config.week ? ` · ${config.week}` : ""}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mid">{usageLine(usage)}</div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5">
        {([
          ["netback", "On-Farm to FOB"],
          ["forward", "FOB to On-Farm"],
        ] as Array<[Mode, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setRun(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === value ? "bg-blue text-white" : "text-mid"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <form
          className="rounded-xl border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            calculate();
          }}
        >
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">— Import parameters</p>
          <PortField countryLabel="Destination country" label="Destination port" value={destination} onSelect={selectDestination} ports={ports} />
          {destination ? <p className="mt-1.5 text-xs text-mid">{destination.region}</p> : null}

          {mode === "netback" ? (
            <div className="mt-4">
              <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">On-farm / input price</p>
              <div className="flex gap-2">
                <select
                  value={currency.code}
                  onChange={(event) => changeCurrency(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-2 text-sm"
                >
                  {CURRENCIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 rounded-lg border border-border px-2 text-xs text-mid">
                  1 USD =
                  <input
                    type="number"
                    min={0.001}
                    step={0.0001}
                    value={fx}
                    onChange={(event) => {
                      setFx(Number(event.target.value));
                      setFxSource("edited");
                    }}
                    className="w-20 bg-transparent py-2 text-sm text-ink outline-none"
                  />
                  {currency.code}
                </label>
              </div>
              {currency.code !== "USD" ? (
                <p className="mt-1 text-[11px] text-teal">1 USD = {fx} {currency.code}{fxSource ? ` · ${fxSource}` : ""}</p>
              ) : null}
              <div className="relative mt-2">
                <input
                  type="number"
                  min={1}
                  value={farm}
                  onChange={(event) => setFarm(Number(event.target.value))}
                  className="w-full rounded-lg border border-border px-3 py-2.5 pr-36 text-sm"
                />
                {currency.code !== "USD" ? (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#178a4c]">
                    = {usd(farmUsd)} USD
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-dim">
                Price in {currency.code}/MT — converted to USD for calculation
              </p>
            </div>
          ) : null}

          <div className="my-4 h-px bg-border" />
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-mid">— Cost parameters</p>
          <label className="mb-3 block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">
              Cargo size (MT) — min 5,000 / max 100,000
            </span>
            <input
              type="number"
              min={5000}
              max={100000}
              step={1000}
              value={cargo}
              onChange={(event) => setCargo(Number(event.target.value))}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </label>

          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Packaging</p>
          <div className="mb-3 flex gap-2">
            {([
              ["bagged", costs.bagged],
              ["bulk", 0],
            ] as Array<["bagged" | "bulk", number]>).map(([value, amount]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPackaging(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${packaging === value ? "border-[#b7e0c8] bg-[#e8f7ee] text-[#178a4c]" : "border-border text-mid"}`}
              >
                {value} ({pillLocal(amount, currency.symbol, currency.code, fx)})
              </button>
            ))}
          </div>

          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Pricing basis</p>
          <div className="mb-3 space-y-1.5">
            {basisRows(costs).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setBasis(row.id)}
                className={`block w-full rounded-lg border px-3 py-1.5 text-left text-xs ${basis === row.id ? "border-[#b7e0c8] bg-[#e8f7ee] text-[#178a4c]" : "border-border text-ink"}`}
              >
                {row.id === "cfr"
                  ? row.label
                  : `${row.label} — ${pillLocal(row.haulage, currency.symbol, currency.code, fx)} haulage`}
              </button>
            ))}
          </div>

          <button type="button" className="text-xs text-blue" onClick={() => setShowInland((value) => !value)}>
            {showInland ? "− Hide inland cost" : "+ Add known inland / additional landed cost"}
          </button>
          {showInland ? (
            <div className="mt-2 rounded-lg border border-border bg-s2 p-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-mid">Additional inland / known cost — optional</p>
              <input
                type="number"
                min={0}
                step={0.5}
                value={inland}
                onChange={(event) => setInland(Number(event.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-dim">
                Enter in {currency.code} per MT. Any known inland freight, silo, or last-mile cost outside the haulage tiers.
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Import duty</p>
            <p className={`mb-2 whitespace-pre-line rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${DUTY_BANNER[duty?.tone ?? "dim"]}`}>
              {duty?.note || NO_DUTY_NOTE}
              {duty?.afrmm ? `\nAFRMM levy of ${pct(costs.afrmmRate)} of freight applies.` : ""}
            </p>
            <label className="flex items-center gap-2 rounded-lg bg-s2 px-3 py-2 text-xs text-ink">
              <input type="checkbox" checked={dutyEnabled} onChange={(event) => setDutyEnabled(event.target.checked)} />
              Apply import duty at
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={dutyPercent}
                onChange={(event) => setDutyPercent(Number(event.target.value))}
                className="w-16 rounded border border-border bg-white px-2 py-1 text-sm"
              />
              %
            </label>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">Trade costs applied (USD/MT)</p>
            <div className="space-y-1 rounded-lg border border-border px-3 py-2 text-xs">
              <CostLine label="Discharge port" value={basisCost.includeDischarge ? usd(costs.discharge) : "excluded"} muted={!basisCost.includeDischarge} />
              <CostLine label="Merchant margin" value={basisCost.includeMargin ? usd(costs.margin) : "excluded"} muted={!basisCost.includeMargin} />
              <CostLine label="Bags & bagging" value={packaging === "bagged" && basisCost.includePackaging ? usd(costs.bagged) : "$0.00"} />
              <CostLine label="Inspection" value={usd(costs.inspection)} />
              <CostLine label="Insurance" value={usd(costs.insurance)} />
              <CostLine label="Haulage" value={usd(basisCost.haulage)} />
              <CostLine
                label={`LC finance (${pct(costs.lcRate)}/${costs.lcDays}d)`}
                value={ran && lcPreview != null ? `USD ${lcPreview.toFixed(2)}${mode === "forward" ? " (best origin)" : ""}` : "calc on run"}
                accent
              />
              <CostLine label="Import duty" value={dutyEnabled && dutyPercent > 0 ? `${dutyPercent.toFixed(2)}% on CIF` : "None"} />
              {afrmm ? <CostLine label={`AFRMM levy (${destination?.country ?? ""})`} value={`${pct(costs.afrmmRate)} of freight`} /> : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!destination || running}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Calculator className="h-4 w-4" />
              {running ? "Calculating…" : "Calculate"}
            </button>
            {ran ? (
              <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-mid">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-2 rounded-lg bg-[#fdecec] px-3 py-2 text-xs text-[#b42318]">{error}</p> : null}
          {shared ? <p className="mt-2 rounded-lg bg-[#e8f7ee] px-3 py-2 text-xs text-[#178a4c]">Share link copied to clipboard.</p> : null}
        </form>

        {!run || !shown || !result ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/70 px-8 text-center">
            <ArrowLeftRight className="mb-3 h-8 w-8 text-dim" />
            <p className="max-w-sm text-sm leading-relaxed text-mid">
              Select a destination port, set your parameters, and calculate to see the full origin ranking and cost breakdown.
            </p>
          </div>
        ) : shown.mode === "netback" && bestReverse ? (
          <ReverseResults
            rows={reverse}
            best={bestReverse}
            destination={run.destination}
            farmUsd={result.farmUsd}
            currency={shown.currency}
            fx={shown.fx}
            basis={shown.basis}
            packaging={shown.packaging}
            dutyEnabled={shown.dutyEnabled}
            dutyPercent={shown.dutyPercent}
            inlandUsd={result.inlandUsd}
            maxMargin={maxMargin}
            costs={costs}
          />
        ) : bestForward ? (
          <ForwardResults rows={forward} best={bestForward} currency={shown.currency} fx={shown.fx} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-mid">No origins matched this destination.</div>
        )}
      </div>
    </section>
  );
}

function CostLine({ label, value, muted = false, accent = false }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-mid">{label}</span>
      <span className={`font-mono ${muted ? "text-dim line-through" : accent ? "text-[#0ea5e9]" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function DualAmount({ usdValue, symbol, code, fx, minus = false }: { usdValue: number; symbol: string; code: string; fx: number; minus?: boolean }) {
  const pair = dual(Math.abs(usdValue), symbol, code, fx);
  return (
    <span className="font-mono">
      {minus ? "- " : ""}
      {pair.primary}
      {pair.secondary ? <span className="ml-1 text-dim">{pair.secondary}</span> : null}
    </span>
  );
}

function ReverseResults({
  rows,
  best,
  destination,
  farmUsd,
  currency,
  fx,
  basis,
  packaging,
  dutyEnabled,
  dutyPercent,
  inlandUsd,
  maxMargin,
  costs: tradeCosts,
}: {
  costs: NetbackCosts;
  rows: ReverseOrigin[];
  best: ReverseOrigin;
  destination: PortRecord;
  farmUsd: number;
  currency: { code: string; symbol: string };
  fx: number;
  basis: Basis;
  packaging: "bagged" | "bulk";
  dutyEnabled: boolean;
  dutyPercent: number;
  inlandUsd: number;
  maxMargin: number;
}) {
  const costs = basisCosts(basis, tradeCosts);
  const hero = heroMoney(best.impliedFob, currency.symbol, currency.code, fx);
  const badge = heroStatus(best.margin);
  const basisName = basis === "cfr" ? "CFR Port" : basis === "exw" ? "EXW Port" : basis[0].toUpperCase() + basis.slice(1);
  const discharge = costs.includeDischarge ? tradeCosts.discharge : 0;
  const marginCost = costs.includeMargin ? tradeCosts.margin : 0;
  const bags = costs.includePackaging && packaging === "bagged" ? tradeCosts.bagged : 0;
  const marginPair = dual(best.margin, currency.symbol, currency.code, fx);
  const actualPair = dual(best.actualFob, currency.symbol, currency.code, fx);
  const farmPair = dual(farmUsd, currency.symbol, currency.code, fx);

  return (
    <div className="space-y-4">
      {currency.code !== "USD" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-4 py-2 text-xs text-mid">
          <span>FX rate: 1 USD = {fx} {currency.code}{fx ? "" : ""}</span>
          <span className="ml-auto">Prices shown in {currency.code} · USD reference shown below</span>
        </div>
      ) : null}
      <div className="rounded-xl border border-[#d7efe3] bg-[#f4fbf7] px-5 py-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#178a4c]">
          Best origin — highest implied FOB netback
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-5xl font-semibold tracking-tight text-[#178a4c]">{hero.primary}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#178a4c]">{hero.unit}</p>
            {hero.usdRef ? <p className="mt-1 font-mono text-lg text-mid">{hero.usdRef} <span className="text-xs">USD/MT implied FOB</span></p> : null}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        </div>
        <dl className="mt-4 grid gap-y-1 text-sm sm:grid-cols-2">
          <div>Best origin: <span className="font-semibold">{best.label} ({best.port})</span></div>
          <div>
            Actual FOB: <span className="font-mono">{actualPair.primary} {actualPair.secondary}/MT</span>
          </div>
          <div>
            Margin vs actual:{" "}
            <span className={`font-mono font-semibold ${best.margin >= 0 ? "text-[#178a4c]" : "text-danger"}`}>
              {marginPair.primary}/MT
              {marginPair.secondary ? <span className="ml-1 font-normal">{marginPair.secondary}/MT</span> : null}
            </span>
          </div>
          <div>Farm gate input: <span className="font-mono">{farmPair.primary} {farmPair.secondary}</span></div>
          <div>Destination: <span className="font-semibold">{destination.country} — {destination.name}</span></div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
          Cost deductions — farm gate back to FOB — showing {best.label} as example
        </p>
        <Deduct label={`Input price (${basisName})`} value={farmUsd} currency={currency} fx={fx} />
        <Deduct label="Haulage to port" value={costs.haulage} currency={currency} fx={fx} minus excluded={basis === "cfr"} />
        <Deduct label="Discharge / port costs" value={discharge} currency={currency} fx={fx} minus excluded={!costs.includeDischarge} />
        <Deduct label="Bags & bagging" value={bags} currency={currency} fx={fx} minus excluded={!costs.includePackaging} />
        <Deduct label="Merchant margin" value={marginCost} currency={currency} fx={fx} minus excluded={!costs.includeMargin} />
        <Deduct label="Inspection" value={tradeCosts.inspection} currency={currency} fx={fx} minus />
        <Deduct label="Insurance (marine & credit)" value={tradeCosts.insurance} currency={currency} fx={fx} minus />
        <Deduct label={`LC finance (${pct(tradeCosts.lcRate)} / ${tradeCosts.lcDays}d on CFR)`} value={best.impliedLc} currency={currency} fx={fx} minus />
        {dutyEnabled && dutyPercent > 0 ? (
          <Deduct label={`Import duty (${dutyPercent.toFixed(2)}% on CIF)`} value={best.impliedDuty} currency={currency} fx={fx} minus />
        ) : (
          <Deduct label="Import duty" value={0} currency={currency} fx={fx} excluded />
        )}
        {best.afrmmCost > 0 ? <Deduct label={`AFRMM levy (${pct(tradeCosts.afrmmRate)} of freight — ${destination.country})`} value={best.afrmmCost} currency={currency} fx={fx} minus /> : null}
        {inlandUsd > 0 ? <Deduct label="Additional inland / landed cost" value={inlandUsd} currency={currency} fx={fx} minus /> : null}
        <div className="flex justify-between border-t border-border py-1.5 text-[13px]">
          <span>= Implied CFR ({best.label})</span>
          <DualAmount usdValue={best.impliedCfr} symbol={currency.symbol} code={currency.code} fx={fx} />
        </div>
        <Deduct label={`Ocean freight (${best.label} — ${best.nauticalMiles.toLocaleString()} nm)`} value={best.freightMt} currency={currency} fx={fx} minus />
        <div className="flex justify-between border-t border-[#b7e0c8] py-2 text-sm font-semibold text-[#178a4c]">
          <span>Implied FOB netback ({best.label})</span>
          <DualAmount usdValue={best.impliedFob} symbol={currency.symbol} code={currency.code} fx={fx} />
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
          All origins — implied FOB vs actual FOB (best to worst)
        </p>
        <div className="space-y-2">
          {rows.map((origin, index) => {
            const tone = statusTone(origin.margin);
            const actualMoney = heroMoney(origin.actualFob, currency.symbol, currency.code, fx);
            const impliedMoney = heroMoney(origin.impliedFob, currency.symbol, currency.code, fx);
            const marginMoney = heroMoney(Math.abs(origin.margin), currency.symbol, currency.code, fx);
            const width = Math.min(100, (Math.abs(origin.margin) / maxMargin) * 100);
            return (
              <article key={origin.key} className="rounded-xl border bg-surface px-3 py-3" style={{ borderColor: `${tone.color}55` }}>
                <div className="grid items-center gap-3 md:grid-cols-[auto_minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto]">
                  <span className="font-mono text-sm font-semibold text-mid">#{index + 1}</span>
                  <div>
                    <p className="font-semibold">{origin.label}</p>
                    <p className="font-mono text-[11px] text-dim">
                      {origin.nauticalMiles.toLocaleString()} nm | {usd(origin.freightMt)}/MT freight
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-dim">Actual FOB</p>
                    <p className="font-mono font-semibold">{actualMoney.primary}</p>
                    {actualMoney.usdRef ? <p className="font-mono text-[11px] text-dim">{actualMoney.usdRef}</p> : null}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-dim">Implied FOB</p>
                    <p className="font-mono font-semibold text-[#0ea5e9]">{impliedMoney.primary}</p>
                    {impliedMoney.usdRef ? <p className="font-mono text-[11px] text-dim">{impliedMoney.usdRef}</p> : null}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-dim">Margin vs actual</p>
                    <p className="font-mono font-bold" style={{ color: tone.color }}>
                      {origin.margin >= 0 ? "+" : "-"}
                      {marginMoney.primary}/MT
                    </p>
                    {marginMoney.usdRef ? (
                      <p className="font-mono text-[11px] text-dim">
                        {origin.margin >= 0 ? "+" : "-"}
                        {marginMoney.usdRef}
                      </p>
                    ) : null}
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-s3">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, background: tone.color }} />
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone.badge}`}>{tone.label}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Deduct({
  label,
  value,
  currency,
  fx,
  minus = false,
  excluded = false,
}: {
  label: string;
  value: number;
  currency: { code: string; symbol: string };
  fx: number;
  minus?: boolean;
  excluded?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-[13px] ${excluded ? "text-dim line-through" : ""}`}>
      <span className={minus && !excluded ? "text-mid" : ""}>{label}</span>
      {excluded ? (
        <span>— excluded</span>
      ) : (
        <span className={minus ? "text-danger" : ""}>
          <DualAmount usdValue={value} symbol={currency.symbol} code={currency.code} fx={fx} minus={minus} />
        </span>
      )}
    </div>
  );
}

const RANK_COLORS = ["#10b981", "#1e88e5", "#f59e0b", "#94a3b8", "#94a3b8", "#64748b", "#64748b"];

function ForwardResults({
  rows,
  best,
  currency,
  fx,
}: {
  rows: ForwardOrigin[];
  best: ForwardOrigin;
  currency: { code: string; symbol: string };
  fx: number;
}) {
  const hero = heroMoney(best.totalFarm, currency.symbol, currency.code, fx);
  const freight = dual(best.freightMt, currency.symbol, currency.code, fx);
  const cheapest = Math.min(...rows.map((origin) => origin.totalFarm));
  const dearest = Math.max(...rows.map((origin) => origin.totalFarm));
  return (
    <div className="space-y-4">
      {currency.code !== "USD" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface px-4 py-2 text-xs text-mid">
          <span>FX rate: 1 USD = {fx} {currency.code}</span>
          <span className="ml-auto">Prices shown in {currency.code} · USD reference shown below</span>
        </div>
      ) : null}
      <div className="rounded-xl border border-[#d7efe3] bg-[#f4fbf7] px-5 py-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#178a4c]">
          Best origin — cheapest delivered farm gate
        </p>
        <p className="mt-2 font-mono text-5xl font-semibold text-[#178a4c]">{hero.primary}</p>
        <p className="text-sm font-semibold uppercase text-[#178a4c]">{hero.unit}</p>
        {hero.usdRef ? <p className="mt-1 font-mono text-lg text-mid">{hero.usdRef} USD/MT</p> : null}
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>Origin: <span className="font-semibold">{best.label} ({best.port})</span></div>
          <div>
            Freight: <span className="font-mono">{freight.primary}{freight.secondary ? ` ${freight.secondary}` : ""}/MT</span>
          </div>
          <div>Route: <span>{best.waypoints || best.canal}</span></div>
          <div>Distance: <span className="font-mono">{best.nauticalMiles.toLocaleString()} nm</span></div>
        </dl>
      </div>
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">
          All origins ranked — delivered farm gate cost (cheapest first)
        </p>
        <div className="space-y-3">
          {rows.map((origin, index) => {
            const color = RANK_COLORS[index] ?? "#94a3b8";
            const price = heroMoney(origin.totalFarm, currency.symbol, currency.code, fx);
            const gap = origin.totalFarm - cheapest;
            const gapMoney = dual(gap, currency.symbol, currency.code, fx);
            const width = Math.max(5, 100 - ((origin.totalFarm - cheapest) / (dearest - cheapest + 0.01)) * 70);
            const canal = origin.canal !== "none" ? `${origin.canal.toUpperCase()} | ` : "";
            const chips = [
              ["FOB price", origin.fob, true],
              ["Freight", origin.freightMt, true],
              ["CFR", origin.cfr, true],
              ["Discharge", origin.dischargeCost, origin.dischargeCost > 0],
              ["Packaging", origin.packCost, origin.packCost > 0],
              ["Margin", origin.marginCost, origin.marginCost > 0],
              ["LC finance", origin.finCost, true],
              ["Haulage", origin.haulage, origin.haulage > 0],
              ["Import duty", origin.dutyCost, origin.dutyCost > 0],
            ] as Array<[string, number, boolean]>;
            return (
              <article
                key={origin.key}
                className={`relative overflow-hidden rounded-xl border bg-surface px-4 py-3 ${index === 0 ? "border-[#b7e0c8] bg-[#f7fdf9]" : "border-border"}`}
                style={{ borderTopWidth: 3, borderTopColor: color }}
              >
                <span className="absolute right-3 top-3 font-mono text-xs text-dim">#{index + 1}</span>
                <p className="pr-8 text-base font-semibold">{origin.label}</p>
                <p className="font-mono text-[11px] text-dim">
                  {origin.port} | {canal}{origin.nauticalMiles.toLocaleString()} nm | {origin.vessel}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-4xl font-semibold" style={{ color }}>{price.primary}</p>
                    <p className="text-xs uppercase text-mid">{price.unit} delivered</p>
                    {price.usdRef ? <p className="font-mono text-sm text-mid">{price.usdRef} USD/MT</p> : null}
                  </div>
                  {index === 0 ? (
                    <span className="text-sm font-semibold text-[#178a4c]">Best option</span>
                  ) : (
                    <span className="text-right text-sm font-semibold text-[#e11d48]">
                      +{gapMoney.primary}{gapMoney.secondary ? ` ${gapMoney.secondary}` : ""}/MT vs best
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-s3">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {chips.map(([label, amount, shown]) => {
                    const money = dual(amount, currency.symbol, currency.code, fx);
                    return (
                      <div key={label} className="rounded-lg border border-border bg-white px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-dim">{label}</p>
                        <p className={`font-mono text-[12px] ${label === "Import duty" && shown ? "text-danger" : "text-ink"}`}>
                          {shown ? `${money.primary}${money.secondary ? ` ${money.secondary}` : ""}` : "—"}
                        </p>
                      </div>
                    );
                  })}
                  {origin.inlandCost > 0 ? (
                    <div className="rounded-lg border border-border bg-white px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-dim">Inland</p>
                      <p className="font-mono text-[12px] text-[#0ea5e9]">{dual(origin.inlandCost, currency.symbol, currency.code, fx).primary}</p>
                    </div>
                  ) : null}
                  {origin.afrmmCost > 0 ? (
                    <div className="rounded-lg border border-border bg-white px-2 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-dim">AFRMM levy</p>
                      <p className="font-mono text-[12px] text-[#d97706]">{dual(origin.afrmmCost, currency.symbol, currency.code, fx).primary}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

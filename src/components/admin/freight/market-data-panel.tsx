"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Anchor, ArrowRight, ExternalLink, Fuel, LineChart, RefreshCw, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { refreshBdiNow, refreshBunkerNow, saveBunkerPrices, saveManualBdi } from "@/app/admin/freight-calculator/actions";
import { Panel } from "@/components/admin/aquibot/shared";
import { btnPrimary, btnSecondary, field, label } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { VESSEL_SPECS } from "@/lib/freight/reference";
import type { BdiState, BunkerState, FetchStatus } from "@/lib/freight-desk/types";

const utc = (value: string | null) => (value ? `${formatStamp(value)} UTC` : "Never");

const SOURCE_LABEL: Record<BdiState["source"], string> = {
  default: "Built-in fallback",
  fetched: "Trading Economics",
  "fetched-ai": "Trading Economics, read by Gemini",
  manual: "Manual entry",
};

function StatusRows({ status, extra }: { status: FetchStatus; extra?: [string, React.ReactNode][] }) {
  const rows: [string, React.ReactNode][] = [
    [
      "Source",
      <a key="source" href={status.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue no-underline hover:underline">
        {status.sourceUrl.replace(/^https?:\/\//, "")}
        <ExternalLink className="h-3 w-3" />
      </a>,
    ],
    ["Last fetch attempt", utc(status.lastAttemptAt)],
    ["Last successful fetch", utc(status.lastSuccessAt)],
    ...(extra ?? []),
    ["Last error", status.lastError ? <span key="error" className="text-[#b42318]">{status.lastError}</span> : "None"],
  ];
  return (
    <dl className="divide-y divide-border rounded-xl border border-border text-[12.5px]">
      {rows.map(([term, value]) => (
        <div key={term} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 px-3.5 py-2">
          <dt className="text-mid">{term}</dt>
          <dd className="min-w-0 break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MarketDataPanel({
  bdi,
  bunker,
  bdiAgeDays,
  ports,
}: {
  bdi: BdiState;
  bunker: BunkerState;
  bdiAgeDays: number | null;
  ports: { live: number; total: number; issues: number; customized: boolean };
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [task, setTask] = useState<string | null>(null);
  const [manual, setManual] = useState({ value: bdi.value, date: bdi.tradeDate ?? "" });
  const [prices, setPrices] = useState(bunker.prices);
  const pricesDirty = JSON.stringify(prices) !== JSON.stringify(bunker.prices);

  const run = (name: string, job: () => Promise<{ ok: boolean; message?: string }>, success: string) => {
    setTask(name);
    start(async () => {
      const result = await job();
      if (result.ok) toast.success(result.message ?? success);
      else toast.error(result.message ?? "Something went wrong.");
      setTask(null);
      router.refresh();
    });
  };

  const stale = bdi.source === "default" || bdiAgeDays === null || bdiAgeDays > 7;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          icon={<LineChart className="h-4 w-4" />}
          title="Baltic Dry Index"
          description="Sets daily hire in every quote. Refreshed from Trading Economics once a day when a member opens the calculator."
          actions={
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => run("bdi", refreshBdiNow, "BDI refreshed.")}>
              <RefreshCw className={`h-3.5 w-3.5 ${task === "bdi" ? "animate-spin" : ""}`} />
              {task === "bdi" ? "Refreshing…" : "Refresh now"}
            </button>
          }
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[40px] font-black leading-none tracking-tight text-ink">{bdi.value.toLocaleString()}</p>
              <p className="mt-2 text-[12.5px] text-mid">
                {bdi.tradeDate ? `Trade date ${bdi.tradeDate}` : "No trade date"} · {SOURCE_LABEL[bdi.source]}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-[12px]">
              {Object.values(VESSEL_SPECS).map((spec) => (
                <p key={spec.label} className="flex justify-between gap-3">
                  <span className="text-mid">{spec.label}</span>
                  <span className="font-mono text-ink">${Math.round(bdi.value * spec.bdiMult).toLocaleString()}/day</span>
                </p>
              ))}
            </div>
          </div>
          {stale ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-[#fff6e5] px-3 py-2 text-[12px] text-[#9a5b00]">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {bdi.source === "default"
                ? "Quotes use the built-in value. Refresh from the source or enter today's index below."
                : `The trade date is ${Math.floor(bdiAgeDays ?? 0)} days old. Refresh it or enter the latest index below.`}
            </p>
          ) : null}
          <div className="mt-4">
            <StatusRows status={bdi} extra={[["Last manual save", utc(bdi.manualAt)]]} />
          </div>
          <form
            className="mt-4 rounded-xl border border-border bg-s2/40 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              run("manual", () => saveManualBdi(manual.value, manual.date), "Manual BDI saved. Quotes use it now.");
            }}
          >
            <p className="text-[13px] font-semibold text-ink">Manual fallback</p>
            <p className="mt-0.5 text-[12px] text-dim">For when the source is stale, blocked or rate-limited. Saving takes effect immediately.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="manual-bdi" className={label}>
                  BDI value
                </label>
                <input id="manual-bdi" type="number" min={1} step={1} value={manual.value} onChange={(event) => setManual({ ...manual, value: Number(event.target.value) })} className={`${field} mt-1.5 h-10 w-32 font-mono`} />
              </div>
              <div>
                <label htmlFor="manual-date" className={label}>
                  Trade date
                </label>
                <input id="manual-date" type="date" value={manual.date} onChange={(event) => setManual({ ...manual, date: event.target.value })} className={`${field} mt-1.5 h-10 w-44`} />
              </div>
              <button type="submit" className={btnPrimary} disabled={busy}>
                <Save className="h-4 w-4" />
                {task === "manual" ? "Saving…" : "Save manual BDI"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel
          icon={<Fuel className="h-4 w-4" />}
          title="VLSFO bunker prices"
          description="The hub buttons members pick a bunker price from. The first hub is the calculator's default."
          actions={
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => run("bunker", refreshBunkerNow, "Bunker prices refreshed.")}>
              <RefreshCw className={`h-3.5 w-3.5 ${task === "bunker" ? "animate-spin" : ""}`} />
              {task === "bunker" ? "Refreshing…" : "Refresh now"}
            </button>
          }
        >
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-[13px]">
              <thead className="bg-s2/60 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                <tr>
                  <th className="px-3.5 py-2 font-semibold">Hub</th>
                  <th className="px-3.5 py-2 font-semibold">$ / MT</th>
                  <th className="px-3.5 py-2 text-right font-semibold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prices.map((hub, index) => {
                  const saved = bunker.prices[index]?.price ?? hub.price;
                  const delta = hub.price - saved;
                  return (
                    <tr key={hub.city}>
                      <td className="px-3.5 py-1.5 font-medium text-ink">
                        {hub.city}
                        {index === 0 ? <span className="ml-2 rounded bg-blue-light px-1.5 py-px text-[10.5px] font-semibold text-blue">default</span> : null}
                      </td>
                      <td className="px-3.5 py-1.5">
                        <input
                          type="number"
                          step="0.5"
                          aria-label={`${hub.city} price`}
                          value={hub.price}
                          onChange={(event) => setPrices(prices.map((item, i) => (i === index ? { ...item, price: Number(event.target.value) } : item)))}
                          className={`${field} h-8 w-28 font-mono`}
                        />
                      </td>
                      <td className={`px-3.5 py-1.5 text-right font-mono text-[12px] ${delta > 0 ? "text-[#b42318]" : delta < 0 ? "text-[#1f7a45]" : "text-dim"}`}>
                        {delta ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {pricesDirty ? (
              <button type="button" className="text-[12.5px] font-semibold text-mid hover:text-ink" onClick={() => setPrices(bunker.prices)}>
                Discard
              </button>
            ) : null}
            <button type="button" className={btnPrimary} disabled={busy || !pricesDirty} onClick={() => run("prices", () => saveBunkerPrices(prices), "Bunker prices saved.")}>
              <Save className="h-4 w-4" />
              {task === "prices" ? "Saving…" : "Save prices"}
            </button>
          </div>
          <div className="mt-4">
            <StatusRows status={bunker} extra={[["Last manual edit", utc(bunker.manualAt)]]} />
          </div>
        </Panel>
      </div>

      <Panel
        icon={<Anchor className="h-4 w-4" />}
        title="Port registry"
        description="Ports members can pick as load and discharge, and the geography fixtures are matched against."
        actions={
          <Link href="/admin/ports" className={btnSecondary}>
            Manage ports
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <p className={label}>Live ports</p>
            <p className="mt-1 font-mono text-[22px] font-bold text-ink">{ports.live}</p>
            <p className="text-[12px] text-dim">of {ports.total} in the registry</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className={label}>To review</p>
            <p className={`mt-1 font-mono text-[22px] font-bold ${ports.issues ? "text-[#9a5b00]" : "text-[#1f7a45]"}`}>{ports.issues}</p>
            <p className="text-[12px] text-dim">codes, regions or coordinates</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className={label}>Source</p>
            <p className="mt-1 text-[15px] font-bold text-ink">{ports.customized ? "Edited registry" : "Canonical seed"}</p>
            <p className="text-[12px] text-dim">{ports.customized ? "Reset to the seed list from Ports" : "No edits yet"}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

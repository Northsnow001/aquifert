"use client";

import { useMemo, useState } from "react";
import { estimateLaneAction } from "@/app/admin/aq-analytics/actions";
import { PRODUCTS, fmtUsd, vesselBand, type LaneEstimate, type LaneEstimateInput } from "@/lib/aq-analytics/contracts";
import { btnPrimary, input, label } from "@/components/admin/ui";

type Market = "normal" | "tight" | "soft";
type PortOpt = { port: string; country: string };

export function CalculatorForm({
  loadPorts,
  dischPorts,
  initial,
  estimate = estimateLaneAction,
}: {
  loadPorts: PortOpt[];
  dischPorts: PortOpt[];
  initial: { load?: string; disch?: string; qty?: number; product?: string };
  estimate?: (input: LaneEstimateInput) => Promise<{ ok: true; data: LaneEstimate } | { ok: false; message: string }>;
}) {
  const [loadPort, setLoadPort] = useState(initial.load || loadPorts[0]?.port || "");
  const [dischPort, setDischPort] = useState(initial.disch || dischPorts[0]?.port || "");
  const [product, setProduct] = useState(initial.product || "Urea");
  const [qty, setQty] = useState(initial.qty || 30000);
  const [market, setMarket] = useState<Market>("normal");
  const [loadCost, setLoadCost] = useState(28000);
  const [dischCost, setDischCost] = useState(32000);
  const [agency, setAgency] = useState(12000);
  const [extraDays, setExtraDays] = useState(0);
  const [cfr, setCfr] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<LaneEstimate | null>(null);
  const [pending, setPending] = useState(false);
  const band = useMemo(() => vesselBand(qty), [qty]);

  async function run() {
    setPending(true);
    setError("");
    const out = await estimate({
      loadPort,
      dischPort,
      product,
      quantityMt: qty,
      market,
      loadPortCostUsd: loadCost,
      dischPortCostUsd: dischCost,
      agencyUsd: agency,
      extraPortDays: extraDays,
      cfrPriceUsd: cfr === "" ? null : Number(cfr),
    });
    setPending(false);
    if (!out.ok) {
      setError(out.message);
      return;
    }
    setResult(out.data);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <section className="aq-card p-5 lg:col-span-2">
        <h2 className="mb-4 text-[15px] font-semibold">Voyage inputs</h2>
        <div className="space-y-3">
          <Field caption="Load port">
            <select className={input} value={loadPort} onChange={(e) => setLoadPort(e.target.value)}>
              {loadPorts.map((p) => (
                <option key={p.port} value={p.port}>
                  {p.port} · {p.country}
                </option>
              ))}
            </select>
          </Field>
          <Field caption="Discharge port">
            <select className={input} value={dischPort} onChange={(e) => setDischPort(e.target.value)}>
              {dischPorts.map((p) => (
                <option key={p.port} value={p.port}>
                  {p.port} · {p.country}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field caption="Product">
              <select className={input} value={product} onChange={(e) => setProduct(e.target.value)}>
                {PRODUCTS.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field caption={`Quantity (MT) · ${band}`}>
              <input className={input} type="number" min={1000} step={500} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["soft", "normal", "tight"] as Market[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMarket(item)}
                className={`rounded-lg border px-2 py-2 text-[12.5px] font-semibold capitalize ${
                  market === item ? "border-blue bg-blue/10 text-blue" : "border-border text-mid"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field caption="Load port costs (USD)">
              <input className={input} type="number" value={loadCost} onChange={(e) => setLoadCost(Number(e.target.value))} />
            </Field>
            <Field caption="Discharge port costs (USD)">
              <input className={input} type="number" value={dischCost} onChange={(e) => setDischCost(Number(e.target.value))} />
            </Field>
            <Field caption="Agency (USD)">
              <input className={input} type="number" value={agency} onChange={(e) => setAgency(Number(e.target.value))} />
            </Field>
            <Field caption="Extra port days">
              <input className={input} type="number" value={extraDays} onChange={(e) => setExtraDays(Number(e.target.value))} />
            </Field>
          </div>
          <Field caption="Optional CFR offer (USD/MT)">
            <input className={input} value={cfr} onChange={(e) => setCfr(e.target.value)} placeholder="Leave blank to skip netback" />
          </Field>
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}
          <button type="button" className={btnPrimary} disabled={pending || !loadPort || !dischPort} onClick={() => void run()}>
            {pending ? "Pricing…" : "Price lane"}
          </button>
        </div>
      </section>
      <section className="aq-card overflow-hidden lg:col-span-3">
        {!result ? (
          <p className="px-5 py-10 text-[14px] text-mid">Run a voyage to see freight per MT, the cost build, TCE and FOB netback.</p>
        ) : (
          <div>
            <div className="bg-[#10263b] px-5 py-4 text-white">
              <p className="text-[11px] uppercase tracking-[0.08em] text-white/60">Freight per MT</p>
              <p className="text-[28px] font-semibold">{fmtUsd(result.freightPerMt)}</p>
              {result.fobNetback != null ? <p className="mt-1 text-[14px]">FOB netback {fmtUsd(result.fobNetback)}</p> : null}
            </div>
            <table className="w-full text-left text-[13px]">
              <tbody>
                {[
                  ["Distance", `${result.distanceNm.toLocaleString("en-GB")} nm`],
                  ["Vessel", result.vesselType],
                  ["Voyage", `${result.voyageDays} days (sea ${result.seaDays}, load ${result.loadDays}, disch ${result.dischDays})`],
                  ["Bunkers", `${result.bunkerT} t × ${fmtUsd(result.bunkerPriceT, 0)} = ${fmtUsd(result.bunkerCost, 0)}`],
                  ["Port + canal", fmtUsd(result.portCosts + result.canalCosts, 0)],
                  ["Agency", fmtUsd(result.agencyFees, 0)],
                  ["Time charter", `${fmtUsd(result.dailyHire, 0)}/day · ${fmtUsd(result.totalTimeCost, 0)}`],
                  ["Gross revenue", fmtUsd(result.grossRevenue, 0)],
                  ["TCE", `${fmtUsd(result.tcePerDay, 0)}/day`],
                  ["BDI reference", String(result.bdiReference)],
                ].map(([k, v]) => (
                  <tr key={k} className="border-t border-border">
                    <td className="px-5 py-2 text-mid">{k}</td>
                    <td className="px-5 py-2 text-right font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-5 py-3 text-[12px] text-mid">{result.method}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={label}>{caption}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

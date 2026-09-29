"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { submitOrderEnquiry } from "@/app/hub/order-desk/actions";

const PRODUCTS = [
  "Amsul", "AN", "CAN", "Urea - Prilled", "Urea - Granular", "Urea - Technical", "DAP", "MAP", "TSP", "SSP", "MOP", "UAN", "NPK", "APP", "CN", "Kieserite", "Magnesium Nitrate", "MKP", "NOP", "Phos Acid", "SOP", "TMAP", "Other",
];
const PACKAGING = ["Bulk", "25kg", "50kg", "500kg", "600kg", "1000kg", "Other"];
const ORIGINS = ["Baltic", "Black Sea", "Arab Gulf", "North Africa", "China", "FSU", "USA", "No preference"];

export function OrderDeskBoard({ name, email }: { name: string; email: string }) {
  const [product, setProduct] = useState("");
  const [packaging, setPackaging] = useState("");
  const [origins, setOrigins] = useState<string[]>(["No preference"]);
  const [incoterm, setIncoterm] = useState("CFR");
  const [destination, setDestination] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [price, setPrice] = useState("");
  const [prepay, setPrepay] = useState(20);
  const [pallets, setPallets] = useState("no");
  const [sent, setSent] = useState<"remote" | "local" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const priceLine = useMemo(() => {
    if (price && destination) return `Price: ${currency} ${Number(price).toFixed(2)} ${incoterm} ${destination}`;
    if (destination) return `Price will be quoted ${incoterm} ${destination}`;
    return "Enter your destination and price above";
  }, [currency, destination, incoterm, price]);

  function toggleOrigin(value: string) {
    setOrigins((current) => {
      if (value === "No preference") return ["No preference"];
      const next = current.filter((item) => item !== "No preference" && item !== value);
      if (!current.includes(value)) next.push(value);
      return next.length ? next : ["No preference"];
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Order Desk</h1>
        <p className="mt-1 text-sm text-mid">Your enquiry goes directly to the Aquifert trading desk.</p>
      </div>

      {sent ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-4 text-sm leading-relaxed text-ink">
          {sent === "remote"
            ? "Enquiry submitted. The trading desk will reply with a quote."
            : "Enquiry captured in this preview. Connect Supabase to deliver it to the trading desk."}
        </p>
      ) : (
        <form
          className="space-y-5 rounded-xl border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const chosen = String(data.get("product") ?? "");
            const productName = chosen === "Other" ? String(data.get("otherProduct") ?? "").trim() : chosen;
            const pack = String(data.get("packaging") ?? "");
            const packName = pack === "Other" ? String(data.get("packagingOther") ?? "").trim() : pack;
            const notes = [
              `Name: ${String(data.get("name") ?? "").trim()}`,
              `Email: ${String(data.get("email") ?? "").trim()}`,
              `Company: ${String(data.get("company") ?? "").trim()}`,
              `Grade: ${String(data.get("grade") ?? "").trim()}`,
              `Pallets: ${pallets}`,
              `Shipping: ${String(data.get("shipFrom") ?? "")} to ${String(data.get("shipTo") ?? "")}`,
              `Target: ${currency} ${String(data.get("targetPrice") ?? "")} ${incoterm}`,
              `Prepayment: ${prepay}%`,
              `Payment: ${String(data.get("payment") ?? "")}`,
              `Frequency: ${String(data.get("frequency") ?? "")}`,
              String(data.get("notes") ?? "").trim(),
            ].filter((line) => !line.endsWith(": ") && line !== "to").join("\n");
            setError(null);
            startTransition(async () => {
              const result = await submitOrderEnquiry({
                product: productName,
                quantity: `${String(data.get("quantity") ?? "").trim()} MT · ${packName}`,
                origin: origins.join(", "),
                destination: String(data.get("destination") ?? ""),
                incoterm,
                notes,
              });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setSent(result.delivered ? "remote" : "local");
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" name="name" defaultValue={name} required />
            <Field label="Email" name="email" type="email" defaultValue={email} required />
            <Field label="Company" name="company" className="sm:col-span-2" />
          </div>

          <Section title="Product">
            <label className="block text-sm text-mid">
              Product *
              <select name="product" required value={product} onChange={(event) => setProduct(event.target.value)} className={inputClass}>
                <option value="">Select a product...</option>
                {PRODUCTS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {product === "Other" ? <Field label="Specify product" name="otherProduct" required /> : null}
            {product && product !== "Other" ? <Field label="Grade / specification" name="grade" /> : null}
          </Section>

          <Section title="Quantity and packaging">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quantity (MT) *" name="quantity" type="number" required />
              <label className="block text-sm text-mid">
                Packaging *
                <select name="packaging" required value={packaging} onChange={(event) => setPackaging(event.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {PACKAGING.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            {packaging === "Other" ? <Field label="Specify packaging" name="packagingOther" required /> : null}
            <fieldset className="mt-2">
              <legend className="text-xs text-mid">Pallets required?</legend>
              <div className="mt-2 flex gap-2">
                {(["yes", "no"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPallets(value)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${pallets === value ? "border-blue bg-blue-light text-ink" : "border-border bg-surface text-mid"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section title="Origin preference">
            <div className="flex flex-wrap gap-2">
              {ORIGINS.map((origin) => (
                <label key={origin} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${origins.includes(origin) ? "border-blue bg-blue-light text-ink" : "border-border text-mid"}`}>
                  <input type="checkbox" className="sr-only" checked={origins.includes(origin)} onChange={() => toggleOrigin(origin)} />
                  {origin}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Delivery">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-mid">
                FOB or CFR destination *
                <input name="destination" required value={destination} onChange={(event) => setDestination(event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm text-mid">
                Incoterms
                <select name="incoterm" value={incoterm} onChange={(event) => setIncoterm(event.target.value)} className={inputClass}>
                  <option>CFR</option>
                  <option>CIF</option>
                  <option>FOB</option>
                </select>
              </label>
              <Field label="Shipping period — from *" name="shipFrom" type="date" required />
              <Field label="Shipping period — to *" name="shipTo" type="date" required />
            </div>
          </Section>

          <Section title="Price and payment">
            <label className="block text-sm text-mid">
              Target price *
              <span className="mt-1 flex gap-2">
                <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm text-ink">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
                <input name="targetPrice" type="number" min="0" step="0.01" required placeholder="e.g. 485" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink" />
              </span>
              <span className="mt-1 block text-xs text-dim">{priceLine}</span>
            </label>
            <label className="mt-3 block text-sm text-mid">
              Prepayment — <span className="font-semibold text-ink">{prepay}%</span>
              <input type="range" min={0} max={100} step={10} value={prepay} onChange={(event) => setPrepay(Number(event.target.value))} className="mt-2 w-full accent-[#2e6da4]" />
              <span className="mt-1 block text-xs text-dim">A price discount is available for large prepayments. New clients typically start at 20%.</span>
            </label>
            <label className="mt-3 block text-sm text-mid">
              Payment terms *
              <select name="payment" required className={inputClass}>
                <option value="">Select...</option>
                <option value="100% TT against copy shipping documents">100% TT against copy shipping documents</option>
                <option value="LC at sight">LC at sight</option>
                <option value="Open account (existing clients only)">Open account (existing clients only)</option>
              </select>
            </label>
          </Section>

          <Section title="Additional information">
            <label className="block text-sm text-mid">
              Purchase frequency
              <select name="frequency" className={inputClass}>
                <option value="">Select...</option>
                <option value="Spot / one-off">Spot / one-off</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual contract">Annual contract</option>
              </select>
            </label>
            <label className="mt-3 block text-sm text-mid">
              Additional notes
              <textarea name="notes" rows={4} className={inputClass} />
            </label>
          </Section>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="submit" disabled={pending} className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Submitting..." : "Submit enquiry to trading desk"}
          </button>
        </form>
      )}
    </div>
  );
}

const inputClass = "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink";

function Field({ label, name, type = "text", defaultValue, required, className = "" }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean; className?: string }) {
  return (
    <label className={`block text-sm text-mid ${className}`}>
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} className={inputClass} />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg bg-s2 p-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mid">{title}</p>
      {children}
    </section>
  );
}

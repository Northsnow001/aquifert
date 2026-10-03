"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Send } from "lucide-react";
import { submitOrderEnquiry } from "@/app/hub/order-desk/actions";
import { areaClass, btnPrimary, fieldClass, hintClass, labelClass, noticeError } from "@/components/app/form";
import { countryTriggerClass } from "@/components/app/country-select";
import { PortField } from "@/components/calculators/port-field";
import { portText, type PortRecord } from "@/lib/ports";

const PRODUCTS = [
  "Amsul", "AN", "CAN", "Urea - Prilled", "Urea - Granular", "Urea - Technical", "DAP", "MAP", "TSP", "SSP", "MOP", "UAN", "NPK", "APP", "CN", "Kieserite", "Magnesium Nitrate", "MKP", "NOP", "Phos Acid", "SOP", "TMAP", "Other",
];
const PACKAGING = ["Bulk", "25kg", "50kg", "500kg", "600kg", "1000kg", "Other"];
const ORIGINS = ["Baltic", "Black Sea", "Arab Gulf", "North Africa", "China", "FSU", "USA", "No preference"];

const chip = (on: boolean) =>
  `inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-[14.5px] font-medium transition ${
    on ? "border-blue bg-blue-light text-blue" : "border-border bg-white text-mid hover:border-[#cdd7e1] hover:text-ink"
  }`;

export function OrderDeskBoard({
  name,
  email,
  success,
  ports,
  initial,
}: {
  name: string;
  email: string;
  success: string;
  ports: PortRecord[];
  initial?: { product?: string; destination?: PortRecord };
}) {
  const [product, setProduct] = useState(() => (initial?.product && PRODUCTS.includes(initial.product) ? initial.product : ""));
  const [packaging, setPackaging] = useState("");
  const [origins, setOrigins] = useState<string[]>(["No preference"]);
  const [incoterm, setIncoterm] = useState("CFR");
  const [port, setPort] = useState<PortRecord | null>(initial?.destination ?? null);
  const destination = port ? portText(port) : "";
  const [currency, setCurrency] = useState("USD");
  const [price, setPrice] = useState("");
  const [prepay, setPrepay] = useState(20);
  const [pallets, setPallets] = useState("no");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const priceLine = useMemo(() => {
    if (price && destination) return `Price: ${currency} ${Number(price).toFixed(2)} ${incoterm} ${destination}`;
    if (destination) return `Price will be quoted ${incoterm} ${destination}`;
    return "Choose your destination port and enter a price above";
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
    <div className="flex w-full flex-col gap-5">
      {sent ? (
        <div className="aq-card aq-rise flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf7f0] text-[#1f9d60]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="mt-4 max-w-md text-[16.5px] font-semibold leading-relaxed text-ink">{success}</p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setProduct("");
              setPackaging("");
              setPrice("");
            }}
            className="mt-5 h-10 rounded-full border border-border bg-white px-4 text-[15px] font-semibold text-ink hover:border-blue/35 hover:text-blue"
          >
            Send another enquiry
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const chosen = String(data.get("product") ?? "");
            const productName = chosen === "Other" ? String(data.get("otherProduct") ?? "").trim() : chosen;
            const pack = String(data.get("packaging") ?? "");
            const text = (key: string) => String(data.get(key) ?? "").trim();
            if (!port) {
              setError("Choose a destination port from the list.");
              return;
            }
            setError(null);
            startTransition(async () => {
              const result = await submitOrderEnquiry({
                name: text("name"),
                email: text("email"),
                company: text("company"),
                product: productName,
                grade: text("grade"),
                quantity: text("quantity"),
                packaging: pack === "Other" ? text("packagingOther") : pack,
                pallets,
                origins: origins.join(", "),
                destination: port.code,
                incoterm,
                shipFrom: text("shipFrom"),
                shipTo: text("shipTo"),
                currency,
                targetPrice: text("targetPrice"),
                prepayment: String(prepay),
                paymentTerms: text("payment"),
                frequency: text("frequency"),
                notes: text("notes"),
                website: text("website"),
              });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setSent(true);
            });
          }}
        >
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px opacity-0" />

          <Section title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name" defaultValue={name} autoComplete="name" required />
              <Field label="Email" name="email" type="email" defaultValue={email} autoComplete="email" required />
              <Field label="Company (optional)" name="company" autoComplete="organization" className="sm:col-span-2" />
            </div>
          </Section>

          <Section title="Product">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Product</span>
                <select name="product" required value={product} onChange={(event) => setProduct(event.target.value)} className={fieldClass}>
                  <option value="">Select a product…</option>
                  {PRODUCTS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              {product === "Other" ? <Field label="Specify product" name="otherProduct" required /> : null}
              {product && product !== "Other" ? <Field label="Grade / specification (optional)" name="grade" /> : null}
            </div>
          </Section>

          <Section title="Quantity and packaging">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity (MT)" name="quantity" type="number" inputMode="decimal" required />
              <label className="block">
                <span className={labelClass}>Packaging</span>
                <select name="packaging" required value={packaging} onChange={(event) => setPackaging(event.target.value)} className={fieldClass}>
                  <option value="">Select…</option>
                  {PACKAGING.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              {packaging === "Other" ? <Field label="Specify packaging" name="packagingOther" required /> : null}
            </div>
            <fieldset className="mt-4">
              <legend className={labelClass}>Pallets required?</legend>
              <div className="inline-flex gap-1 rounded-full bg-black/[.05] p-1">
                {(["yes", "no"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={pallets === value}
                    onClick={() => setPallets(value)}
                    className={`h-8 rounded-full px-5 text-[14.5px] font-semibold capitalize transition ${pallets === value ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid"}`}
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
                <label key={origin} className={chip(origins.includes(origin))}>
                  <input type="checkbox" className="sr-only" checked={origins.includes(origin)} onChange={() => toggleOrigin(origin)} />
                  {origin}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Delivery">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PortField
                  countryLabel="Destination country"
                  label="FOB or CFR destination port"
                  value={port}
                  onSelect={setPort}
                  ports={ports}
                  labelClass={labelClass}
                  inputClass={fieldClass}
                  countryClass={countryTriggerClass}
                  hint={<span className={hintClass}>Ports come from the Aquifert port list. If yours is missing, pick the nearest one and add the detail in the notes.</span>}
                />
              </div>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Incoterms</span>
                <select name="incoterm" value={incoterm} onChange={(event) => setIncoterm(event.target.value)} className={fieldClass}>
                  <option>CFR</option>
                  <option>CIF</option>
                  <option>FOB</option>
                </select>
              </label>
              <Field label="Shipping period from" name="shipFrom" type="date" required />
              <Field label="Shipping period to" name="shipTo" type="date" required />
            </div>
          </Section>

          <Section title="Price and payment">
            <label className="block">
              <span className={labelClass}>Target price</span>
              <span className="flex gap-2">
                <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Currency" className={`${fieldClass} w-24 shrink-0`}>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
                <input
                  name="targetPrice"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 485"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className={fieldClass}
                />
              </span>
              <span className={`${hintClass} font-mono`}>{priceLine}</span>
            </label>
            <label className="mt-5 block">
              <span className={`${labelClass} flex items-center justify-between`}>
                Prepayment <span className="rounded-full bg-blue-light px-2 py-0.5 font-mono text-[13px] font-semibold text-blue">{prepay}%</span>
              </span>
              <input type="range" min={0} max={100} step={10} value={prepay} onChange={(event) => setPrepay(Number(event.target.value))} className="mt-1 w-full accent-[#2f6fb3]" />
              <span className={hintClass}>A price discount is available for large prepayments. New clients typically start at 20%.</span>
            </label>
            <label className="mt-4 block">
              <span className={labelClass}>Payment terms</span>
              <select name="payment" required className={fieldClass}>
                <option value="">Select…</option>
                <option value="100% TT against copy shipping documents">100% TT against copy shipping documents</option>
                <option value="LC at sight">LC at sight</option>
                <option value="Open account (existing clients only)">Open account (existing clients only)</option>
              </select>
            </label>
          </Section>

          <Section title="Additional information">
            <label className="block">
              <span className={labelClass}>Purchase frequency (optional)</span>
              <select name="frequency" className={fieldClass}>
                <option value="">Select…</option>
                <option value="Spot / one-off">Spot / one-off</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual contract">Annual contract</option>
              </select>
            </label>
            <label className="mt-4 block">
              <span className={labelClass}>Additional notes (optional)</span>
              <textarea name="notes" rows={4} placeholder="Specs, destinations, timing…" className={areaClass} />
            </label>
          </Section>

          {error ? (
            <p className={noticeError}>
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          ) : null}
          <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
            <Send className="h-4 w-4" />
            {pending ? "Submitting…" : "Submit enquiry to trading desk"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  autoComplete,
  inputMode,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} autoComplete={autoComplete} inputMode={inputMode} className={fieldClass} />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="aq-card p-5">
      <h2 className="mb-4 text-[15.5px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

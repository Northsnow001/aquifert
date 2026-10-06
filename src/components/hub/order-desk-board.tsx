"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Send, X } from "lucide-react";
import { submitOrderEnquiry } from "@/app/hub/order-desk/actions";
import { areaClass, btnPrimary, fieldClass, hintClass, labelClass, noticeError } from "@/components/app/form";
import { countryTriggerClass } from "@/components/app/country-select";
import { PortField } from "@/components/calculators/port-field";
import type { PortRecord } from "@/lib/ports";

const PRODUCTS = [
  "Amsul", "AN", "CAN", "Urea - Prilled", "Urea - Granular", "Urea - Technical", "DAP", "MAP", "TSP", "SSP", "MOP", "UAN", "NPK", "APP", "CN", "Kieserite", "Magnesium Nitrate", "MKP", "NOP", "Phos Acid", "SOP", "TMAP",
];
const MAX_PRODUCTS = 10;
const MAX_PRODUCT_LENGTH = 50;

const MONTHS_AHEAD = 24;

/** This month and the next ones, as "2026-10" values with "October 2026" labels. */
function upcomingMonths() {
  const now = new Date();
  return Array.from({ length: MONTHS_AHEAD }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + index, 1));
    return { value: date.toISOString().slice(0, 7), label: date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) };
  });
}

/** Adds a typed product once; the same name in another case counts as a duplicate. */
function addProduct(current: string[], value: string) {
  const name = value.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_PRODUCT_LENGTH);
  if (!name || current.length >= MAX_PRODUCTS || current.some((item) => item.toLowerCase() === name.toLowerCase())) return current;
  return [...current, name];
}
const PACKAGING = ["Bulk", "25kg", "50kg", "500kg", "600kg", "1000kg", "Other"];
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
  const [products, setProducts] = useState<string[]>(() => (initial?.product?.trim() ? [initial.product.trim().slice(0, MAX_PRODUCT_LENGTH)] : []));
  const [draft, setDraft] = useState("");
  const productInput = useRef<HTMLInputElement>(null);
  const [packaging, setPackaging] = useState("");
  const [incoterm, setIncoterm] = useState("CFR");
  const [port, setPort] = useState<PortRecord | null>(initial?.destination ?? null);
  const [pallets, setPallets] = useState("no");
  const [customPackaging, setCustomPackaging] = useState("no");
  const [largeVolume, setLargeVolume] = useState("");
  const [wantsCall, setWantsCall] = useState("");
  const [months] = useState(upcomingMonths);
  const [shipFrom, setShipFrom] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
              setProducts([]);
              setDraft("");
              setPackaging("");
              setCustomPackaging("no");
              setShipFrom("");
              setShipTo("");
              setLargeVolume("");
              setWantsCall("");
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
            const pack = String(data.get("packaging") ?? "");
            const text = (key: string) => String(data.get(key) ?? "").trim();
            const chosen = addProduct(products, draft);
            if (!chosen.length) {
              setError("Type a product and press Enter.");
              productInput.current?.focus();
              return;
            }
            setProducts(chosen);
            setDraft("");
            if (!port) {
              setError("Choose a destination port from the list.");
              return;
            }
            if (!largeVolume || !wantsCall) {
              setError("Answer the two questions under Additional information.");
              return;
            }
            setError(null);
            startTransition(async () => {
              const result = await submitOrderEnquiry({
                name: text("name"),
                email: text("email"),
                company: text("company"),
                product: chosen.join(", "),
                grade: "",
                quantity: text("quantity"),
                packaging: pack === "Other" ? text("packagingOther") : pack,
                pallets,
                customPackaging,
                origins: "",
                destination: port.code,
                incoterm,
                shipFrom: text("shipFrom"),
                shipTo: text("shipTo"),
                currency: "",
                targetPrice: "",
                prepayment: "",
                paymentTerms: "",
                frequency: "",
                largeVolume,
                wantsCall,
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
            <label htmlFor="order-product" className={labelClass}>
              Specify product
            </label>
            <div
              onClick={() => productInput.current?.focus()}
              className="flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-border bg-white px-2 py-1.5 shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] hover:border-[#cdd7e1] focus-within:border-[rgb(47_111_179/0.6)] focus-within:shadow-[0_0_0_4px_rgb(47_111_179/0.12)]"
            >
              {products.map((item) => (
                <span key={item} className="inline-flex h-8 items-center gap-1 rounded-full border border-blue/30 bg-blue-light pl-3 pr-1 text-[14.5px] font-medium text-blue">
                  {item}
                  <button
                    type="button"
                    onClick={() => setProducts((current) => current.filter((value) => value !== item))}
                    aria-label={`Remove ${item}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-blue/70 hover:bg-blue/10 hover:text-blue"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {products.length < MAX_PRODUCTS ? (
                <input
                  ref={productInput}
                  id="order-product"
                  list="order-product-suggestions"
                  value={draft}
                  maxLength={MAX_PRODUCT_LENGTH}
                  autoComplete="off"
                  enterKeyHint="enter"
                  placeholder={products.length ? "Add another product" : "e.g. Urea, then press Enter"}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      setProducts((current) => addProduct(current, draft));
                      setDraft("");
                    } else if (event.key === "Backspace" && !draft && products.length) {
                      setProducts((current) => current.slice(0, -1));
                    }
                  }}
                  onBlur={() => {
                    if (!draft.trim()) return;
                    setProducts((current) => addProduct(current, draft));
                    setDraft("");
                  }}
                  className="h-8 min-w-[12rem] flex-1 bg-transparent px-1.5 text-[15.5px] text-ink outline-none placeholder:text-dim"
                />
              ) : null}
            </div>
            <datalist id="order-product-suggestions">
              {PRODUCTS.filter((item) => !products.includes(item)).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <p className={hintClass}>Type a product and press Enter to add it. Add as many as you need, with grade or specification if it matters.</p>
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <YesNo legend="Pallets required?" value={pallets} onChange={setPallets} />
              <YesNo legend="Customised packaging?" value={customPackaging} onChange={setCustomPackaging} />
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
              <label className="block">
                <span className={labelClass}>Preferred shipment month</span>
                <select
                  name="shipFrom"
                  required
                  value={shipFrom}
                  onChange={(event) => {
                    const value = event.target.value;
                    setShipFrom(value);
                    if (shipTo && shipTo < value) setShipTo("");
                  }}
                  className={fieldClass}
                >
                  <option value="">Select a month…</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Preferred arrival month</span>
                <select name="shipTo" required value={shipTo} onChange={(event) => setShipTo(event.target.value)} className={fieldClass}>
                  <option value="">Select a month…</option>
                  {months
                    .filter((month) => !shipFrom || month.value >= shipFrom)
                    .map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </Section>

          <Section title="Additional information">
            <div className="grid gap-4 sm:grid-cols-2">
              <YesNo legend="Can you receive / arrange > 1,000 tonnes per year?" value={largeVolume} onChange={setLargeVolume} />
              <YesNo legend="Interested in a call?" value={wantsCall} onChange={setWantsCall} />
            </div>
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

function YesNo({ legend, value, onChange }: { legend: string; value: string; onChange: (value: "yes" | "no") => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="inline-flex gap-1 rounded-full bg-black/[.05] p-1">
        {(["yes", "no"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`h-8 rounded-full px-5 text-[14.5px] font-semibold capitalize transition ${value === option ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
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

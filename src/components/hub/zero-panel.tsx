"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Clock3, ShieldCheck, Users, Zap } from "lucide-react";
import { registerZeroInterest } from "@/app/hub/order-desk/zero-actions";
import { areaClass, btnPrimary, fieldClass, noticeError } from "@/components/app/form";
import { ZERO_PRODUCTS } from "@/lib/desk-settings/types";

const PROMISES = [
  { icon: ShieldCheck, title: "Transparent cost", body: "You see the verified FOB/CFR supplier price. Freight, duties, and packaging pass through at cost, with the full document trail included." },
  { icon: Clock3, title: "Earned Express", body: "Once you complete the Green Light checklist, product is ready to load within 14 to 21 days per cycle on available channels." },
  { icon: Users, title: "Orchestrated execution", body: "10-step order-to-bill SOP. No 20-step email chains. Focused execution from sourcing to arrival, without the drama." },
  { icon: BadgeCheck, title: "No rebate guarantee", body: "Aquifert holds zero supplier rebate agreements. What you see is what we pay. Your ops fee is the only charge." },
];

const BANDS = [
  { band: "Band 1", shipments: "1 shipment", volume: "25 – 200 MT", tone: "bg-[#e8f1fa] text-[#1463a5]" },
  { band: "Band 2", shipments: "2 shipments", volume: "201 – 600 MT", tone: "bg-[#e7f6ec] text-[#1f7a45]" },
  { band: "Band 3", shipments: "3 shipments", volume: "601 – 1,500 MT", tone: "bg-[#f3ecfb] text-[#6b3fa0]" },
];

const inputClass = `${fieldClass} mt-1.5`;

type Registration = { at: string; product: string; annualVolume: string; company: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function ZeroPanel({ name, email, success, registered }: { name: string; email: string; success: string; registered: Registration | null }) {
  const [done, setDone] = useState<Registration | null>(registered);
  const [last, setLast] = useState<Registration | null>(registered);
  const [justSent, setJustSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="aq-card overflow-hidden">
      <header className="relative overflow-hidden bg-[#0f2a47] bg-[radial-gradient(120%_120%_at_100%_0%,#1e5b8f_0%,transparent_55%)] px-6 py-7 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#1463a5]/40 blur-3xl" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6baa8e] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6baa8e]" />
          </span>
          Coming soon
        </span>
        <div className="relative mt-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0f2a47]">
            <Zap className="h-5 w-5" fill="currentColor" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight">Aquifert Zero</h2>
        </div>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/80">
          Buy at <strong className="text-white">verified supplier cost</strong>. No hidden spreads. A fixed operations fee and world-class trade execution. From planning to arrival.
        </p>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-s2/60 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-light text-blue">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-mid">{body}</p>
            </div>
          ))}
        </div>

        <section>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-mid">How we charge — activity-based bands</p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-s2 text-[13px] text-mid">
                <tr>
                  <th className="px-3 py-2 font-semibold">Band</th>
                  <th className="px-3 py-2 font-semibold">Shipments / cycle</th>
                  <th className="px-3 py-2 font-semibold">Volume range</th>
                  <th className="px-3 py-2 font-semibold">Cycle</th>
                </tr>
              </thead>
              <tbody>
                {BANDS.map((row) => (
                  <tr key={row.band} className="border-t border-border text-ink">
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${row.tone}`}>{row.band}</span>
                    </td>
                    <td className="px-3 py-2.5">{row.shipments}</td>
                    <td className="px-3 py-2.5 font-mono text-[14.5px]">{row.volume}</td>
                    <td className="px-3 py-2.5">4 weeks</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-dim">
            Additional shipments beyond your band are charged at a fixed rate per cycle. Unused trades roll over when multiple months are booked. Pricing details will be confirmed on enquiry. Typical effective ops cost: low single-digit dollars per MT at scale.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-s2 p-5">
          <h3 className="text-base font-semibold text-ink">Register your interest</h3>
          {done ? (
            <div className="mt-3 rounded-lg border border-[#cdebd8] bg-[#f1faf4] px-4 py-4 text-sm text-[#1f5f3a]">
              <p className="font-semibold">{justSent ? success : `You registered interest on ${day(done.at)}.`}</p>
              <p className="mt-1 text-[14.5px]">
                {done.product} · {Number(done.annualVolume).toLocaleString("en-GB")} MT a year. {justSent ? "" : "The team will be in touch with programme details as soon as they are confirmed."}
              </p>
              <button type="button" onClick={() => setDone(null)} className="mt-3 rounded-lg border border-[#cdebd8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f7a45]">
                Update my details
              </button>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-mid">
                Aquifert Zero is coming soon. Register your interest now and we will be in touch with full programme details, pricing, and availability as soon as they are confirmed.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const value = (key: string) => String(data.get(key) ?? "").trim();
                  setError(null);
                  start(async () => {
                    const result = await registerZeroInterest({
                      name: value("name"),
                      email: value("email"),
                      company: value("company"),
                      annualVolume: value("annualVolume"),
                      product: value("product"),
                      notes: value("notes"),
                      website: value("website"),
                    });
                    if (!result.ok) {
                      setError(result.message);
                      return;
                    }
                    const saved = { at: result.at, product: value("product"), annualVolume: value("annualVolume"), company: value("company") };
                    setJustSent(true);
                    setDone(saved);
                    setLast(saved);
                  });
                }}
              >
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px opacity-0" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[14.5px] font-medium text-mid">
                    Full name *
                    <input name="name" required defaultValue={name} className={inputClass} />
                  </label>
                  <label className="block text-[14.5px] font-medium text-mid">
                    Company *
                    <input name="company" required defaultValue={last?.company} placeholder="Company name" className={inputClass} />
                  </label>
                  <label className="block text-[14.5px] font-medium text-mid">
                    Email *
                    <input name="email" type="email" required defaultValue={email} className={inputClass} />
                  </label>
                  <label className="block text-[14.5px] font-medium text-mid">
                    Estimated annual volume (MT) *
                    <input name="annualVolume" type="number" min="1" step="1" required defaultValue={last?.annualVolume} placeholder="e.g. 5000" className={inputClass} />
                  </label>
                </div>
                <label className="block text-[14.5px] font-medium text-mid">
                  Primary product interest *
                  <select name="product" required defaultValue={last?.product ?? ""} className={inputClass}>
                    <option value="">Select a product...</option>
                    {ZERO_PRODUCTS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[14.5px] font-medium text-mid">
                  Anything we should know
                  <textarea name="notes" rows={3} placeholder="Destinations, timing, current suppliers…" className={`${areaClass} mt-1.5`} />
                </label>
                {error ? <p className={noticeError}>{error}</p> : null}
                <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
                  {pending ? "Registering…" : "Register interest"}
                </button>
              </form>
            </>
          )}
          <p className="mt-4 flex items-center gap-2 text-xs text-mid">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#d97706]" />
            12 pilot slots per quarter. Fast-start: commit within 7 days of being offered a slot.
          </p>
        </section>
      </div>
    </div>
  );
}

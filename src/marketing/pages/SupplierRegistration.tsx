"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/marketing/components/shared/Logo";
import { Button } from "@/marketing/components/ui/button";
import { SUPPLIER_PRODUCTS, type SupplierChannel } from "@/lib/suppliers/registration";

const QR_SRC = "/brand/wechat-qr.jpg";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";
const labelCls = "block text-[13px] font-semibold text-navy-900";

type TextFields = "email" | "company" | "country" | "contact" | "load_ports" | "website";

export default function SupplierRegistration({ code, email: initialEmail }: { code: string; email: string }) {
  const [form, setForm] = useState<Record<TextFields, string>>({
    email: initialEmail.trim(),
    company: "",
    country: "",
    contact: "",
    load_ports: "",
    website: "",
  });
  const [products, setProducts] = useState<string[]>([]);
  const [channel, setChannel] = useState<SupplierChannel>("wechat");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (key: TextFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleProduct = (value: string) =>
    setProducts((list) => (list.includes(value) ? list.filter((p) => p !== value) : [...list, value]));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!products.length) {
      setError("Choose at least one product.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/supplier-registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, code, products, channel, consent }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "We could not save your registration. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your registration. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Logo size={36} />

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Register as an Aquifert supplier</h1>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-navy-900">Scan with WeChat to follow Aquifert</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={QR_SRC}
            alt="Aquifert WeChat QR code"
            width={280}
            height={280}
            className="mx-auto mt-5 h-[280px] w-[280px] rounded-lg border border-slate-200 bg-white p-2"
          />
          <p className="mt-4 text-[13px] text-slate-500">
            On your phone? Take a screenshot, open WeChat, tap Scan, then choose the picture from your photos.
          </p>
        </section>

        {done ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-live="polite">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-navy-900">Thank you</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Your details are saved. If you have not yet, scan the QR code above with WeChat to follow Aquifert.
            </p>
          </section>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-navy-900">Your details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="sr-company" className={labelCls}>Company name</label>
                <input id="sr-company" autoComplete="organization" value={form.company} onChange={set("company")} className={`${inputCls} mt-1`} required />
              </div>
              <div>
                <label htmlFor="sr-country" className={labelCls}>Country</label>
                <input id="sr-country" autoComplete="country-name" value={form.country} onChange={set("country")} className={`${inputCls} mt-1`} required />
              </div>
              <div>
                <label htmlFor="sr-contact" className={labelCls}>Contact person</label>
                <input id="sr-contact" autoComplete="name" value={form.contact} onChange={set("contact")} className={`${inputCls} mt-1`} required />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="sr-email" className={labelCls}>Email</label>
                <input
                  id="sr-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  className={`${inputCls} mt-1`}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <fieldset className="mt-6">
              <legend className={labelCls}>Products you supply</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {SUPPLIER_PRODUCTS.map((p) => (
                  <label
                    key={p}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-navy-900 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60"
                  >
                    <input type="checkbox" checked={products.includes(p)} onChange={() => toggleProduct(p)} className="h-4 w-4 accent-teal-600" />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <label htmlFor="sr-ports" className={labelCls}>Load ports</label>
              <textarea
                id="sr-ports"
                value={form.load_ports}
                onChange={set("load_ports")}
                rows={2}
                className={`${inputCls} mt-1 h-auto py-2.5`}
                placeholder="e.g. Qingdao, Lianyungang"
                required
              />
            </div>

            <fieldset className="mt-6">
              <legend className={labelCls}>Preferred contact channel</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["wechat", "WeChat"],
                    ["email", "Email"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-navy-900 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/60"
                  >
                    <input type="radio" name="channel" checked={channel === value} onChange={() => setChannel(value)} className="h-4 w-4 accent-teal-600" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="sr-website">Website</label>
              <input id="sr-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
                required
              />
              I agree that Aquifert may contact me on WeChat and by email about price requests and orders.
            </label>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending} className="mt-6 w-full bg-teal-500 text-white hover:bg-teal-400" size="lg">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Submit"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

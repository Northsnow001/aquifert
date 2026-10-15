"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/marketing/components/shared/Logo";
import { Button } from "@/marketing/components/ui/button";

const QR_SRC = "/brand/wechat-qr.jpg";

export default function SupplierRegistration({ code, email }: { code: string; email: string }) {
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/supplier-registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, email, consent, website }),
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

          {done ? (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700" aria-live="polite">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Thank you. Your registration is received.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 text-left">
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="sr-website">Website</label>
                <input id="sr-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-slate-700">
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

              <Button type="submit" disabled={pending} className="mt-5 w-full bg-teal-500 text-white hover:bg-teal-400" size="lg">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Submit"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

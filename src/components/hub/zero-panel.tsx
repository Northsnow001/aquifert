"use client";

import { useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2, CircleAlert, Send, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { registerZeroInterest } from "@/app/hub/order-desk/zero-actions";
import { areaClass, btnSecondary, fieldClass, labelClass, noticeError } from "@/components/app/form";
import { ZERO_PRODUCTS } from "@/lib/desk-settings/types";
import { programmeName, ZERO_PROGRAMMES, type ZeroProgrammeId } from "@/lib/zero-types";

type Registration = { at: string; programme: ZeroProgrammeId | null; product: string; annualVolume: string; company: string };

const noop = () => () => {};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function ZeroPanel({
  name,
  email,
  success,
  registered,
  compare,
}: {
  name: string;
  email: string;
  success: string;
  registered: Registration | null;
  compare?: ReactNode;
}) {
  const [done, setDone] = useState<Registration | null>(registered);
  const [dialog, setDialog] = useState<ZeroProgrammeId | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl bg-navy-50 px-4 py-2.5 text-[14.5px] text-navy-700">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700 ring-1 ring-teal-100">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
          </span>
          Coming soon
        </span>
        <span className="min-w-0 flex-1">Choose the programme that fits how you buy and register your interest. The desk confirms pricing and availability with you.</span>
      </p>

      {done ? (
        <div className="aq-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          <span className="aq-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-[15px]">
            <p className="font-semibold text-ink">
              You registered interest{done.programme ? ` in ${programmeName(done.programme)}` : ""} on {day(done.at)}.
            </p>
            <p className="text-mid">
              {done.product} · {Number(done.annualVolume).toLocaleString("en-GB")} MT a year. The team will be in touch as soon as programme details are confirmed.
            </p>
          </div>
          <button type="button" onClick={() => setDialog(done.programme ?? "harvest")} className={`${btnSecondary} shrink-0`}>
            Update my details
          </button>
        </div>
      ) : null}

      <div className="aq-stagger grid gap-5 pt-3 sm:grid-cols-2">
        {ZERO_PROGRAMMES.map((programme) => {
          const mine = done?.programme === programme.id;
          const analytics = programme.id === "analytics";
          const frame = mine
            ? "ring-2 ring-[#2fa865]"
            : programme.popular
              ? "border-2 border-teal-500 shadow-[0_18px_40px_-22px_rgb(79_127_114/0.7)]"
              : analytics
                ? "border-2 border-navy-400"
                : "";
          const badge = mine ? "Registered" : programme.popular ? "Most popular" : null;
          return (
            <section key={programme.id} aria-label={programme.name} className={`aq-card relative flex flex-col p-6 transition-transform duration-200 hover:-translate-y-0.5 ${frame}`}>
              {badge ? (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white shadow-sm ${
                    mine ? "bg-[#2fa865]" : "bg-teal-500"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
              <h2 className="text-[18px] font-bold text-ink">{programme.name}</h2>
              <p className="mt-0.5 text-[13.5px] text-dim">{programme.tagline}</p>
              <ul className="mt-4 space-y-2 text-[15px]">
                {programme.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" aria-hidden /> {feature}
                  </li>
                ))}
                {programme.missing.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[#a3b0bd]">
                    <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {feature} <span className="sr-only">(not included)</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={() => setDialog(programme.id)}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[15.5px] font-semibold transition active:scale-[0.98] ${
                    mine
                      ? "border border-[#2fa865] bg-white text-[#1f7a45] hover:bg-[#f1faf4]"
                      : programme.popular
                        ? "bg-teal-500 text-white shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] hover:bg-teal-600"
                        : "bg-navy-600 text-white shadow-[0_8px_18px_-10px_rgb(37_79_118/0.9)] hover:bg-navy-700"
                  }`}
                >
                  {mine ? <Check className="h-4 w-4" aria-hidden /> : null}
                  {mine ? "Update my details" : `Register for ${programme.name}`}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div>
        {compare}
        <p className="mt-4 flex items-center gap-2 text-[13.5px] text-mid">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#d97706]" />
          12 pilot slots per quarter. Fast-start: commit within 7 days of being offered a slot.
        </p>
      </div>

      {dialog ? (
        <RegisterDialog key={dialog} initial={dialog} name={name} email={email} last={done} success={success} onSaved={setDone} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}

function RegisterDialog({
  initial,
  name,
  email,
  last,
  success,
  onSaved,
  onClose,
}: {
  initial: ZeroProgrammeId;
  name: string;
  email: string;
  last: Registration | null;
  success: string;
  onSaved: (registration: Registration) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ZeroProgrammeId>(initial);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const current = ZERO_PROGRAMMES.find((item) => item.id === selected)!;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="aq-app fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="zero-dialog-title">
      <button type="button" aria-label="Close" className="aq-backdrop absolute inset-0 cursor-default bg-[#0b1e2d]/50" onClick={onClose} />
      <div className="aq-sheet aq-safe-bottom relative flex max-h-[92dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-2xl sm:rounded-[22px]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="zero-dialog-title" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <Zap className="h-5 w-5 text-navy-600" fill="currentColor" aria-hidden /> Register interest in {current.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-mid hover:bg-s2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1f8a4c]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-[15.5px] leading-relaxed text-ink" role="status">
              {success}
            </p>
            <button type="button" onClick={onClose} className="mt-2 inline-flex h-10 items-center rounded-full bg-navy-600 px-5 text-[15px] font-semibold text-white hover:bg-navy-700">
              Close
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 overflow-y-auto px-5 py-5"
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
                  programme: selected,
                  annualVolume: value("annualVolume"),
                  product: value("product"),
                  notes: value("notes"),
                  website: value("website"),
                });
                if (!result.ok) {
                  setError(result.message);
                  toast.error(result.message);
                  return;
                }
                toast.success(success);
                onSaved({ at: result.at, programme: selected, product: value("product"), annualVolume: value("annualVolume"), company: value("company") });
                setSent(true);
              });
            }}
          >
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px opacity-0" />
            <fieldset>
              <legend className={labelClass}>Programme</legend>
              <div className="grid grid-cols-2 gap-2">
                {ZERO_PROGRAMMES.map((item) => {
                  const active = item.id === selected;
                  return (
                    <label
                      key={item.id}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${
                        active ? "border-teal-500 bg-teal-50 shadow-[0_0_0_1px_var(--color-teal-500)]" : "border-border hover:border-navy-300"
                      }`}
                    >
                      <input type="radio" name="programme" value={item.id} checked={active} onChange={() => setSelected(item.id)} className="sr-only" />
                      <span className="block text-[15px] font-semibold text-ink">{item.name}</span>
                      <span className="block text-[12px] leading-snug text-dim">{item.tagline}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="z-name" className={labelClass}>
                  Full name *
                </label>
                <input id="z-name" name="name" required autoComplete="name" defaultValue={name} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="z-company" className={labelClass}>
                  Company *
                </label>
                <input id="z-company" name="company" required autoComplete="organization" defaultValue={last?.company} placeholder="Company name" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="z-email" className={labelClass}>
                  Email *
                </label>
                <input id="z-email" name="email" type="email" required autoComplete="email" defaultValue={email} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="z-volume" className={labelClass}>
                  Estimated annual volume (MT) *
                </label>
                <input id="z-volume" name="annualVolume" type="number" min="1" step="1" required defaultValue={last?.annualVolume} placeholder="e.g. 5000" className={fieldClass} />
              </div>
            </div>
            <div>
              <label htmlFor="z-product" className={labelClass}>
                Primary product interest *
              </label>
              <select id="z-product" name="product" required defaultValue={last?.product ?? ""} className={fieldClass}>
                <option value="">Select a product...</option>
                {ZERO_PRODUCTS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="z-notes" className={labelClass}>
                Anything we should know
              </label>
              <textarea id="z-notes" name="notes" rows={3} maxLength={2000} placeholder="Destinations, timing, current suppliers…" className={areaClass} />
            </div>

            {error ? (
              <p role="alert" className={noticeError}>
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-5 text-[15.5px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Send className="h-4 w-4" /> {pending ? "Registering…" : "Register interest"}
            </button>
            <p className="text-center text-[12.5px] leading-relaxed text-dim">No payment now. The desk confirms pricing and availability before anything is agreed.</p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

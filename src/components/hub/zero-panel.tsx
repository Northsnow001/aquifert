"use client";

import { useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, CheckCircle2, CircleAlert, ListChecks, PhoneCall, Send, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { markZeroCallBooked, registerZeroInterest } from "@/app/hub/order-desk/zero-actions";
import { areaClass, btnSecondary, fieldClass, labelClass, noticeError } from "@/components/app/form";
import { CalendlyFrame } from "@/components/hub/calendly-frame";
import { MEMBERSHIP_OFFERS, offerState } from "@/lib/aq-modules/membership";
import { calendlyLink } from "@/lib/calendly";
import { ZERO_PRODUCTS } from "@/lib/desk-settings/types";
import type { Plan } from "@/lib/session-shared";
import { programmeName, ZERO_NEXT_STEP, ZERO_PROGRAMMES, type ZeroIntent, type ZeroProgrammeId, type ZeroSummary } from "@/lib/zero-types";

const noop = () => () => {};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const CALL_BOOKED = "Calendly has emailed you the invite. Early callers get discounted access when Aquifert Zero goes live.";

const INTENTS: Array<{ id: ZeroIntent; title: string; detail: string; icon: typeof ListChecks; badge?: string }> = [
  { id: "waitlist", title: "Join the waitlist", detail: "We email you as soon as Aquifert Zero is live.", icon: ListChecks },
  { id: "call", title: "Book a call", detail: "Pick a time in the desk calendar and lock in early discounted access.", icon: PhoneCall, badge: "Early discount" },
];

export function ZeroPanel({
  name,
  email,
  plan,
  admin,
  success,
  registered,
  compare,
}: {
  name: string;
  email: string;
  plan: Plan;
  admin: boolean;
  success: string;
  registered: ZeroSummary | null;
  compare?: ReactNode;
}) {
  const [done, setDone] = useState<ZeroSummary | null>(registered);
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
              {done.intent === "call" ? (done.booked ? "You booked a call" : "You asked for a call") : "You joined the waitlist"}
              {done.programme ? ` for ${programmeName(done.programme)}` : ""} on {day(done.at)}.
            </p>
            <p className="text-mid">
              {done.product} · {Number(done.annualVolume).toLocaleString("en-GB")} MT a year.{" "}
              {done.intent === "call" ? (done.booked ? CALL_BOOKED : "You have not picked a call time yet.") : ZERO_NEXT_STEP.waitlist}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {done.intent === "call" && !done.booked ? (
              <a
                href={calendlyLink({ name, email, campaign: "aquifert-zero", content: done.programme ?? "" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-teal-500 px-4 text-[15px] font-semibold text-white no-underline hover:bg-teal-600"
              >
                <CalendarClock className="h-4 w-4" aria-hidden /> Pick a call time
              </a>
            ) : null}
            <button type="button" onClick={() => setDialog(done.programme ?? "harvest")} className={btnSecondary}>
              Update my details
            </button>
          </div>
        </div>
      ) : null}

      <div className="aq-stagger grid gap-5 pt-3 sm:grid-cols-2">
        {ZERO_PROGRAMMES.map((programme) => {
          const offer = MEMBERSHIP_OFFERS.find((item) => item.id === programme.id);
          const state = offer ? offerState(offer, { plan, admin }) : "open";
          const owned = state !== "open";
          const mine = !owned && done?.programme === programme.id;
          const analytics = programme.id === "analytics";
          const frame =
            mine || owned
              ? "ring-2 ring-[#2fa865]"
              : programme.popular
                ? "border-2 border-teal-500 shadow-[0_18px_40px_-22px_rgb(79_127_114/0.7)]"
                : analytics
                  ? "border-2 border-navy-400"
                  : "";
          const badge = state === "current" ? "Current plan" : state === "included" ? "Included in your plan" : mine ? "Registered" : programme.popular ? "Most popular" : null;
          return (
            <section key={programme.id} aria-label={programme.name} className={`aq-card relative flex flex-col p-6 transition-transform duration-200 hover:-translate-y-0.5 ${frame}`}>
              {badge ? (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white shadow-sm ${
                    mine || owned ? "bg-[#2fa865]" : "bg-teal-500"
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
                {owned ? (
                  <Link
                    href="/hub/analytics"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#2fa865] bg-[#f1faf4] px-4 py-2 text-center text-[15px] font-semibold leading-snug text-[#1f7a45] no-underline transition hover:bg-[#e3f5ea] active:scale-[0.98]"
                  >
                    Open {programme.name}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDialog(programme.id)}
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[15px] font-semibold leading-snug transition active:scale-[0.98] ${
                      mine
                        ? "border border-[#2fa865] bg-white text-[#1f7a45] hover:bg-[#f1faf4]"
                        : programme.popular
                          ? "bg-teal-500 text-white shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] hover:bg-teal-600"
                          : "bg-navy-600 text-white shadow-[0_8px_18px_-10px_rgb(37_79_118/0.9)] hover:bg-navy-700"
                    }`}
                  >
                    {mine ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                    {mine ? "Update my details" : `Register for ${programme.name}`}
                  </button>
                )}
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
        <ZeroRegisterDialog key={dialog} initial={dialog} name={name} email={email} last={done} success={success} onSaved={setDone} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}

type Step = "form" | "book" | "done";

export function ZeroRegisterDialog({
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
  last: ZeroSummary | null;
  success: string;
  onSaved: (registration: ZeroSummary) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ZeroProgrammeId>(initial);
  const [intent, setIntent] = useState<ZeroIntent>(last?.intent ?? "waitlist");
  const [step, setStep] = useState<Step>("form");
  const [saved, setSaved] = useState<ZeroSummary | null>(null);
  const [contact, setContact] = useState({ name, email });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const current = ZERO_PROGRAMMES.find((item) => item.id === selected)!;
  const booking = step === "book";

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

  const onBooked = (inviteeUri: string) => {
    if (!saved) return;
    const next = { ...saved, booked: true };
    setSaved(next);
    onSaved(next);
    setStep("done");
    toast.success("Call booked.");
    void markZeroCallBooked(inviteeUri);
  };

  if (!mounted) return null;

  const title = booking ? "Pick a call time" : `Register interest in ${current.name}`;

  return createPortal(
    <div className="aq-app fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="zero-dialog-title">
      <button type="button" aria-label="Close" className="aq-backdrop absolute inset-0 cursor-default bg-[#0b1e2d]/50" onClick={onClose} />
      <div
        className={`aq-sheet aq-safe-bottom relative flex w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-2xl sm:rounded-[22px] ${
          booking ? "h-[92dvh] max-w-[980px] sm:h-[min(88vh,800px)]" : "max-h-[92dvh] max-w-[540px]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="zero-dialog-title" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            {booking ? <CalendarClock className="h-5 w-5 text-navy-600" aria-hidden /> : <Zap className="h-5 w-5 text-navy-600" fill="currentColor" aria-hidden />} {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-mid hover:bg-s2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {booking ? (
          <>
            <p className="border-b border-border bg-[#f1faf4] px-5 py-2.5 text-[14px] text-[#1f7a45]">
              Your details are saved. Choose a slot below to finish booking. If you close this, the link is in your confirmation email.
            </p>
            <CalendlyFrame name={contact.name} email={contact.email} campaign="aquifert-zero" content={selected} onScheduled={onBooked} className="min-h-0 flex-1" />
          </>
        ) : step === "done" && saved ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1f8a4c]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div role="status">
              <p className="text-[17px] font-semibold text-ink">{saved.intent === "call" ? "Your call is booked" : "You're on the waitlist"}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-mid">{saved.intent === "call" ? CALL_BOOKED : ZERO_NEXT_STEP.waitlist}</p>
              <p className="mt-3 text-[13.5px] text-dim">{success}</p>
            </div>
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
                  intent,
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
                const summary: ZeroSummary = {
                  at: result.at,
                  programme: selected,
                  intent,
                  booked: false,
                  product: value("product"),
                  annualVolume: value("annualVolume"),
                  company: value("company"),
                };
                setSaved(summary);
                onSaved(summary);
                setContact({ name: value("name"), email: value("email") });
                if (intent === "call") {
                  setStep("book");
                } else {
                  toast.success("You're on the waitlist.");
                  setStep("done");
                }
              });
            }}
          >
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px opacity-0" />
            <IntentChoice value={intent} onChange={setIntent} />

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
              {intent === "call" ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {pending ? "Saving…" : intent === "call" ? "Continue to pick a time" : "Join the waitlist"}
            </button>
            <p className="text-center text-[12.5px] leading-relaxed text-dim">No payment now. The desk confirms pricing and availability before anything is agreed.</p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

function IntentChoice({ value, onChange }: { value: ZeroIntent; onChange: (intent: ZeroIntent) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>How would you like to start?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {INTENTS.map((item) => {
          const active = item.id === value;
          const Icon = item.icon;
          return (
            <label
              key={item.id}
              className={`relative flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${
                active ? "border-navy-600 bg-navy-50 shadow-[0_0_0_1px_var(--color-navy-600)]" : "border-border hover:border-navy-300"
              }`}
            >
              <input type="radio" name="intent" value={item.id} checked={active} onChange={() => onChange(item.id)} className="sr-only" />
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-navy-600" : "text-dim"}`} aria-hidden />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-ink">
                  {item.title}
                  {item.badge ? <span className="rounded-full bg-[#fff4de] px-2 py-px text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9a5b00]">{item.badge}</span> : null}
                </span>
                <span className="block text-[12px] leading-snug text-dim">{item.detail}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

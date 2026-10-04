"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, CheckCircle2, CircleAlert, Crown, Send, X } from "lucide-react";
import { toast } from "sonner";
import { requestPlan } from "@/app/hub/account/membership/actions";
import { areaClass, fieldClass, hintClass, labelClass, noticeError } from "@/components/app/form";
import { useI18n } from "@/components/app/i18n";
import { AccountIntro } from "@/components/hub/kit";
import { ZeroRegisterDialog } from "@/components/hub/zero-panel";
import { MEMBERSHIP_OFFERS, offerState, type MembershipOffer, type MembershipTier } from "@/lib/aq-modules/membership";
import type { Plan } from "@/lib/session-shared";
import type { ZeroSummary } from "@/lib/zero-types";

type OfferId = MembershipOffer["id"];

const MESSAGE_MAX = 1000;
const noop = () => () => {};
const TIER_OFFERS = MEMBERSHIP_OFFERS.filter((offer) => offer.tier);

export function MembershipBoard({
  plan,
  admin = false,
  zero = null,
  currentTier,
  initialOffer,
  source,
}: {
  plan: Plan;
  admin?: boolean;
  /** Set while Aquifert Zero registrations are open: AQ Zero tiers then go to the waitlist or a Calendly call. */
  zero?: { name: string; email: string; success: string; last: ZeroSummary | null } | null;
  /** The tier from the member's last completed AQ ZERO request, when known. */
  currentTier: MembershipTier | null;
  initialOffer: OfferId | null;
  source: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [checkout, setCheckout] = useState<OfferId | null>(initialOffer);

  const stateOf = (offer: MembershipOffer) => offerState(offer, { plan, admin, currentTier });

  return (
    <>
      <AccountIntro description={t("mem.subtitle")} />

      {plan === "core" ? (
        <p className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-navy-50 px-4 py-2.5 text-[14.5px] text-navy-700">
          <Crown className="h-4 w-4 shrink-0 text-[#d9951f]" aria-hidden />
          <span className="min-w-0 flex-1">{t("mem.freeNote")}</span>
          <Link href="/hub/contact?topic=Membership" className="font-semibold text-blue no-underline hover:underline">
            {t("mem.talk")}
          </Link>
        </p>
      ) : null}

      <div className="@container">
      <div className="aq-stagger grid gap-5 pt-3 @xl:grid-cols-2 @5xl:grid-cols-4">
        {MEMBERSHIP_OFFERS.map((offer) => {
          const state = stateOf(offer);
          const analytics = offer.plan === "growth";
          const shortName = offer.tier ? offer.name.replace(/^AQ Zero /, "") : offer.name;
          const frame =
            state !== "open"
              ? "ring-2 ring-[#2fa865]"
              : offer.popular
                ? "border-2 border-teal-500 shadow-[0_18px_40px_-22px_rgb(79_127_114/0.7)]"
                : analytics
                  ? "border-2 border-navy-400"
                  : "";
          const badge = state === "current" ? t("mem.current") : state === "included" ? t("mem.included") : offer.popular ? t("mem.popular") : null;
          const action = plan === "enterprise" && offer.tier ? "mem.switch" : "mem.select";
          const buttonBase =
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[15px] font-semibold leading-snug transition active:scale-[0.98]";
          return (
            <section key={offer.id} aria-label={offer.name} className={`aq-card relative flex flex-col p-6 transition-transform duration-200 hover:-translate-y-0.5 ${frame}`}>
              {badge ? (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white shadow-sm ${
                    state === "open" ? "bg-teal-500" : "bg-[#2fa865]"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
              <h2 className="text-[18px] font-bold text-ink">{offer.name}</h2>
              <p className="mt-0.5 text-[13.5px] text-dim">{offer.tagline}</p>
              <ul className="mt-5 space-y-2 text-[15px]">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" aria-hidden /> {feature}
                  </li>
                ))}
                {offer.missing.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[#a3b0bd]">
                    <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {feature} <span className="sr-only">(not included)</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {state === "open" ? (
                  <button
                    type="button"
                    onClick={() => setCheckout(offer.id)}
                    aria-label={t(action, { name: offer.name })}
                    className={`${buttonBase} text-white ${
                      offer.popular
                        ? "bg-teal-500 shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] hover:bg-teal-600"
                        : "bg-navy-600 shadow-[0_8px_18px_-10px_rgb(37_79_118/0.9)] hover:bg-navy-700"
                    }`}
                  >
                    {t(action, { name: shortName })}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                ) : analytics ? (
                  <Link href="/hub/analytics" className={`${buttonBase} border border-[#2fa865] bg-[#f1faf4] text-[#1f7a45] no-underline hover:bg-[#e3f5ea]`}>
                    {t("mem.open", { name: offer.name })}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                ) : (
                  <p className={`${buttonBase} border border-[#2fa865] bg-[#f1faf4] text-[#1f7a45]`}>
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                    {t("mem.current")}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      </div>

      {checkout && zero && checkout !== "analytics" ? (
        <ZeroRegisterDialog
          key={checkout}
          initial={checkout}
          name={zero.name}
          email={zero.email}
          last={zero.last}
          success={zero.success}
          onSaved={() => router.refresh()}
          onClose={() => setCheckout(null)}
        />
      ) : checkout ? (
        <RequestDialog
          key={checkout}
          offerId={checkout}
          plan={plan}
          currentTier={currentTier}
          source={source}
          onClose={() => setCheckout(null)}
        />
      ) : null}
    </>
  );
}

function RequestDialog({
  offerId,
  plan,
  currentTier,
  source,
  onClose,
}: {
  offerId: OfferId;
  plan: Plan;
  currentTier: MembershipTier | null;
  source: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<OfferId>(offerId);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const offer = MEMBERSHIP_OFFERS.find((item) => item.id === selected)!;
  const unchanged = offer.tier ? plan === "enterprise" && currentTier === offer.tier : plan === offer.plan;
  const mounted = useSyncExternalStore(noop, () => true, () => false);

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
    <div className="aq-app fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="membership-dialog-title">
      <button type="button" aria-label={t("mem.close")} className="aq-backdrop absolute inset-0 cursor-default bg-[#0b1e2d]/50" onClick={onClose} />
      <div className="aq-sheet aq-safe-bottom relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-2xl sm:rounded-[22px]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="membership-dialog-title" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <Crown className="h-5 w-5 text-navy-600" aria-hidden /> {t("mem.request", { name: offer.name })}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("mem.close")} className="flex h-8 w-8 items-center justify-center rounded-full text-mid hover:bg-s2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1f8a4c]">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-[15.5px] leading-relaxed text-ink" role="status">
              {t("mem.sent", { email: sent })}
            </p>
            <button type="button" onClick={onClose} className="mt-2 inline-flex h-10 items-center rounded-full bg-navy-600 px-5 text-[15px] font-semibold text-white hover:bg-navy-700">
              {t("mem.close")}
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 overflow-y-auto px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setError(null);
              startTransition(async () => {
                const result = await requestPlan({
                  requestedPlan: offer.plan,
                  tier: offer.tier,
                  company: String(data.get("company") ?? ""),
                  message,
                  source,
                });
                if (!result.ok) {
                  setError(result.message);
                  toast.error(result.message);
                  return;
                }
                toast.success(t("mem.sent", { email: result.email }));
                setSent(result.email);
              });
            }}
          >
            {offer.tier ? (
              <fieldset>
                <legend className={labelClass}>{t("mem.tier")}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {TIER_OFFERS.map((item) => {
                    const active = item.id === selected;
                    return (
                      <label
                        key={item.id}
                        className={`cursor-pointer rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${
                          active ? "border-teal-500 bg-teal-50 shadow-[0_0_0_1px_var(--color-teal-500)]" : "border-border hover:border-navy-300"
                        }`}
                      >
                        <input type="radio" name="tier" value={item.id} checked={active} onChange={() => setSelected(item.id)} className="sr-only" />
                        <span className="block text-[15px] font-semibold text-ink">{item.name}</span>
                        <span className="block text-[12px] leading-snug text-dim">{item.tagline}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <div className="rounded-xl bg-s2 p-3.5">
              <p className="text-[15.5px] font-bold text-ink">{offer.name}</p>
              <p className="mt-0.5 text-[13.5px] text-dim">{offer.tagline}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-mid">The desk confirms pricing with you before anything changes.</p>
            </div>

            <div>
              <label htmlFor="m-company" className={labelClass}>
                {t("mem.company")}
              </label>
              <input id="m-company" name="company" autoComplete="organization" maxLength={120} placeholder="e.g. Fenland Growers Ltd" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="m-message" className={labelClass}>
                {t("mem.message")}
              </label>
              <textarea
                id="m-message"
                rows={3}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Monthly tonnage, the products you buy, when you would like to start."
                className={areaClass}
              />
              <p className={`${hintClass} text-end tabular-nums`}>
                {message.length} / {MESSAGE_MAX}
              </p>
            </div>

            {error ? (
              <p role="alert" className={noticeError}>
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending || unchanged}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-5 text-[15.5px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] transition hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Send className="h-4 w-4" /> {pending ? t("mem.sending") : t("mem.send")}
            </button>
            <p className="text-center text-[12.5px] leading-relaxed text-dim">{t("mem.noPayment")}</p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

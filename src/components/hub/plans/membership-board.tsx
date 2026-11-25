"use client";

import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Crown, X } from "lucide-react";
import { startCheckout, openBillingPortal } from "@/app/hub/billing/actions";
import { useI18n } from "@/components/app/i18n";
import { AccountIntro } from "@/components/hub/kit";
import { MEMBERSHIP_OFFERS, offerState, type MembershipOffer, type MembershipTier } from "@/lib/aq-modules/membership";
import type { Plan } from "@/lib/session-shared";
import type { ZeroSummary } from "@/lib/zero-types";

type OfferId = MembershipOffer["id"];

export function MembershipBoard({
  plan,
  currentTier,
}: {
  plan: Plan;
  admin?: boolean;
  /** Kept so existing callers still compile. Checkout replaced the waitlist dialog. */
  zero?: { name: string; email: string; success: string; last: ZeroSummary | null } | null;
  currentTier: MembershipTier | null;
  initialOffer?: OfferId | null;
  source?: string;
}) {
  const { t } = useI18n();
  const stateOf = (offer: MembershipOffer) => offerState(offer, { plan, currentTier });

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
            const shortName = offer.tier ? offer.name.replace(/^AQ Zero /, "") : offer.name;
            const frame = state !== "open" ? "ring-2 ring-[#2fa865]" : offer.popular ? "border-2 border-teal-500 shadow-[0_18px_40px_-22px_rgb(79_127_114/0.7)]" : offer.plan === "growth" ? "border-2 border-navy-400" : "";
            const badge = state === "current" ? t("mem.current") : state === "included" ? t("mem.included") : offer.popular ? t("mem.popular") : null;
            const action = plan === "enterprise" && offer.tier ? "mem.switch" : "mem.select";
            const buttonBase = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[15px] font-semibold leading-snug transition active:scale-[0.98]";
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
                    <form action={startCheckout}>
                      <input type="hidden" name="offer" value={offer.id} />
                      <button
                        type="submit"
                        aria-label={t(action, { name: offer.name })}
                        className={`${buttonBase} text-white ${
                          offer.popular ? "bg-teal-500 shadow-[0_8px_18px_-10px_rgb(79_127_114/0.9)] hover:bg-teal-600" : "bg-navy-600 shadow-[0_8px_18px_-10px_rgb(37_79_118/0.9)] hover:bg-navy-700"
                        }`}
                      >
                        {t(action, { name: shortName })}
                        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    </form>
                  ) : (
                    <form action={openBillingPortal}>
                      <button type="submit" className={`${buttonBase} border border-[#2fa865] bg-[#f1faf4] text-[#1f7a45]`}>
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                        {t("mem.current")}
                      </button>
                    </form>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Bell, BookOpen, Check, LineChart, Newspaper, Scale, Ship, X } from "lucide-react";
import { SalesHero } from "@/components/hub/sales-hero";
import { ClosingCta, CrossSell, heroGhost, heroPrimary, PlanBadge } from "@/components/hub/plans/sales";
import { getHubAccess } from "@/lib/aq-modules/access";
import { MEMBERSHIP_OFFERS, offerState } from "@/lib/aq-modules/membership";
import { MODULES, PLAN_RANK, type ModuleKey } from "@/lib/aq-modules/types";

export const metadata: Metadata = { title: "AQ Analytics" };
export const dynamic = "force-dynamic";

const MODULE_ICON: Record<ModuleKey, typeof LineChart> = {
  "aq-telex": Newspaper,
  "market-data": LineChart,
  "aq-signal-pro": Activity,
  "freight-analytics": Ship,
  "supply-demand": Scale,
  briefing: BookOpen,
  alerts: Bell,
};

const REGISTER = "/hub/account/membership?plan=growth&from=aq-analytics";
const TALK = "/hub/contact?topic=AQ%20Analytics";

export default async function AqAnalyticsPlanPage() {
  const { user, admin, modules } = await getHubAccess();
  const offer = MEMBERSHIP_OFFERS.find((item) => item.id === "analytics")!;
  const state = offerState(offer, { plan: user.plan, admin });
  const owned = state !== "open";
  const included = MODULES.filter((item) => PLAN_RANK.growth >= PLAN_RANK[modules.access[item.key]]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-2">
      <SalesHero
        src="/media/fields-sunrise.mp4"
        poster="/media/fields-sunrise.jpg"
        videoLabel="Sunrise over cultivated fields, the market view AQ Analytics opens up"
        eyebrow="AQ Analytics"
        title={
          <>
            Advisory for the <span className="text-teal-300">Global Market</span>
          </>
        }
        sub="Trader-level market analysis for the fertiliser market, designed to let you make an informed decision. Analytics and licensed market data, no physical trading."
      >
        {owned ? (
          <Link href="/hub/analytics" className={heroPrimary}>
            Open AQ Analytics <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link href={REGISTER} className={heroPrimary}>
            Register for AQ Analytics <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
        <Link href={TALK} className={heroGhost}>
          Talk to the trade desk
        </Link>
      </SalesHero>

      <section className="grid gap-6 lg:grid-cols-5" aria-label="AQ Analytics plan">
        <div className={`aq-card relative flex flex-col p-7 lg:col-span-2 ${owned ? "ring-2 ring-[#2fa865]" : "border-2 border-navy-400"}`}>
          {owned ? <PlanBadge tone="green">{state === "current" ? "Current plan" : "Included in your plan"}</PlanBadge> : null}
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
            <LineChart className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-[20px] font-bold text-ink">{offer.name}</h2>
          <p className="text-[14px] text-dim">{offer.tagline}</p>
          <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6 text-[15px] leading-relaxed">
            {offer.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-ink">
                <Check className="mt-1 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {feature}
              </li>
            ))}
            {offer.missing.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-[#a3b0bd]">
                <X className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {feature} <span className="sr-only">(not included)</span>
                </span>
              </li>
            ))}
          </ul>
          {owned ? (
            <Link
              href="/hub/analytics"
              className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#2fa865] bg-[#f1faf4] px-4 text-[15px] font-semibold text-[#1f7a45] no-underline transition hover:bg-[#e3f5ea]"
            >
              Open AQ Analytics <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <Link href={REGISTER} className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-navy-700 px-4 text-[15px] font-semibold text-white no-underline transition hover:bg-navy-600 active:scale-[0.98]">
              Register for AQ Analytics
            </Link>
          )}
        </div>

        <ul className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-3">
          {included.map((item) => {
            const Icon = MODULE_ICON[item.key];
            return (
              <li key={item.key} className="aq-card aq-lift p-5">
                <Icon className="h-5 w-5 text-teal-700" aria-hidden />
                <p className="mt-3 text-[16px] font-semibold text-ink">{item.label}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-mid">{item.pitch}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <CrossSell eyebrow="AQ Zero" line="Ready to buy at supplier cost? AQ Zero adds physical trading to everything here." href="/hub/plans/aq-zero" cta="Explore AQ Zero" />

      <ClosingCta
        title="Know the market before you move"
        body="AQ Analytics is included with every AQ Zero plan, and stands alone for teams that only need the intelligence. The desk can walk you through the modules on a short call."
        gradient="linear-gradient(115deg, #16304D 0%, #254F76 55%, #2F6FB3 100%)"
        glow="-right-20 -top-24 bg-[#3AB0FF]/20"
      >
        <Link href={TALK} className={heroPrimary}>
          Talk to the trade desk <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        {owned ? null : (
          <Link href={REGISTER} className={heroGhost}>
            Register for AQ Analytics
          </Link>
        )}
      </ClosingCta>
    </div>
  );
}

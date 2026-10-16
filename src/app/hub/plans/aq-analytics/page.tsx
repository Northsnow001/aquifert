import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { Activity, ArrowRight, Bell, BookOpen, Check, LineChart, Newspaper, Scale, Ship, X } from "lucide-react";
import { SalesHero } from "@/components/hub/sales-hero";
import { ClosingCta, CrossSell, HeroTitle, PlanLink, heroGhost, heroPrimary } from "@/components/hub/plans/sales";
import { getHubAccess } from "@/lib/aq-modules/access";
import { MODULES, PLAN_RANK, type ModuleKey } from "@/lib/aq-modules/types";
import { splitLines } from "@/lib/site-content/normalize";
import { MODULE_CARD_FIELDS, isShown, sectionOrder } from "@/lib/site-content/schema";
import { getSiteContent } from "@/lib/site-content/store";

export const metadata: Metadata = { title: "AQ Analytics" };
export const dynamic = "force-dynamic";

const MODULE_CARD: Record<ModuleKey, { icon: typeof LineChart; field: keyof typeof MODULE_CARD_FIELDS }> = {
  "aq-telex": { icon: Newspaper, field: "telex" },
  "market-data": { icon: LineChart, field: "marketData" },
  "aq-signal-pro": { icon: Activity, field: "signal" },
  "freight-analytics": { icon: Ship, field: "freight" },
  "supply-demand": { icon: Scale, field: "supplyDemand" },
  briefing: { icon: BookOpen, field: "briefing" },
  alerts: { icon: Bell, field: "alerts" },
};

const REGISTER = "/hub/account/membership?plan=growth&from=aq-analytics";

export default async function AqAnalyticsPlanPage() {
  const [{ modules }, content] = await Promise.all([getHubAccess(), getSiteContent()]);
  const copy = content.aqAnalytics;
  const { hero, plan, crossSell, closing } = copy;
  // Sales / waitlist surface for every viewer (including admin): register interest, never open the live product from this page.
  const included = MODULES.filter((item) => PLAN_RANK.growth >= PLAN_RANK[modules.access[item.key]]);
  const mainHref = REGISTER;

  const blocks: Record<string, React.ReactNode> = {
    plan: (
      <section className="grid gap-6 lg:grid-cols-5" aria-label={`${plan.name} plan`}>
        <div className="aq-card relative flex flex-col border-2 border-navy-400 p-7 lg:col-span-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
            <LineChart className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-[20px] font-bold text-ink">{plan.name}</h2>
          {plan.tagline ? <p className="text-[14px] text-dim">{plan.tagline}</p> : null}
          <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6 text-[15px] leading-relaxed">
            {splitLines(plan.features).map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-ink">
                <Check className="mt-1 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {feature}
              </li>
            ))}
            {splitLines(plan.missing).map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-[#a3b0bd]">
                <X className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {feature} <span className="sr-only">(not included)</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href={REGISTER} className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-navy-700 px-4 text-[15px] font-semibold text-white no-underline transition hover:bg-navy-600 active:scale-[0.98]">
            {plan.registerLabel} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-3">
          {included.map((item) => {
            const { icon: Icon, field } = MODULE_CARD[item.key];
            const pitch = plan[`${field}Pitch`];
            return (
              <li key={item.key} className="aq-card aq-lift p-5">
                <Icon className="h-5 w-5 text-teal-700" aria-hidden />
                <p className="mt-3 text-[16px] font-semibold text-ink">{plan[`${field}Name`]}</p>
                {pitch ? <p className="mt-1.5 text-[14px] leading-relaxed text-mid">{pitch}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
    ),
    crossSell: <CrossSell eyebrow={crossSell.eyebrow} line={crossSell.line} href={crossSell.buttonLink} cta={crossSell.buttonLabel} />,
    closing: (
      <ClosingCta title={closing.title} body={closing.body} gradient="linear-gradient(115deg, #16304D 0%, #254F76 55%, #2F6FB3 100%)" glow="-right-20 -top-24 bg-[#3AB0FF]/20">
        <PlanLink href={closing.primaryLink} label={closing.primaryLabel} className={heroPrimary} arrow />
        <PlanLink href={REGISTER} label={closing.registerLabel} className={heroGhost} />
      </ClosingCta>
    ),
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-2">
      <SalesHero src={hero.video} poster={hero.image} videoLabel={hero.label} eyebrow={hero.eyebrow} badge={hero.badge || undefined} title={<HeroTitle title={hero.title} highlight={hero.highlight} />} sub={hero.sub}>
        <PlanLink href={mainHref} label={hero.registerLabel} className={heroPrimary} arrow />
        <PlanLink href={hero.secondaryLink || REGISTER} label={hero.secondaryLabel} className={heroGhost} />
      </SalesHero>

      {sectionOrder("aqAnalytics", copy._order)
        .filter((key) => key in blocks && isShown(copy[key as keyof typeof copy] as { hidden?: true }))
        .map((key) => (
          <Fragment key={key}>{blocks[key]}</Fragment>
        ))}
    </div>
  );
}

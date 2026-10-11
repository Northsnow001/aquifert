import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Check, Rocket, Search, Sprout, Wheat, X } from "lucide-react";
import { SalesHero } from "@/components/hub/sales-hero";
import { ComparePlans } from "@/components/hub/plans/compare-plans";
import { planAllowances } from "@/components/hub/plans/load";
import { ClosingCta, CrossSell, Eyebrow, HeroTitle, PlanLink, heroGhost, heroPrimary, PlanBadge } from "@/components/hub/plans/sales";
import { getHubAccess } from "@/lib/aq-modules/access";
import { MEMBERSHIP_OFFERS, type MembershipTier } from "@/lib/aq-modules/membership";
import { myMembershipRequests } from "@/lib/aq-modules/members";
import { splitLines } from "@/lib/site-content/normalize";
import { isShown, sectionOrder, type SitePage } from "@/lib/site-content/schema";
import { getSiteContent } from "@/lib/site-content/store";
import { findZeroRegistration } from "@/lib/zero-interest";
import { SiteIcon } from "@/marketing/lib/site-icons";

export const metadata: Metadata = { title: "AQ Zero" };
export const dynamic = "force-dynamic";

const TIER_ICON: Record<MembershipTier, typeof Sprout> = { sprout: Sprout, harvest: Wheat, scale: Rocket };

const tierCopy = (copy: SitePage<"aqZero">["programmes"], tier: MembershipTier) => ({
  name: copy[`${tier}Name`],
  tagline: copy[`${tier}Tagline`],
  blurb: copy[`${tier}Blurb`],
  features: splitLines(copy[`${tier}Features`]),
  missing: splitLines(copy[`${tier}Missing`]),
});

export default async function AqZeroPlanPage() {
  const { user, modules } = await getHubAccess();
  const [registration, requests, allowances, content] = await Promise.all([
    findZeroRegistration(user).catch(() => null),
    myMembershipRequests(user).catch(() => []),
    planAllowances(modules),
    getSiteContent(),
  ]);
  const copy = content.aqZero;
  const currentTier =
    user.plan === "enterprise" ? ([...requests].sort((a, b) => b.at.localeCompare(a.at)).find((item) => item.status === "done" && item.requestedPlan === "enterprise" && item.tier)?.tier ?? null) : null;
  const tiers = MEMBERSHIP_OFFERS.filter((offer): offer is (typeof offer & { tier: MembershipTier }) => offer.tier !== null);
  const { hero, notice, programmes, compare, steps, crossSell, closing } = copy;

  const blocks: Record<string, React.ReactNode> = {
    notice: (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-teal-200 bg-teal-50/70 px-5 py-4 text-[15px] leading-relaxed text-mid">
        {notice.badge ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700 ring-1 ring-teal-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
            {notice.badge}
          </span>
        ) : null}
        <span className="min-w-[15rem] flex-1">{notice.text}</span>
      </p>
    ),
    programmes: (
      <section id="aq-zero-tiers" className="scroll-mt-24" aria-label="AQ Zero programmes">
        <div className="aq-stagger grid gap-6 md:grid-cols-3">
          {tiers.map((offer) => {
            const card = tierCopy(programmes, offer.tier);
            const Icon = TIER_ICON[offer.tier];
            const current = currentTier === offer.tier;
            const registered = !current && registration?.programme === offer.tier;
            const badge = current ? "Current plan" : registered ? "Registered" : offer.popular ? programmes.popularLabel : null;
            const frame = current || registered ? "ring-2 ring-[#2fa865]" : offer.popular ? "border-2 border-teal-500 shadow-[0_18px_40px_-22px_rgb(79_127_114/0.7)]" : "";
            const register = programmes.buttonLabel.replace(/\{name\}/g, card.name);
            return (
              <section key={offer.id} aria-label={card.name} className={`aq-card relative flex flex-col p-7 transition-transform duration-200 hover:-translate-y-1 ${frame}`}>
                {badge ? <PlanBadge tone={current || registered ? "green" : "teal"}>{badge}</PlanBadge> : null}
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-[20px] font-bold text-ink">{card.name}</h2>
                {card.tagline ? <p className="text-[14px] text-dim">{card.tagline}</p> : null}
                {card.blurb ? <p className="mt-2 text-[14px] leading-relaxed text-mid">{card.blurb}</p> : null}
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6 text-[15px] leading-relaxed">
                  {card.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-ink">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {feature}
                    </li>
                  ))}
                  {card.missing.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[#a3b0bd]">
                      <X className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {feature} <span className="sr-only">(not included)</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {current ? (
                  <Link
                    href="/hub/account/membership"
                    className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#2fa865] bg-[#f1faf4] px-4 text-[15px] font-semibold text-[#1f7a45] no-underline transition hover:bg-[#e3f5ea]"
                  >
                    Manage membership <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <Link
                    href={`/hub/account/membership?plan=enterprise&tier=${offer.tier}&from=aq-zero`}
                    aria-label={registered ? `Update my details for ${card.name}` : register}
                    className={`mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold no-underline transition active:scale-[0.98] ${
                      registered ? "border border-[#2fa865] bg-white text-[#1f7a45] hover:bg-[#f1faf4]" : "bg-navy-700 text-white hover:bg-navy-600"
                    }`}
                  >
                    {registered ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden /> Update my details
                      </>
                    ) : (
                      register
                    )}
                  </Link>
                )}
              </section>
            );
          })}
        </div>
        {programmes.footnote ? (
          <p className="mt-6 flex items-center gap-2 text-[14px] text-mid">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#d97706]" aria-hidden />
            {programmes.footnote}
          </p>
        ) : null}
      </section>
    ),
    compare: <ComparePlans plan={user.plan} allowances={allowances} access={modules.access} title={compare.title} sub={compare.sub} />,
    steps: (
      <section className="aq-card p-6 sm:p-9">
        {steps.kicker ? <Eyebrow>{steps.kicker}</Eyebrow> : null}
        <h2 className="mt-2 text-[24px] font-bold tracking-[-0.01em] text-ink">{steps.title}</h2>
        <ol className={`mt-7 grid gap-5 ${steps.items.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {steps.items.map((step, index) => (
            <li key={index} className="relative rounded-2xl bg-s2 p-6">
              <span className="absolute right-5 top-4 font-mono text-[30px] font-extrabold text-ink/10" aria-hidden>
                {index + 1}
              </span>
              <SiteIcon name={step.icon || "check"} className="h-5 w-5 text-teal-700" />
              <p className="mt-3 text-[16px] font-semibold text-ink">{step.title}</p>
              {step.text ? <p className="mt-2 text-[14px] leading-relaxed text-mid">{step.text}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    ),
    crossSell: <CrossSell eyebrow={crossSell.eyebrow} line={crossSell.line} href={crossSell.buttonLink} cta={crossSell.buttonLabel} icon={Search} />,
    closing: (
      <ClosingCta title={closing.title} body={closing.body} gradient="linear-gradient(115deg, #254F76 0%, #16304D 60%, #10253C 100%)" glow="-bottom-24 -left-20 bg-teal-500/20">
        <PlanLink href={closing.primaryLink} label={closing.primaryLabel} className={heroPrimary} arrow />
        <PlanLink href={closing.secondaryLink} label={closing.secondaryLabel} className={heroGhost} />
      </ClosingCta>
    ),
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-2">
      <SalesHero src={hero.video} poster={hero.image} videoLabel={hero.label} eyebrow={hero.eyebrow} badge={hero.badge || undefined} title={<HeroTitle title={hero.title} highlight={hero.highlight} />} sub={hero.sub}>
        <PlanLink href={hero.primaryLink} label={hero.primaryLabel} className={heroPrimary} arrow />
        <PlanLink href={hero.secondaryLink} label={hero.secondaryLabel} className={heroGhost} />
      </SalesHero>

      {sectionOrder("aqZero", copy._order)
        .filter((key) => key in blocks && isShown(copy[key as keyof typeof copy] as { hidden?: true }))
        .map((key) => (
          <Fragment key={key}>{blocks[key]}</Fragment>
        ))}
    </div>
  );
}

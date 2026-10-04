"use client";

import { Link } from "@/marketing/router";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { VideoHero } from "@/marketing/components/shared/VideoHero";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd, type FaqItem } from "@/marketing/components/shared/Faq";
import { CtaBand, MarketingLayout } from "@/marketing/components/MarketingLayout";
import { MediaCard } from "@/marketing/components/shared/MediaCard";
import { ArrowRight, Check, Landmark, RefreshCw, Rocket, ShieldCheck, Sprout, Wheat } from "lucide-react";
import { MEMBERSHIP_PLANS } from "@/marketing/lib/plans";
import { useAuth } from "@/marketing/hooks/useAuth";

const PLAN_ICONS = {
  SPROUT: { icon: Sprout },
  HARVEST: { icon: Wheat },
  SCALE: { icon: Rocket },
};

const NOTES = [
  {
    icon: Landmark,
    title: "Financing eligibility",
    text: "Members at AQ Harvest tier and above unlock the Invoice Discounting Facility, up to 85% of a verified fertilizer invoice value, advanced within 48 hours.",
  },
  {
    icon: ShieldCheck,
    title: "Verified access only",
    text: "Every membership follows KYC/KYB review and compliance approval. Fertilizer trading limits scale with your verification tier.",
  },
  {
    icon: RefreshCw,
    title: "Change anytime",
    text: "Upgrade, downgrade or cancel from your portal. The desk confirms pricing with you and handles every change.",
  },
];

const PRICING_FAQ: FaqItem[] = [
  {
    q: "Which Aquifert membership tier fits me?",
    a: "AQ Sprout is for buyers trading up to 200 tonnes a month, AQ Harvest covers 201–600 tonnes, and AQ Scale has no tonnage limit. The desk confirms pricing for your tier with you directly.",
  },
  {
    q: "What do members save compared with a traditional fertilizer trader?",
    a: "Members pay £0 per-tonne margin and see the full landed-cost breakdown, product, ocean freight, clearing and duties, on every fertilizer quote. On typical volumes, the saving versus a traditional trader's embedded margin exceeds the membership fee many times over.",
  },
  {
    q: "Can I switch or cancel my fertilizer membership?",
    a: "Yes. You can upgrade, downgrade or cancel from your portal at any time, and the desk handles the change for you.",
  },
];

const PRICING_FAQ_SCHEMA = faqJsonLd(PRICING_FAQ);

const MEMBERSHIP_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Membership", path: "/membership" },
]);

const MEMBERSHIP_SCHEMA: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Aquifert fertilizer trading membership",
  provider: { "@id": "https://aquifert.com/#organization" },
  serviceType: "B2B fertilizer trading platform membership",
  areaServed: "GB",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Aquifert membership tiers",
    itemListElement: MEMBERSHIP_PLANS.map((p) => ({
      "@type": "Offer",
      name: `${p.name} membership, ${p.tonnage}`,
      description: `Fertilizer trading membership: ${p.name}. ${p.tonnage}.`,
    })),
  },
};

export function MembershipPage() {
  const { isAuthenticated } = useAuth();
  const cta = isAuthenticated ? "/hub" : "/login";

  return (
    <MarketingLayout>
      <Seo
        title="Fertilizer Trading Membership Plans: AQ Sprout, AQ Harvest, AQ Scale | Aquifert"
        description="Aquifert membership replaces per-tonne fertilizer margin with one flat fee. AQ Sprout (up to 200t a month), AQ Harvest (201–600t) and AQ Scale (unlimited) include cost-to-cost quotes, market intelligence, live tracking and invoice financing."
        keywords="fertilizer trading membership, fertilizer subscription pricing, buy fertilizer without margin, fertilizer invoice financing UK, aquifert plans"
        path="/membership"
        jsonLd={[ORGANIZATION_JSONLD, MEMBERSHIP_SCHEMA, PRICING_FAQ_SCHEMA, MEMBERSHIP_BREADCRUMB]}
      />

      {/* Video hero */}
      <VideoHero
        src="/media/greenhouse-tomatoes.mp4"
        poster="/media/greenhouse-tomatoes.jpg"
        videoLabel="Rows of tomato plants growing inside a modern greenhouse fed by water-soluble fertilizer"
        center
      >
        <Reveal>
          <h1 className="aqf-hero-title mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            One membership. <span className="text-teal-300">Every fertilizer market.</span>
          </h1>
          <p className="aqf-hero-sub mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
            Fertilizer membership tiers scale with your volumes, from first trade to full market
            making. The desk confirms pricing for your tier with you directly.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#plans"
              className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              Compare the tiers <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="mailto:enquiry@aquifert.com"
              className="inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/10"
            >
              Talk to the desk
            </a>
          </div>
        </Reveal>
      </VideoHero>

      {/* Plan cards */}
      <section id="plans" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {MEMBERSHIP_PLANS.map((plan, i) => (
            <Reveal key={plan.tier} delay={i * 80} className="h-full">
              <div
                className={`group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500 ${
                  plan.tier === "HARVEST" ? "border-teal-600 hover:border-teal-600 dark:border-teal-600 dark:hover:border-teal-500" : ""
                }`}
              >
                {plan.tier === "HARVEST" && (
                  <span className="absolute right-4 top-4 rounded-full bg-teal-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                {(() => {
                  const PlanIcon = PLAN_ICONS[plan.tier].icon;
                  return <PlanIcon className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />;
                })()}
                <div className="mt-4">
                  <p className="text-lg font-bold text-navy-900 dark:text-white">{plan.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{plan.tonnage}</p>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={cta}
                  aria-label={`Start fertilizer trading with the ${plan.name} membership`}
                  className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-colors aqf-btn-press ${
                    plan.tier === "HARVEST"
                      ? "bg-teal-600 hover:bg-teal-500"
                      : "bg-navy-600 hover:bg-navy-500"
                  }`}
                >
                  Start with {plan.name} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {NOTES.map((n, i) => (
            <Reveal key={n.title} delay={i * 70} className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <n.icon className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <p className="mt-4 text-[15px] font-semibold text-navy-900 dark:text-white">{n.title}</p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{n.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Where membership pays off, wide video card */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8" aria-label="Membership in the field">
        <Reveal>
          <MediaCard
            video="/media/fields-aerial.mp4"
            poster="/media/fields-aerial.jpg"
            label="Aerial view over cultivated fields fed by water-soluble fertilizer"
            tagline="Every tonne traded at cost lands harder in the field"
            cta="Start with a plan"
            to={cta}
            ratio="aspect-[16/7]"
          />
        </Reveal>
      </section>

      {/* Pricing FAQ, GEO / AI-answer optimised */}
      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <SectionHeader
            kicker="Membership questions"
            title="Fertilizer membership, FAQ"
            sub="Which tier fits, what it saves, and how flexible it is."
            center
          />
          <Reveal delay={120} className="mt-10">
            <Faq items={PRICING_FAQ} />
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Trade your first tonne of fertilizer this week"
        subtitle="Launch the live demo as a buyer, supplier or admin, membership, financing and the full fertilizer trading workflow included."
        ctaLabel="Choose your fertilizer plan"
      />
    </MarketingLayout>
  );
}

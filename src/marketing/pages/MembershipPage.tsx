"use client";

import { Link } from "@/marketing/router";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { VideoHero } from "@/marketing/components/shared/VideoHero";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd, type FaqItem } from "@/marketing/components/shared/Faq";
import { CtaBand, MarketingLayout } from "@/marketing/components/MarketingLayout";
import { MediaCard } from "@/marketing/components/shared/MediaCard";
import { useEffect, useState } from "react";
import { ArrowRight, ChartLine, Check, Landmark, RefreshCw, Rocket, ShieldCheck, Sprout, Wheat } from "lucide-react";
import { MEMBERSHIP_OFFERS, offerState, type MembershipOffer } from "@/lib/aq-modules/membership";
import type { Plan } from "@/lib/session-shared";
import { useAuth } from "@/marketing/hooks/useAuth";

const PLAN_ICONS: Record<MembershipOffer["id"], typeof Sprout> = {
  sprout: Sprout,
  harvest: Wheat,
  scale: Rocket,
  analytics: ChartLine,
};

type Viewer = { signedIn: boolean; plan: Plan | null; admin: boolean };

function useViewer(isAuthenticated: boolean) {
  const [viewer, setViewer] = useState<Viewer>({ signedIn: false, plan: null, admin: false });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/membership-status", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Viewer>) : null))
      .then((data) => data && setViewer(data))
      .catch(() => {});
    return () => controller.abort();
  }, [isAuthenticated]);
  return viewer;
}

const startHref = (offer: MembershipOffer) => (offer.tier ? `/hub/account/membership?plan=enterprise&tier=${offer.tier}` : "/hub/account/membership?plan=growth");

const NOTES = [
  {
    icon: Landmark,
    title: "Financing eligibility",
    text: "Members at AQ Zero Harvest tier and above unlock the Invoice Discounting Facility, up to 85% of a verified fertilizer invoice value, advanced within 48 hours.",
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
    a: "AQ Zero Sprout is for buyers trading up to 200 tonnes a month, AQ Zero Harvest covers 201–600 tonnes, and AQ Zero Scale has no tonnage limit. The desk confirms pricing for your tier with you directly.",
  },
  {
    q: "What is the difference between AQ Analytics and AQ ZERO?",
    a: "AQ Analytics is for analysis and licensed market data: PRA prices, trade flows, port lineups, freight benchmarks and unlimited Aquibot, with no physical trading. AQ Zero Sprout, AQ Zero Harvest and AQ Zero Scale are AQ ZERO memberships: one flat fee replaces the margin on every quote, and every AQ Analytics module is included.",
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
    itemListElement: MEMBERSHIP_OFFERS.map((p) => ({
      "@type": "Offer",
      name: `${p.name} membership, ${p.tagline}`,
      description: `Fertilizer ${p.tier ? "trading" : "market data"} membership: ${p.name}. ${p.tagline}.`,
    })),
  },
};

export function MembershipPage() {
  const { isAuthenticated } = useAuth();
  const viewer = useViewer(isAuthenticated);
  const signedIn = isAuthenticated || viewer.signedIn;
  const cta = signedIn ? "/hub" : "/login";

  return (
    <MarketingLayout>
      <Seo
        title="Fertilizer Membership Plans: AQ Zero Sprout, AQ Zero Harvest, AQ Zero Scale, AQ Analytics | Aquifert"
        description="Aquifert membership replaces per-tonne fertilizer margin with one flat fee. AQ Zero Sprout (up to 200t a month), AQ Zero Harvest (201–600t) and AQ Zero Scale (unlimited) include cost-to-cost quotes, market intelligence, live tracking and invoice financing. AQ Analytics adds licensed market data and unlimited Aquibot without physical trading."
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {MEMBERSHIP_OFFERS.map((plan, i) => {
            const PlanIcon = PLAN_ICONS[plan.id];
            const state = viewer.plan ? offerState(plan, { plan: viewer.plan, admin: viewer.admin }) : "open";
            const owned = state !== "open";
            return (
              <Reveal key={plan.id} delay={i * 80} className="h-full">
                <div
                  className={`group relative flex h-full flex-col rounded-3xl border bg-white p-6 transition-colors dark:bg-transparent ${
                    owned
                      ? "border-[#2fa865] ring-1 ring-[#2fa865]"
                      : plan.popular
                        ? "border-teal-600 hover:border-teal-600 dark:border-teal-600 dark:hover:border-teal-500"
                        : "border-slate-200 hover:border-navy-700 dark:border-slate-700 dark:hover:border-slate-500"
                  }`}
                >
                  {owned ? (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#2fa865] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      {state === "current" ? "Current plan" : "Included in your plan"}
                    </span>
                  ) : plan.popular ? (
                    <span className="absolute right-4 top-4 rounded-full bg-teal-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most popular
                    </span>
                  ) : null}
                  <PlanIcon className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                  <div className="mt-4">
                    <p className="text-lg font-bold text-navy-900 dark:text-white">{plan.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{plan.tagline}</p>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {owned ? (
                    <Link
                      to="/hub"
                      aria-label={`${plan.name} is ${state === "current" ? "your current plan" : "included in your plan"}, open the hub`}
                      className="mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[#2fa865] bg-[#f1faf4] text-sm font-semibold text-[#1f7a45] transition-colors hover:bg-[#e3f5ea]"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {state === "current" ? "Current plan" : "Included in your plan"}
                    </Link>
                  ) : (
                    <Link
                      to={signedIn ? startHref(plan) : "/login"}
                      aria-label={`Start with the ${plan.name} membership`}
                      className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-colors aqf-btn-press ${
                        plan.popular ? "bg-teal-600 hover:bg-teal-500" : "bg-navy-600 hover:bg-navy-500"
                      }`}
                    >
                      Start with {plan.name} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  )}
                </div>
              </Reveal>
            );
          })}
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

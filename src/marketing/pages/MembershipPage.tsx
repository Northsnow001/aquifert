"use client";

import { Link } from "@/marketing/router";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { VideoHero } from "@/marketing/components/shared/VideoHero";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd } from "@/marketing/components/shared/Faq";
import { CtaBand, MarketingLayout } from "@/marketing/components/MarketingLayout";
import { MediaCard } from "@/marketing/components/shared/MediaCard";
import { SiteLink } from "@/marketing/components/shared/SiteLink";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChartLine, Check, Rocket, Sprout, Wheat } from "lucide-react";
import { MEMBERSHIP_OFFERS, offerState, type MembershipOffer } from "@/lib/aq-modules/membership";
import { isShown, type SiteContent } from "@/lib/site-content/schema";
import { splitLines } from "@/lib/site-content/normalize";
import type { Plan } from "@/lib/session-shared";
import { useAuth } from "@/marketing/hooks/useAuth";
import { SiteIcon } from "@/marketing/lib/site-icons";

type Membership = SiteContent["membership"];

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

const MEMBERSHIP_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Membership", path: "/membership" },
]);

/** Card wording from the editor; an empty "Included" list falls back to the plan's built-in features. */
function display(content: Membership, offer: MembershipOffer) {
  const card = content[offer.id];
  const features = splitLines(card.features);
  return { name: card.name || offer.name, tagline: card.tagline, features: features.length ? features : offer.features };
}

export function MembershipPage({ content }: { content: Membership }) {
  const { isAuthenticated } = useAuth();
  const viewer = useViewer(isAuthenticated);
  const signedIn = isAuthenticated || viewer.signedIn;
  const cta = signedIn ? "/hub" : "/login";
  const { seo, hero, notes, wide, faq } = content;
  const offers = MEMBERSHIP_OFFERS.filter((offer) => isShown(content[offer.id]));
  const showNotes = isShown(notes) && notes.items.length > 0;

  const jsonLd = useMemo(() => {
    const service: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Aquifert fertilizer trading membership",
      provider: { "@id": "https://aquifert.com/#organization" },
      serviceType: "B2B fertilizer sourcing platform membership",
      areaServed: "GB",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Aquifert membership tiers",
        itemListElement: MEMBERSHIP_OFFERS.filter((offer) => isShown(content[offer.id])).map((offer) => {
          const card = display(content, offer);
          return {
            "@type": "Offer",
            name: card.tagline ? `${card.name} membership, ${card.tagline}` : `${card.name} membership`,
            description: `Fertilizer ${offer.tier ? "trading" : "market data"} membership: ${card.name}.${card.tagline ? ` ${card.tagline}.` : ""}`,
          };
        }),
      },
    };
    return isShown(faq) ? [ORGANIZATION_JSONLD, service, faqJsonLd(faq.items), MEMBERSHIP_BREADCRUMB] : [ORGANIZATION_JSONLD, service, MEMBERSHIP_BREADCRUMB];
  }, [content, faq]);

  return (
    <MarketingLayout>
      <Seo
        title={seo.title}
        description={seo.description}
        keywords="fertilizer trading membership, fertilizer subscription pricing, buy fertilizer without margin, fertilizer invoice financing UK, aquifert plans"
        path="/membership"
        image={hero.image || undefined}
        jsonLd={jsonLd}
      />

      {/* Video hero */}
      {isShown(hero) ? (
        <VideoHero src={hero.video} poster={hero.image} videoLabel={hero.label} center>
          <Reveal>
            <h1 className="aqf-hero-title mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
              {hero.title}
              {hero.highlight ? <> <span className="text-teal-300">{hero.highlight}</span></> : null}
            </h1>
            {hero.body ? <p className="aqf-hero-sub mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed sm:text-xl">{hero.body}</p> : null}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              {hero.primaryLabel ? (
                <SiteLink
                  href={hero.primaryLink || "#plans"}
                  className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
                >
                  {hero.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </SiteLink>
              ) : null}
              {hero.secondaryLabel ? (
                <SiteLink
                  href={hero.secondaryLink || "/contact"}
                  className="inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/10"
                >
                  {hero.secondaryLabel}
                </SiteLink>
              ) : null}
            </div>
          </Reveal>
        </VideoHero>
      ) : null}

      {/* Plan cards */}
      {offers.length || showNotes ? (
        <section id="plans" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          {offers.length ? (
            <div className={`grid gap-6 md:grid-cols-2 ${PLAN_GRID[offers.length]}`}>
              {offers.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  card={display(content, plan)}
                  state={viewer.plan ? offerState(plan, { plan: viewer.plan, admin: viewer.admin }) : "open"}
                  signedIn={signedIn}
                  delay={i * 80}
                />
              ))}
            </div>
          ) : null}

          {/* Notes */}
          {showNotes ? (
            <div className={`grid gap-6 md:grid-cols-3 ${offers.length ? "mt-14" : ""}`}>
              {notes.items.map((n, i) => (
                <Reveal key={i} delay={(i % 3) * 70} className="h-full">
                  <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                    <SiteIcon name={n.icon} className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                    <p className="mt-4 text-[15px] font-semibold text-navy-900 dark:text-white">{n.title}</p>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{n.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Where membership pays off, wide video card */}
      {isShown(wide) && wide.tagline ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8" aria-label="Membership in the field">
          <Reveal>
            <MediaCard video={wide.video} poster={wide.image} label={wide.label} tagline={wide.tagline} cta={wide.cta} to={cta} ratio="aspect-[16/7]" />
          </Reveal>
        </section>
      ) : null}

      {/* Pricing FAQ, GEO / AI-answer optimised */}
      {isShown(faq) ? (
        <section className="border-t border-border bg-white dark:bg-transparent">
          <div className="mx-auto max-w-4xl px-4 py-20">
            <SectionHeader kicker={faq.kicker} title={faq.title} sub={faq.sub} center />
            <Reveal delay={120} className="mt-10">
              <Faq items={faq.items} />
            </Reveal>
          </div>
        </section>
      ) : null}

      {isShown(content.cta) ? <CtaBand title={content.cta.title} subtitle={content.cta.subtitle} ctaLabel={content.cta.buttonLabel} /> : null}
    </MarketingLayout>
  );
}

/** Grid columns for one to four visible plan cards. */
const PLAN_GRID = ["", "md:mx-auto md:max-w-md md:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"];

function PlanCard({
  plan,
  card,
  state,
  signedIn,
  delay,
}: {
  plan: MembershipOffer;
  card: ReturnType<typeof display>;
  state: ReturnType<typeof offerState>;
  signedIn: boolean;
  delay: number;
}) {
  const PlanIcon = PLAN_ICONS[plan.id];
  const owned = state !== "open";
  return (
    <Reveal delay={delay} className="h-full">
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
          <p className="text-lg font-bold text-navy-900 dark:text-white">{card.name}</p>
          {card.tagline ? <p className="text-sm text-slate-600 dark:text-slate-400">{card.tagline}</p> : null}
        </div>
        <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:text-slate-300">
          {card.features.map((f, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {f}
            </li>
          ))}
        </ul>
        {owned ? (
          <Link
            to="/hub"
            aria-label={`${card.name} is ${state === "current" ? "your current plan" : "included in your plan"}, open the hub`}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[#2fa865] bg-[#f1faf4] text-sm font-semibold text-[#1f7a45] transition-colors hover:bg-[#e3f5ea]"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {state === "current" ? "Current plan" : "Included in your plan"}
          </Link>
        ) : (
          <Link
            to={signedIn ? startHref(plan) : "/login"}
            aria-label={`Start with the ${card.name} membership`}
            className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-colors aqf-btn-press ${
              plan.popular ? "bg-teal-600 hover:bg-teal-500" : "bg-navy-600 hover:bg-navy-500"
            }`}
          >
            Start with {card.name} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        )}
      </div>
    </Reveal>
  );
}

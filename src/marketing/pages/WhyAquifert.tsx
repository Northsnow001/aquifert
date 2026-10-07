"use client";

import { useMemo } from "react";
import { ArrowRight, Check, Factory, ShoppingCart } from "lucide-react";
import type { SiteContent } from "@/lib/site-content/schema";
import { splitLines } from "@/lib/site-content/normalize";
import { MarketingLayout, CtaBand } from "@/marketing/components/MarketingLayout";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { FramedImage } from "@/marketing/components/shared/FramedImage";
import { FramedVideo, VideoHero } from "@/marketing/components/shared/VideoHero";
import { MediaCard } from "@/marketing/components/shared/MediaCard";
import { SiteLink } from "@/marketing/components/shared/SiteLink";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd } from "@/marketing/components/shared/Faq";
import { SiteIcon } from "@/marketing/lib/site-icons";

const WHY_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Why Aquifert", path: "/why-aquifert" },
]);

function Ticks({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3 text-sm font-medium leading-relaxed text-navy-800 dark:text-slate-200">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
            <Check className="h-3 w-3" />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function WhyAquifert({ content }: { content: SiteContent["why"] }) {
  const { seo, hero, network, reasons, audiences, community, faq, cta } = content;
  const jsonLd = useMemo(() => [ORGANIZATION_JSONLD, faqJsonLd(faq.items), WHY_BREADCRUMB], [faq.items]);
  const oddCards = network.cards.length % 2 === 1;
  return (
    <MarketingLayout>
      <Seo
        title={seo.title}
        description={seo.description}
        keywords="why aquifert, fertilizer trading company UK, fertilizer supplier due diligence, sustainable fertilizer sourcing, agricultural supply chain expertise"
        path="/why-aquifert"
        image={hero.image || undefined}
        jsonLd={jsonLd}
      />

      {/* Video hero */}
      <VideoHero src={hero.video} poster={hero.image} videoLabel={hero.label}>
        <Reveal>
          <h1 className="aqf-hero-title max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            {hero.title}
            {hero.highlight ? <> <span className="text-teal-300">{hero.highlight}</span></> : null}
          </h1>
          {hero.body ? <p className="aqf-hero-sub mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed sm:text-xl">{hero.body}</p> : null}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            {hero.primaryLabel ? (
              <SiteLink
                href={hero.primaryLink || "/platform"}
                className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
              >
                {hero.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </SiteLink>
            ) : null}
            {hero.secondaryLabel ? (
              <SiteLink
                href={hero.secondaryLink || "/membership"}
                className="inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/10"
              >
                {hero.secondaryLabel}
              </SiteLink>
            ) : null}
          </div>
        </Reveal>
      </VideoHero>

      {/* Network video collage */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="network-heading">
        <Reveal>
          {network.kicker ? <p className="text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">{network.kicker}</p> : null}
          <h2 id="network-heading" className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-4xl">
            {network.title}
          </h2>
        </Reveal>
        {network.cards.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {network.cards.map((card, i) => (
              <Reveal key={i} delay={(i % 3) * 80} className={`h-full ${oddCards && i === network.cards.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
                <MediaCard video={card.video} poster={card.image} label={card.label} tagline={card.tagline} cta={card.cta} to={card.link || "/"} ratio="aspect-[4/5]" />
              </Reveal>
            ))}
          </div>
        ) : null}
      </section>

      {/* Why cards */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader kicker={reasons.kicker} title={reasons.title} sub={reasons.sub} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.items.map((w, i) => (
            <Reveal key={i} delay={(i % 3) * 60} className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <SiteIcon name={w.icon} className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                <h3 className="mt-4 text-[15px] font-semibold text-navy-900 dark:text-white">{w.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Audience split */}
      <section className="border-y border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader kicker={audiences.kicker} title={audiences.title} sub={audiences.sub} />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <ShoppingCart className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold text-navy-900 dark:text-white">{audiences.buyersTitle}</h3>
                <Ticks items={splitLines(audiences.buyers)} className="mt-5 flex-1 space-y-3.5" />
              </div>
            </Reveal>
            <Reveal delay={120} className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <Factory className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold text-navy-900 dark:text-white">{audiences.suppliersTitle}</h3>
                <Ticks items={splitLines(audiences.suppliers)} className="mt-5 flex-1 space-y-3.5" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Framed video + closing statement */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            {community.video ? (
              <FramedVideo src={community.video} poster={community.image} label={community.label} caption={community.caption} ratio="aspect-video" />
            ) : community.image ? (
              <FramedImage src={community.image} alt={community.label} caption={community.caption} />
            ) : null}
          </Reveal>
          <Reveal delay={120}>
            {community.kicker ? <p className="text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">{community.kicker}</p> : null}
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-4xl">{community.title}</h2>
            {community.body ? <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{community.body}</p> : null}
            <Ticks items={splitLines(community.points)} className="mt-6 space-y-3" />
          </Reveal>
        </div>
      </section>

      {/* Why FAQ, answer-first for search and AI answer engines */}
      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <SectionHeader kicker={faq.kicker} title={faq.title} sub={faq.sub} center />
          <Reveal delay={120} className="mt-10">
            <Faq items={faq.items} />
          </Reveal>
        </div>
      </section>

      <CtaBand title={cta.title} subtitle={cta.subtitle} ctaLabel={cta.buttonLabel} />
    </MarketingLayout>
  );
}

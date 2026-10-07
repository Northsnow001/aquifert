"use client";

import { useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { SiteContent } from "@/lib/site-content/schema";
import { splitLines } from "@/lib/site-content/normalize";
import { MarketingLayout, CtaBand } from "@/marketing/components/MarketingLayout";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { FramedImage } from "@/marketing/components/shared/FramedImage";
import { FramedVideo, VideoHero } from "@/marketing/components/shared/VideoHero";
import { SiteLink } from "@/marketing/components/shared/SiteLink";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd } from "@/marketing/components/shared/Faq";
import { SiteIcon } from "@/marketing/lib/site-icons";

const PLATFORM_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Platform", path: "/platform" },
]);

export default function Platform({ content }: { content: SiteContent["platform"] }) {
  const { seo, hero, blocks, more, faq, cta } = content;
  const jsonLd = useMemo(() => [ORGANIZATION_JSONLD, faqJsonLd(faq.items), PLATFORM_BREADCRUMB], [faq.items]);
  return (
    <MarketingLayout>
      <Seo
        title={seo.title}
        description={seo.description}
        keywords="fertilizer trading software, fertilizer quoting platform, fertilizer container tracking, fertilizer market intelligence, AI procurement agriculture, fertilizer invoice financing"
        path="/platform"
        image={hero.image || undefined}
        jsonLd={jsonLd}
      />

      {/* Video hero */}
      <VideoHero src={hero.video} poster={hero.image} videoLabel={hero.label} center>
        <Reveal>
          <h1 className="aqf-hero-title mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">{hero.title}</h1>
          {hero.body ? <p className="aqf-hero-sub mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed sm:text-xl">{hero.body}</p> : null}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {hero.primaryLabel ? (
              <SiteLink
                href={hero.primaryLink || "/login"}
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

      {/* Feature blocks, text and visuals alternate */}
      {blocks.items.map((b, i) => (
        <section key={i} className={i % 2 ? "border-y border-border bg-white dark:bg-transparent" : ""}>
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-16 lg:grid-cols-2 lg:gap-20">
            <Reveal className={i % 2 ? "lg:order-2" : ""}>
              {b.kicker ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_2px_6px_-2px_rgb(63_115_100/0.4)] dark:bg-teal-500/15 dark:text-teal-300 dark:shadow-none">
                  <SiteIcon name={b.icon} className="h-3.5 w-3.5" /> {b.kicker}
                </div>
              ) : null}
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-navy-900 dark:text-white">{b.title}</h2>
              {b.body ? <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{b.body}</p> : null}
              <ul className="mt-6 space-y-3">
                {splitLines(b.points).map((p, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm font-medium text-navy-800 dark:text-slate-200">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                      <Check className="h-3 w-3" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} className={i % 2 ? "lg:order-1" : ""}>
              {b.video ? (
                <FramedVideo src={b.video} poster={b.image} label={b.label} caption={b.caption} ratio="aspect-video" />
              ) : b.image ? (
                <FramedImage src={b.image} alt={b.label} caption={b.caption} />
              ) : null}
            </Reveal>
          </div>
        </section>
      ))}

      {/* More capabilities */}
      {more.items.length ? (
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader kicker={more.kicker} title={more.title} sub={more.sub} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {more.items.map((m, i) => (
              <Reveal key={i} delay={(i % 3) * 80} className="h-full">
                <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                  <SiteIcon name={m.icon} className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                  <h3 className="mt-4 text-[15px] font-semibold text-navy-900 dark:text-white">{m.title}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{m.desc}</p>
                  <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 px-3.5 py-1.5 text-[12px] font-semibold text-navy-700 transition-colors group-hover:border-teal-600 group-hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:group-hover:text-teal-400">
                    Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* Platform FAQ, answer-first for search and AI answer engines */}
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

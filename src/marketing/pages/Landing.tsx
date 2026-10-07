"use client";

/**
 * Landing, video-led, statement-driven marketing grammar.
 * Price slider stays on top; every scroll block pairs bold display type with
 * ambient fertilizer-trade footage and pill CTAs.
 * Chrome (header, footer) lives in LandingLayout. Wording and media come from the
 * admin's Public website editor.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import type { SiteContent } from "@/lib/site-content/schema";
import { LandingLayout } from "@/marketing/components/LandingLayout";
import { MediaCard } from "@/marketing/components/shared/MediaCard";
import { SiteLink } from "@/marketing/components/shared/SiteLink";
import { Seo, ORGANIZATION_JSONLD } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd } from "@/marketing/components/shared/Faq";
import { CookieConsent } from "@/marketing/components/CookieConsent";
import { LeadMagnet, MarketUpdatesCard } from "@/marketing/components/LeadMagnet";
import { SiteIcon } from "@/marketing/lib/site-icons";

type Home = SiteContent["home"];

/* ---------------------------------------------------------------- */
/* Reveal: 12px rise, 320ms, once, staggered via delay               */
/* ---------------------------------------------------------------- */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${visible ? "aql-reveal-in" : "aql-reveal"} ${className}`}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

const PILL_TEAL = "inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400";
const PILL_OUTLINE = "inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/10";
const TEXT_LINK = "text-sm font-semibold text-white underline-offset-4 hover:underline";

/* ---------------------------------------------------------------- */
/* 2, Hero: full-bleed video, oversized statement, pill CTAs        */
/* ---------------------------------------------------------------- */
function Hero({ c }: { c: Home["hero"] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };
  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      {c.image ? (
        <img
          src={c.image}
          alt=""
          aria-hidden="true"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className={`${c.video ? "aql-hero-still" : ""} absolute inset-0 -z-20 h-full w-full object-cover`}
        />
      ) : null}
      {c.video ? (
        <video
          key={c.video}
          ref={videoRef}
          className="aql-hero-video absolute inset-0 -z-10 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={c.image || undefined}
          role="img"
          aria-label={c.label || undefined}
        >
          <source src={c.video} type="video/mp4" />
        </video>
      ) : null}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-navy-900/40 to-navy-900/30" aria-hidden />
      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-24 sm:min-h-[84vh] sm:px-6">
        <Reveal>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-7xl">{c.title}</h1>
          {c.body ? <p className="mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed text-white">{c.body}</p> : null}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {c.primaryLabel ? (
              <SiteLink href={c.primaryLink || "/"} className={PILL_TEAL}>
                {c.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </SiteLink>
            ) : null}
            {c.secondaryLabel ? (
              <SiteLink href={c.secondaryLink || "/"} className={PILL_OUTLINE}>
                {c.secondaryLabel}
              </SiteLink>
            ) : null}
            {c.tertiaryLabel ? (
              <SiteLink href={c.tertiaryLink || "/"} className={TEXT_LINK}>
                {c.tertiaryLabel}
              </SiteLink>
            ) : null}
          </div>
        </Reveal>
      </div>
      {c.video ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? "Play background video" : "Pause background video"}
          className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-navy-900/60 text-white transition-colors hover:bg-navy-900/80"
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 4, Video collage: the trade in motion                            */
/* ---------------------------------------------------------------- */
function TradeInMotion({ c }: { c: Home["motion"] }) {
  return (
    <section className="bg-white" aria-labelledby="motion-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          {c.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">{c.kicker}</p> : null}
          <h2 id="motion-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            {c.title}
          </h2>
          {c.body ? <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">{c.body}</p> : null}
        </Reveal>
        {c.cards.length ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.cards.map((card, i) => (
              <Reveal key={i} delay={(i % 4) * 70} className="h-full">
                <MediaCard video={card.video} poster={card.image} label={card.label} tagline={card.tagline} cta={card.cta} to={card.link || "/"} />
              </Reveal>
            ))}
          </div>
        ) : null}
        {c.wideTagline ? (
          <Reveal delay={120}>
            <div className="mt-5">
              <MediaCard
                video={c.wideVideo}
                poster={c.wideImage}
                label={c.wideLabel}
                tagline={c.wideTagline}
                cta={c.wideCta}
                to={c.wideLink || "/"}
                ratio="aspect-[16/7]"
              />
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 5, Aquifert ONE platform grid                                    */
/* ---------------------------------------------------------------- */
function OnePlatform({ c }: { c: Home["platform"] }) {
  const to = c.primaryLink || "/platform";
  return (
    <section className="border-b border-slate-200 bg-white" aria-labelledby="one-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          {c.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">{c.kicker}</p> : null}
          <h2 id="one-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            {c.title}
          </h2>
          {c.body ? <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">{c.body}</p> : null}
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.features.map((f, i) => (
            <Reveal key={i} delay={(i % 3) * 60} className="h-full">
              <SiteLink
                href={to}
                aria-label={`Learn more about ${f.title} on the Aquifert ONE fertilizer trading platform`}
                className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-navy-700 hover:shadow-lg"
              >
                <SiteIcon name={f.icon} className="h-5 w-5 text-teal-700" />
                <h3 className="mt-4 text-[15px] font-semibold text-navy-900">{f.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{f.desc}</p>
                <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 px-3.5 py-1.5 text-[12px] font-semibold text-navy-700 transition-colors group-hover:border-teal-600 group-hover:text-teal-700">
                  Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </SiteLink>
            </Reveal>
          ))}
        </div>
        {c.primaryLabel ? (
          <Reveal delay={120}>
            <SiteLink
              href={to}
              className="mt-12 inline-flex items-center rounded-full bg-navy-700 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              {c.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </SiteLink>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 6, Products & services                                           */
/* ---------------------------------------------------------------- */
function ProductsServices({ c }: { c: Home["products"] }) {
  return (
    <section className="bg-white" aria-labelledby="products-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          {c.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">{c.kicker}</p> : null}
          <h2 id="products-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            {c.title}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {c.items.map((p, i) => (
            <Reveal key={i} delay={(i % 3) * 70} className="h-full">
              <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
                {p.image ? (
                  <div className="overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.alt}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-[15px] font-semibold text-navy-900">{p.title}</h3>
                  {p.desc ? <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{p.desc}</p> : null}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 7, Why choose Aquifert                                           */
/* ---------------------------------------------------------------- */
function WhyAquifert({ c }: { c: Home["why"] }) {
  return (
    <section className="border-y border-slate-200 bg-white" aria-labelledby="why-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          {c.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">{c.kicker}</p> : null}
          <h2 id="why-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            {c.title}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {c.items.map((w, i) => (
            <Reveal key={i} delay={(i % 3) * 60}>
              <h3 className="border-t-2 border-navy-700 pt-4 text-[15px] font-semibold text-navy-900">{w.title}</h3>
              {w.desc ? <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{w.desc}</p> : null}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 8, For sellers / for buyers                                      */
/* ---------------------------------------------------------------- */
function SellersBuyers({ c }: { c: Home["audiences"] }) {
  const [side, setSide] = useState<"left" | "right">("left");
  const panel = (title: string, items: Home["audiences"]["leftItems"]) => (
    <div>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <ul className="mt-5 space-y-5">
        {items.map((item, i) => (
          <li key={i}>
            <p className="text-[14px] font-semibold text-navy-800">{item.title}</p>
            {item.desc ? <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{item.desc}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
  const left = panel(c.leftTitle, c.leftItems);
  const right = panel(c.rightTitle, c.rightItems);
  return (
    <section className="bg-white" aria-labelledby="sb-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          {c.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">{c.kicker}</p> : null}
          <h2 id="sb-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            {c.title}
          </h2>
        </Reveal>
        {/* Mobile segmented toggle */}
        <div className="mt-8 inline-flex rounded-full border border-slate-200 p-1 sm:hidden" role="tablist" aria-label="Audience">
          {(["left", "right"] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={side === key}
              onClick={() => setSide(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${side === key ? "bg-navy-700 text-white" : "text-slate-600"}`}
            >
              {key === "left" ? c.leftTitle : c.rightTitle}
            </button>
          ))}
        </div>
        <div className="mt-8 sm:hidden">
          <Reveal>{side === "left" ? left : right}</Reveal>
        </div>
        <div className="mt-12 hidden gap-12 sm:grid sm:grid-cols-2">
          <Reveal>{left}</Reveal>
          <Reveal delay={60}>{right}</Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 9, Membership teaser band                                        */
/* ---------------------------------------------------------------- */
function MembershipBand({ c }: { c: Home["zero"] }) {
  return (
    <section className="bg-white" aria-labelledby="membership-band-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-14 sm:px-12 sm:py-20">
          <Reveal>
            {c.kicker ? <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-300">{c.kicker}</p> : null}
            <h2 id="membership-band-heading" className="mt-4 max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              {c.title}
            </h2>
            {c.body ? <p className="mt-5 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-white">{c.body}</p> : null}
            <div className="mt-9 flex flex-wrap items-center gap-4">
              {c.primaryLabel ? (
                <SiteLink href={c.primaryLink || "/membership"} className={PILL_TEAL}>
                  {c.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </SiteLink>
              ) : null}
              {c.note ? <span className="text-[13px] font-medium text-white">{c.note}</span> : null}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 9b, FAQ: answer-first copy for search and AI answer engines       */
/* ---------------------------------------------------------------- */
function HomeFaq({ c }: { c: Home["faq"] }) {
  return (
    <section className="border-t border-slate-200 bg-white" aria-labelledby="home-faq-heading">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader kicker={c.kicker} title={c.title} sub={c.sub} center />
        <Reveal delay={100} className="mt-10">
          <Faq items={c.items} />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 10, Closing CTA band                                             */
/* ---------------------------------------------------------------- */
function ClosingCta({ c }: { c: Home["closing"] }) {
  return (
    <section className="bg-navy-900" aria-labelledby="cta-heading">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 border-t border-white/10 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-20">
        <Reveal>
          <h2 id="cta-heading" className="max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {c.title}
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <div className="flex flex-wrap items-center gap-5">
            {c.primaryLabel ? (
              <SiteLink
                href={c.primaryLink || "/"}
                className="inline-flex items-center rounded-full bg-teal-500 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
              >
                {c.primaryLabel} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </SiteLink>
            ) : null}
            {c.secondaryLabel ? (
              <SiteLink href={c.secondaryLink || "/"} className={TEXT_LINK}>
                {c.secondaryLabel}
              </SiteLink>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
export default function Landing({ content }: { content: Home }) {
  const jsonLd = useMemo(() => [ORGANIZATION_JSONLD, faqJsonLd(content.faq.items)], [content.faq.items]);
  return (
    <LandingLayout>
      <Seo
        title={content.seo.title}
        description={content.seo.description}
        keywords="fertilizer trading platform, B2B fertilizer marketplace, buy fertilizer UK, water-soluble fertilizer suppliers, fertilizer landed cost, urea DAP MOP MAP NPK prices, fertilizer container tracking, fertilizer invoice financing"
        path="/"
        image={content.hero.image || undefined}
        jsonLd={jsonLd}
      />

      <Hero c={content.hero} />
      <TradeInMotion c={content.motion} />
      <OnePlatform c={content.platform} />
      <ProductsServices c={content.products} />
      <WhyAquifert c={content.why} />
      <SellersBuyers c={content.audiences} />
      <MembershipBand c={content.zero} />
      <HomeFaq c={content.faq} />
      <ClosingCta c={content.closing} />

      {/* Inline updates card, only for visitors who declined marketing cookies */}
      <MarketUpdatesCard />

      {/* Consent banner; the lead form opens only from "Request access" (auto-popup hidden for exploratory phase) */}
      <CookieConsent />
      <LeadMagnet auto={false} />
    </LandingLayout>
  );
}

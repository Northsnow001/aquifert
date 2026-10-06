"use client";

/**
 * Landing, video-led, statement-driven marketing grammar.
 * Price slider stays on top; every scroll block pairs bold display type with
 * ambient fertilizer-trade footage and pill CTAs.
 * Chrome (header, footer) lives in LandingLayout.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/marketing/router";
import {
  ArrowRight, BookOpen, Bot, Calculator, Compass,
  FileStack, LineChart, Pause, Play, Radio, Route, Ship,
} from "lucide-react";
import { LandingLayout } from "@/marketing/components/LandingLayout";
import { MediaCard } from "@/marketing/components/shared/MediaCard";
import { Seo, ORGANIZATION_JSONLD } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd, type FaqItem } from "@/marketing/components/shared/Faq";
import { CookieConsent } from "@/marketing/components/CookieConsent";
import { LeadMagnet, MarketUpdatesCard } from "@/marketing/components/LeadMagnet";

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

/* ---------------------------------------------------------------- */
/* 2, Hero: full-bleed video, oversized statement, pill CTAs        */
/* ---------------------------------------------------------------- */
function Hero() {
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
      <img
        src="/media/hero-ship-containers.jpg"
        alt=""
        aria-hidden="true"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="aql-hero-still absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <video
        ref={videoRef}
        className="aql-hero-video absolute inset-0 -z-10 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/hero-ship-containers.jpg"
        role="img"
        aria-label="Container ship loaded with fertilizer cargo being unloaded by port cranes"
      >
        <source src="/media/hero-ship-containers.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/85 via-navy-900/40 to-navy-900/30" aria-hidden />
      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-24 sm:min-h-[84vh] sm:px-6">
        <Reveal>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-7xl">
            Connecting Clients in the Global Fertiliser Market
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white">
            Aquifert takes a completely new and unique approach to fertiliser supply.
            We give you live information, advisory on the market from our propriety
            sources. Backed by 3 decades of experience to let you make informed
            decisions easily. To compliment advisory, we provide fertiliser delivered
            with a completely transparent cost structure. No hidden margins with
            option of a compelling client pricing.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/platform"
              className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              Explore Aquifert ONE for ZERO Cost <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/membership"
              className="inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/10"
            >
              Become Globally Informed for FREE
            </Link>
            <a
              href="mailto:enquiry@aquifert.com"
              className="text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              Talk to the Fertiliser desk
            </a>
          </div>
        </Reveal>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play background video" : "Pause background video"}
        className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-navy-900/60 text-white transition-colors hover:bg-navy-900/80"
      >
        {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
      </button>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 4, Video collage: the trade in motion                            */
/* ---------------------------------------------------------------- */
function TradeInMotion() {
  return (
    <section className="bg-white" aria-labelledby="motion-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            Analytics for informed decisions, margin-free trading, &ldquo;at cost&rdquo; fertiliser
          </p>
          <h2
            id="motion-heading"
            className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl"
          >
            AQ ONE offers premier analytics
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
            AQ ONE is the HUB where you can see daily market moving news coupled
            with expert trader commentary
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal className="h-full">
            <MediaCard
              video="/media/port-terminal.mp4"
              poster="/media/port-terminal.jpg"
              label="Gantry cranes loading fertilizer cargo at a bulk port terminal"
              tagline="ZERO Guessing - ZERO extra costs"
              cta="Check AQ ONE Hub"
              to="/platform"
            />
          </Reveal>
          <Reveal delay={70} className="h-full">
            <MediaCard
              video="/media/ship-ocean.mp4"
              poster="/media/ship-ocean.jpg"
              label="Loaded bulk carrier moving through open ocean"
              tagline="In the Warehouse"
              cta="Market analytics"
              to="/platform"
            />
          </Reveal>
          <Reveal delay={140} className="h-full">
            <MediaCard
              video="/media/greenhouse-tomatoes.mp4"
              poster="/media/greenhouse-tomatoes.jpg"
              label="Tomato plants growing under fertigation in a modern greenhouse"
              tagline="Into the glasshouse"
              cta="Why Aquifert"
              to="/why-aquifert"
            />
          </Reveal>
          <Reveal delay={210} className="h-full">
            <MediaCard
              video="/media/fields-aerial.mp4"
              poster="/media/fields-aerial.jpg"
              label="Aerial view over cultivated green fields at golden hour"
              tagline="To every field"
              cta="Join the members"
              to="/membership"
            />
          </Reveal>
        </div>
        <Reveal delay={120}>
          <div className="mt-5">
            <MediaCard
              video="/media/fields-sunrise.mp4"
              poster="/media/fields-sunrise.jpg"
              label="Misty sunrise over farmland seen from the air"
              tagline="Not just yield-focused — optimal output"
              cta="Explore AQ ONE Free"
              to="/why-aquifert"
              ratio="aspect-[16/7]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 5, Aquifert ONE platform grid                                    */
/* ---------------------------------------------------------------- */
const ONE_FEATURES = [
  { icon: Radio, title: "TELEX Intelligence", desc: "Desk-issued market flashes and structured trade signals, delivered the moment they clear review." },
  { icon: Ship, title: "Trend Analytics", desc: "Handysize to container rates by lane, with landed-cost impact per tonne." },
  { icon: LineChart, title: "AQ View", desc: "Region-filtered price indications across nitrogen, phosphates and potash." },
  { icon: FileStack, title: "Vantage Files & Hedges", desc: "Contract files, hedge positions and exposure summaries in one governed workspace." },
  { icon: Route, title: "Voyage Analytics", desc: "Milestone-by-milestone voyage performance, exceptions and revised ETAs." },
  { icon: Bot, title: "Aquibot AI Assistant", desc: "AI-drafted quotes, summaries and answers, always human-approved before anything sends." },
  { icon: Calculator, title: "Freight Calculator", desc: "Instant cost-to-cost estimates: product, ocean freight, clearing and duties." },
  { icon: BookOpen, title: "Tools", desc: "Structured learning on fertilizer trade, Incoterms and risk management." },
  { icon: Compass, title: "Order Desk", desc: "Live order book with margin-gated pricing and full audit trail." },
];

function OnePlatform() {
  return (
    <section className="border-b border-slate-200 bg-white" aria-labelledby="one-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            Aquifert ONE
          </p>
          <h2 id="one-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            AQ ONE - Your Free workspace for an informed choice.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            Trader tools for fertiliser price management
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ONE_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 60} className="h-full">
              <Link
                to="/platform"
                aria-label={`Learn more about ${f.title} on the Aquifert ONE fertilizer trading platform`}
                className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-navy-700 hover:shadow-lg"
              >
                <f.icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
                <h3 className="mt-4 text-[15px] font-semibold text-navy-900">{f.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{f.desc}</p>
                <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 px-3.5 py-1.5 text-[12px] font-semibold text-navy-700 transition-colors group-hover:border-teal-600 group-hover:text-teal-700">
                  Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <Link
            to="/platform"
            className="mt-12 inline-flex items-center rounded-full bg-navy-700 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Explore Aquifert ONE <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 6, Products & services                                           */
/* ---------------------------------------------------------------- */
const PRODUCTS_SERVICES = [
  {
    title: "Water soluble fertilizers",
    desc: "Enrich our growing community, fully soluble Urea, DAP, MOP, MAP and NPK grades for fertigation and foliar programmes.",
    img: "/media/greenhouse-tomatoes.jpg",
    alt: "Tomatoes growing in a greenhouse under fertigation",
  },
  {
    title: "Micronutrients",
    desc: "Aquifert offers micronutrients, including Zinc and Iron for high value crops.",
    img: "/media/fields-sunrise.jpg",
    alt: "Sunrise over cultivated fields",
  },
  {
    title: "Market Analysis",
    desc: "Agricultural supply chain and global network, sourcing, ocean freight, clearing and delivery managed end to end.",
    img: "/media/port-terminal.jpg",
    alt: "Bulk cargo terminal at a port",
  },
];

function ProductsServices() {
  return (
    <section className="bg-white" aria-labelledby="products-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            What we trade
          </p>
          <h2 id="products-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            Products &amp; services
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PRODUCTS_SERVICES.map((p, i) => (
            <Reveal key={p.title} delay={i * 70} className="h-full">
              <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
                <div className="overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.alt}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-[15px] font-semibold text-navy-900">{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{p.desc}</p>
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
const WHY = [
  { title: "Global expertise", desc: "Aquifert has a global view of the fertiliser market we aim to keep our clients completely up to date. This enables informed purchasing decisions and an effective way to manage prices over seasons." },
  { title: "Transparency on Prices", desc: "Know the actual costs, know the market. Manage your prices and be informed about market moves." },
  { title: "Restricted Client roster", desc: "We have learnt we cannot be a one stop shop for everyone. Aquifert focuses on supporting and serving a specific client base." },
  { title: "Due diligence", desc: "Every counterparty vetted before a single quote is exchanged, nothing reaches either side unreviewed." },
  { title: "30+ years' trading experience", desc: "A desk that has traded through cycles, shocks and shortages across two decades." },
  { title: "Quality assurance", desc: "Specification-checked product with documentation verified at every stage of the trade." },
];

function WhyAquifert() {
  return (
    <section className="border-y border-slate-200 bg-white" aria-labelledby="why-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            The Aquifert difference
          </p>
          <h2 id="why-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            Why the trade chooses Aquifert
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={(i % 3) * 60}>
              <h3 className="border-t-2 border-navy-700 pt-4 text-[15px] font-semibold text-navy-900">{w.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{w.desc}</p>
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
const SELLERS = [
  { title: "Reach", desc: "Reach vetted buyers in new regions without building a local sales force." },
  { title: "Supplier vetting", desc: "Reaching vetted genuine suppliers. Actionable prices delivered weekly. All prices tailored to your specific quality, quantity, packing and destination. To your whatsapp or email. No guessing." },
  { title: "Trading support", desc: "Documentation, logistics and financing handled in our portal or in your existing channel. No gimmicks, updated on a schedule of your choice." },
];
const BUYERS = [
  { title: "Full portfolio access", desc: "Water solubles, micronutrients and bulk commodities from vetted global producers." },
  { title: "Supplier identification", desc: "We match your specification to the right producer, without ever exposing either side." },
  { title: "Competitive pricing", desc: "Cost-to-cost transparency with membership instead of hidden margin." },
];

function SellersBuyers() {
  const [side, setSide] = useState<"sellers" | "buyers">("sellers");
  const panel = (title: string, items: typeof SELLERS) => (
    <div>
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <ul className="mt-5 space-y-5">
        {items.map((i) => (
          <li key={i.title}>
            <p className="text-[14px] font-semibold text-navy-800">{i.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{i.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section className="bg-white" aria-labelledby="sb-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            Two sides, one desk
          </p>
          <h2 id="sb-heading" className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-5xl">
            Built for Fertiliser delivery and Market Analysis
          </h2>
        </Reveal>
        {/* Mobile segmented toggle */}
        <div className="mt-8 inline-flex rounded-full border border-slate-200 p-1 sm:hidden" role="tablist" aria-label="Audience">
          {(["sellers", "buyers"] as const).map((s_) => (
            <button
              key={s_}
              role="tab"
              aria-selected={side === s_}
              onClick={() => setSide(s_)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                side === s_ ? "bg-navy-700 text-white" : "text-slate-600"
              }`}
            >
              {s_ === "sellers" ? "For Fertiliser" : "For Analysis"}
            </button>
          ))}
        </div>
        <div className="mt-8 sm:hidden">
          <Reveal>{side === "sellers" ? panel("For Fertiliser", SELLERS) : panel("For Analysis", BUYERS)}</Reveal>
        </div>
        <div className="mt-12 hidden gap-12 sm:grid sm:grid-cols-2">
          <Reveal>{panel("For Fertiliser", SELLERS)}</Reveal>
          <Reveal delay={60}>{panel("For Analysis", BUYERS)}</Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 9, Membership teaser band                                        */
/* ---------------------------------------------------------------- */
function MembershipBand() {
  return (
    <section className="bg-white" aria-labelledby="membership-band-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-14 sm:px-12 sm:py-20">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-300">
              AQ ZERO
            </p>
            <h2
              id="membership-band-heading"
              className="mt-4 max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl"
            >
              One Place. Every fertiliser market.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white">
              AQ ZERO Clients source at supplier cost plus pass-through freight and a stated fee,
              full document trail. Choose the tier that matches your tonnage. Our AQ Analytics
              ensure an informed choice and is included with ZERO.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/membership"
                className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
              >
                AQ ZERO plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <span className="text-[13px] font-medium text-white">
                Set fees · cancel anytime
              </span>
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
const HOME_FAQ: FaqItem[] = [
  {
    q: "What is Aquifert?",
    a: "Aquifert is a UK-based B2B fertilizer trading platform that connects vetted fertilizer buyers and producers through one governed workspace. It covers water-soluble and specialty fertilizers as well as Urea, DAP, MOP, MAP and NPK, with AI-drafted quotes, live container tracking and market intelligence built in.",
  },
  {
    q: "How does Aquifert fertilizer pricing work?",
    a: "Aquifert replaces the traditional trader's per-tonne margin with a flat membership fee. Members see the full landed-cost breakdown on every quote, product, ocean freight, clearing and duties, so they buy at true cost. AQ Zero Sprout, AQ Zero Harvest and AQ Zero Scale tiers scale with monthly tonnage.",
  },
  {
    q: "Which fertilizers can I source through Aquifert?",
    a: "Members source water-soluble fertilizers, micronutrients such as Zinc and Iron, and bulk commodity grades including Urea, DAP, MAP, MOP and NPK, shipped containerised or in bulk from vetted producers in the Middle East, North Africa, Europe and Asia.",
  },
  {
    q: "How does Aquifert protect buyers and suppliers?",
    a: "Every party passes KYC/KYB due diligence before trading. Buyers and suppliers never see each other's identity, every document is scanned for supplier-identifying information and cleared by a human before release, and AI-drafted messages are approved by staff before anything is sent.",
  },
];

const HOME_FAQ_SCHEMA = faqJsonLd(HOME_FAQ);

function HomeFaq() {
  return (
    <section className="border-t border-slate-200 bg-white" aria-labelledby="home-faq-heading">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          kicker="Questions, answered"
          title="Fertilizer trading on Aquifert, FAQ"
          sub="What the platform is, how pricing works, what you can source and how both sides are protected."
          center
        />
        <Reveal delay={100} className="mt-10">
          <Faq items={HOME_FAQ} />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* 10, Closing CTA band                                             */
/* ---------------------------------------------------------------- */
function ClosingCta() {
  return (
    <section className="bg-navy-900" aria-labelledby="cta-heading">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 border-t border-white/10 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-20">
        <Reveal>
          <h2 id="cta-heading" className="max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Knowledge & Fertiliser Delivered
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              to="/platform"
              className="inline-flex items-center rounded-full bg-teal-500 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              Register of AQ ZERO <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="mailto:enquiry@aquifert.com"
              className="text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              Contact us
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
export default function Landing() {
  return (
    <LandingLayout>
      <Seo
        title="Aquifert, B2B Fertilizer Trading Platform | True Landed Cost, Tracked to Your Gate"
        description="Aquifert is the UK-based B2B fertilizer trading platform where membership replaces margin. Source water-soluble fertilizer, Urea, DAP, MOP, MAP and NPK from vetted global producers, with AI-drafted quotes, live container tracking and invoice financing."
        keywords="fertilizer trading platform, B2B fertilizer marketplace, buy fertilizer UK, water-soluble fertilizer suppliers, fertilizer landed cost, urea DAP MOP MAP NPK prices, fertilizer container tracking, fertilizer invoice financing"
        path="/"
        jsonLd={[ORGANIZATION_JSONLD, HOME_FAQ_SCHEMA]}
      />

      {/* 2, Video hero */}
      <Hero />

      {/* 4, Video collage */}
      <TradeInMotion />

      {/* 5, Aquifert ONE */}
      <OnePlatform />

      {/* 6, Products & services */}
      <ProductsServices />

      {/* 7, Why choose Aquifert */}
      <WhyAquifert />

      {/* 8, For sellers / for buyers */}
      <SellersBuyers />

      {/* 9, Membership band */}
      <MembershipBand />

      {/* 9b, FAQ */}
      <HomeFaq />

      {/* 10, Closing CTA */}
      <ClosingCta />

      {/* Inline updates card, only for visitors who declined marketing cookies */}
      <MarketUpdatesCard />

      {/* Consent banner; the lead form opens only from "Request access" (auto-popup hidden for exploratory phase) */}
      <CookieConsent />
      <LeadMagnet auto={false} />
    </LandingLayout>
  );
}

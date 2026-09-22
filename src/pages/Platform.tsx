import { ArrowRight, Check, LineChart, Ship, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "react-router";
import { MarketingLayout, CtaBand } from "@/components/MarketingLayout";
import { Reveal } from "@/components/shared/Reveal";
import { FramedImage } from "@/components/shared/FramedImage";
import { FramedVideo, VideoHero } from "@/components/shared/VideoHero";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd, type FaqItem } from "@/components/shared/Faq";

const PLATFORM_FAQ: FaqItem[] = [
  {
    q: "What does the Aquifert fertilizer trading platform do?",
    a: "Aquifert ONE is the workspace for the fertilizer trade. It turns WhatsApp and email inquiries into structured deal cards, generates quotes with transparent landed-cost breakdowns, tracks every container across ten live milestones, and adds market intelligence, freight analytics and invoice financing in the same flow.",
  },
  {
    q: "How are fertilizer quotes produced on Aquifert?",
    a: "The desk's AI drafts each quote from live market data and freight rates, but nothing sends automatically. A human approver reviews every message, checks the margin maths, and only then does the quote reach the buyer. The engine flags; a human clears.",
  },
  {
    q: "Can buyers and suppliers see each other on Aquifert?",
    a: "No. Buyers and suppliers never see each other's identity. Every document is scanned for supplier-identifying information against a protected registry and must be cleared by a human before a buyer can receive it.",
  },
  {
    q: "Does Aquifert track fertilizer shipments live?",
    a: "Yes. Every consignment moves through a 14-stage tracker from factory gate to farm gate, with freight forwarders sending booking and shipping updates that buyers see in real time.",
  },
];

const PLATFORM_FAQ_SCHEMA = faqJsonLd(PLATFORM_FAQ);
const PLATFORM_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Platform", path: "/platform" },
]);

type Block = {
  icon: typeof Ship;
  kicker: string;
  title: string;
  body: string;
  points: string[];
  image?: { src: string; alt: string; caption: string };
  video?: { src: string; poster: string; label: string; caption: string };
};

const BLOCKS: Block[] = [
  {
    icon: Ship,
    kicker: "Logistics tracker",
    title: "Live fertilizer tracking from port of loading to your gate",
    body: "Every fertilizer order carries a live shipment record: container, vessel, carrier and bill of lading, plotted on a map from Shanghai to Felixstowe. Ten milestones, from gate-in to out-for-delivery, with exception alerts and revised ETAs surfaced before you have to ask.",
    points: ["Ten milestone checkpoints with live map position", "Delay detection with revised ETA alerts", "Documents, B/L, invoices, packing lists, on the order record"],
    video: { src: "/media/ship-ocean.mp4", poster: "/media/ship-ocean.jpg", label: "Loaded bulk carrier moving through open ocean", caption: "Factory to port to buyer, on time and visible." },
  },
];

const MORE = [
  { icon: LineChart, title: "Fertilizer Market Insights Engine", desc: "26 weeks of fertilizer price history across five commodities and four regions, regional heatmaps, volatility indicators and AI-generated trade recommendations, broadcast to members on a schedule." },
  { icon: Wallet, title: "Fertilizer invoice financing", desc: "Harvest and Scale members finance up to 85% of a fertilizer invoice over 30, 60 or 90 days, with e-signature and automated repayment schedules." },
  { icon: ShieldCheck, title: "Governance built in", desc: "Role-based access for admin, operations, finance, support, buyers and suppliers, with margins visible only to the roles that should see them." },
];

export default function Platform() {
  return (
    <MarketingLayout>
      <Seo
        title="Fertilizer Trading Platform Features, AI Quotes, Live Tracking & Market Intelligence | Aquifert"
        description="Explore the Aquifert fertilizer trading platform: an AI communication hub that turns WhatsApp and email inquiries into deal cards, a quoting engine with transparent landed-cost breakdowns, live container tracking across ten milestones, fertilizer market intelligence and invoice financing."
        keywords="fertilizer trading software, fertilizer quoting platform, fertilizer container tracking, fertilizer market intelligence, AI procurement agriculture, fertilizer invoice financing"
        path="/platform"
        jsonLd={[ORGANIZATION_JSONLD, PLATFORM_FAQ_SCHEMA, PLATFORM_BREADCRUMB]}
      />

      {/* Video hero */}
      <VideoHero
        src="/media/port-terminal.mp4"
        poster="/media/port-terminal.jpg"
        videoLabel="Aerial view of a container terminal moving fertilizer cargo through a seaport"
        center
      >
        <Reveal>
          <h1 className="aqf-hero-title mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            One platform for the entire fertilizer trade
          </h1>
          <p className="aqf-hero-sub mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
            The workspace for teams buying, selling and shipping specialty fertilizer, 
            market intelligence, freight context, documents and AI assistance in a single flow.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              See the live platform <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/membership"
              className="inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Become a member
            </Link>
          </div>
        </Reveal>
      </VideoHero>

      {/* Feature blocks, text and visuals alternate */}
      {BLOCKS.map((b, i) => (
        <section key={b.kicker} className={i % 2 ? "border-y border-border bg-white dark:bg-transparent" : ""}>
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-16 lg:grid-cols-2 lg:gap-20">
            <Reveal className={i % 2 ? "lg:order-2" : ""}>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_2px_6px_-2px_rgb(63_115_100/0.4)] dark:bg-teal-500/15 dark:text-teal-300 dark:shadow-none">
                <b.icon className="h-3.5 w-3.5" /> {b.kicker}
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-navy-900 dark:text-white">{b.title}</h2>
              <p className="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">{b.body}</p>
              <ul className="mt-6 space-y-3">
                {b.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm font-medium text-navy-800 dark:text-slate-200">
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
                <FramedVideo src={b.video.src} poster={b.video.poster} label={b.video.label} caption={b.video.caption} ratio="aspect-video" />
              ) : b.image ? (
                <FramedImage src={b.image.src} alt={b.image.alt} caption={b.image.caption} />
              ) : null}
            </Reveal>
          </div>
        </section>
      ))}

      {/* More capabilities */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader
          kicker="And the rest of the desk"
          title="Everything around the fertilizer trade, in the same workspace"
          sub="Intelligence, financing and governance ship with the platform, no bolt-ons, no extra vendors."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {MORE.map((m, i) => (
            <Reveal key={m.title} delay={i * 80} className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <m.icon className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
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

      {/* Platform FAQ, answer-first for search and AI answer engines */}
      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <SectionHeader
            kicker="Platform questions"
            title="How the fertilizer trading platform works, FAQ"
            sub="What Aquifert ONE does, how quotes are approved, and how both sides stay protected."
            center
          />
          <Reveal delay={120} className="mt-10">
            <Faq items={PLATFORM_FAQ} />
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="See the fertilizer platform working end to end"
        subtitle="Sign in and switch between the admin command center, buyer portal and supplier hub, all on live demo data."
        ctaLabel="Explore the live platform demo"
      />
    </MarketingLayout>
  );
}

import { ArrowRight, Check, Factory, Globe2, Handshake, Leaf, ShieldCheck, Ship, ShoppingCart } from "lucide-react";
import { Link } from "react-router";
import { MarketingLayout, CtaBand } from "@/components/MarketingLayout";
import { Reveal } from "@/components/shared/Reveal";
import { FramedVideo, VideoHero } from "@/components/shared/VideoHero";
import { MediaCard } from "@/components/shared/MediaCard";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd, type FaqItem } from "@/components/shared/Faq";

const WHY_FAQ: FaqItem[] = [
  {
    q: "Why choose Aquifert for fertilizer trading?",
    a: "Aquifert is built by fertilizer traders with more than twenty years of global trading experience. It combines strict KYC/KYB due diligence, an established shipping network from factories to ports to buyers, and a governed platform where AI drafts but humans approve every message.",
  },
  {
    q: "How does Aquifert help fertilizer buyers?",
    a: "Buyers get a one-stop shop for a full portfolio of specialty fertilizers at true landed cost, established suppliers only with quality control on every consignment, and competitive pricing enabled by Aquifert's global supply network.",
  },
  {
    q: "How does Aquifert help fertilizer suppliers?",
    a: "Suppliers reach vetted global fertilizer buyers and expand into new markets through a bilingual EN/中文 portal with AI-polished quotes and escrowed payouts, plus direct advisory support on supply chain execution from factory to port.",
  },
  {
    q: "Is Aquifert focused on sustainable fertilizer?",
    a: "Yes. Aquifert specialises in water-soluble and specialty fertilizer grades that raise yield per tonne, improving efficiency for both the supply chain and the field, and cutting waste per hectare.",
  },
];

const WHY_FAQ_SCHEMA = faqJsonLd(WHY_FAQ);
const WHY_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Why Aquifert", path: "/why-aquifert" },
]);

const WHY = [
  { icon: Globe2, title: "Global fertilizer market expertise", desc: "Deep coverage of nitrogen, phosphate and potash markets, fertilizer pricing, trade flows and supply signals across four regions." },
  { icon: Ship, title: "Established shipping network", desc: "Extensive fertilizer supply chain experience from factories to ports to buyers, with carriers we have worked with for years." },
  { icon: ShieldCheck, title: "Strict due diligence", desc: "We only deal with reputable parties. Every fertilizer buyer and supplier passes KYC/KYB checks before their first trade on the platform." },
  { icon: Handshake, title: "20+ years of fertilizer trading", desc: "More than two decades of global fertilizer trading experience behind every quote, route and recommendation." },
  { icon: Leaf, title: "Sustainability focus", desc: "Water-soluble and specialty fertilizer grades that raise yield per tonne, efficiency for the supply chain and the field." },
];

const BUYERS = [
  "A one-stop shop for a full portfolio of specialty fertilizers at true landed cost",
  "Established fertilizer suppliers only, quality control on every consignment",
  "Competitive fertilizer pricing enabled by our global supply network",
];

const SUPPLIERS = [
  "Reach vetted global fertilizer buyers and expand into new markets",
  "Bilingual EN/中文 portal with AI-polished quotes and escrowed payouts",
  "Direct advisory support on fertilizer supply chain execution, factory to port",
];

export default function WhyAquifert() {
  return (
    <MarketingLayout>
      <Seo
        title="Why Aquifert, 20+ Years of Fertilizer Trading Expertise, Transparent Supply Chains"
        description="Why fertilizer buyers and suppliers choose Aquifert: two decades of global fertilizer trading experience, strict KYC/KYB due diligence, an established shipping network and a sustainability focus on water-soluble grades that raise yield per tonne."
        keywords="why aquifert, fertilizer trading company UK, fertilizer supplier due diligence, sustainable fertilizer sourcing, agricultural supply chain expertise"
        path="/why-aquifert"
        jsonLd={[ORGANIZATION_JSONLD, WHY_FAQ_SCHEMA, WHY_BREADCRUMB]}
      />

      {/* Video hero */}
      <VideoHero
        src="/media/fields-sunrise.mp4"
        poster="/media/fields-sunrise.jpg"
        videoLabel="Misty sunrise over green farmland fields seen from the air"
      >
        <Reveal>
          <h1 className="aqf-hero-title max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            Sustainability for farming. <span className="text-teal-300">Efficiency for the supply chain.</span>
          </h1>
          <p className="aqf-hero-sub mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
            Aquifert brings both sides of the fertilizer trade into one transparent,
            well-governed marketplace, so good product moves faster, at fairer prices,
            with less waste from factory to field.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/platform"
              className="inline-flex items-center rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
            >
              Meet the platform <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/membership"
              className="inline-flex items-center rounded-full border border-white/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              See membership
            </Link>
          </div>
        </Reveal>
      </VideoHero>

      {/* Network video collage */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="network-heading">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            The network in motion
          </p>
          <h2 id="network-heading" className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-4xl">
            Ports, lanes and fields we move through every week
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal className="h-full">
            <MediaCard
              video="/media/port-terminal.mp4"
              poster="/media/port-terminal.jpg"
              label="Gantry cranes moving fertilizer cargo at a port terminal"
              tagline="Established port operations"
              cta="Explore the platform"
              to="/platform"
              ratio="aspect-[4/5]"
            />
          </Reveal>
          <Reveal delay={80} className="h-full">
            <MediaCard
              video="/media/ship-ocean.mp4"
              poster="/media/ship-ocean.jpg"
              label="Bulk carrier crossing open ocean with fertilizer cargo"
              tagline="Carrier lanes built over decades"
              cta="Freight analytics"
              to="/platform"
              ratio="aspect-[4/5]"
            />
          </Reveal>
          <Reveal delay={160} className="h-full sm:col-span-2 lg:col-span-1">
            <MediaCard
              video="/media/greenhouse-tomatoes.mp4"
              poster="/media/greenhouse-tomatoes.jpg"
              label="Tomatoes ripening in a fertigated greenhouse"
              tagline="Nutrition that reaches the crop"
              cta="Become a member"
              to="/membership"
              ratio="aspect-[4/5]"
            />
          </Reveal>
        </div>
      </section>

      {/* Why cards */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader
          kicker="The Aquifert difference"
          title="Built by fertilizer traders, governed like an institution"
          sub="Every feature exists because twenty years of fertilizer trading showed us where the industry leaks time, money and trust."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 60} className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <w.icon className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
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
          <SectionHeader
            kicker="How Aquifert helps"
            title="Professional services for both sides of the fertilizer trade"
            sub="Buyers get transparent landed cost. Suppliers get vetted demand and faster payout."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <ShoppingCart className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold text-navy-900 dark:text-white">For fertilizer buyers</h3>
                <ul className="mt-5 flex-1 space-y-3.5">
                  {BUYERS.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm font-medium leading-relaxed text-navy-800 dark:text-slate-200">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                        <Check className="h-3 w-3" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120} className="h-full">
              <div className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors hover:border-navy-700 dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500">
                <Factory className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold text-navy-900 dark:text-white">For fertilizer suppliers</h3>
                <ul className="mt-5 flex-1 space-y-3.5">
                  {SUPPLIERS.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm font-medium leading-relaxed text-navy-800 dark:text-slate-200">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                        <Check className="h-3 w-3" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Framed video + closing statement */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <FramedVideo
              src="/media/fields-aerial.mp4"
              poster="/media/fields-aerial.jpg"
              label="Aerial drone view over green agricultural fields growing crops with water-soluble fertilizer"
              caption="High-value crops depend on precise, water-soluble nutrition."
              ratio="aspect-video"
            />
          </Reveal>
          <Reveal delay={120}>
            <p className="text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Our growing community</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-4xl">
              Enriching our growing community
            </h2>
            <p className="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">
              From micronutrients like Zinc and Iron for high-value crops to bulk NPK programmes,
              we help growers, distributors and producers work from the same live picture, 
              quality assured at every step.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Growers and distributors buying at verified landed cost",
                "Producers reaching UK demand without broker layers",
                "Water-soluble grades that cut waste per hectare",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm font-medium text-navy-800 dark:text-slate-200">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Why FAQ, answer-first for search and AI answer engines */}
      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <SectionHeader
            kicker="Why Aquifert, questions"
            title="Why traders choose Aquifert, FAQ"
            sub="The experience behind the platform, what each side gains, and the sustainability focus."
            center
          />
          <Reveal delay={120} className="mt-10">
            <Faq items={WHY_FAQ} />
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Trade fertilizer with a partner you can verify"
        subtitle="Join the platform and see how transparent, well-governed fertilizer trading works in practice."
        ctaLabel="Start trading on Aquifert"
      />
    </MarketingLayout>
  );
}

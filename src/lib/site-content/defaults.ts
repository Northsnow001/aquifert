import { MEMBERSHIP_OFFERS, type MembershipOffer } from "@/lib/aq-modules/membership";
import { moduleInfo, type ModuleKey } from "@/lib/aq-modules/types";
import type { SiteContent } from "@/lib/site-content/schema";

const DESK_MAIL = "mailto:enquiry@aquifert.com";

const offer = (id: MembershipOffer["id"]) => MEMBERSHIP_OFFERS.find((item) => item.id === id)!;

function tierDefaults<T extends "sprout" | "harvest" | "scale">(tier: T, blurb: string) {
  const plan = offer(tier);
  return {
    [`${tier}Name`]: plan.name,
    [`${tier}Tagline`]: plan.tagline,
    [`${tier}Blurb`]: blurb,
    [`${tier}Features`]: plan.features.join("\n"),
    [`${tier}Missing`]: plan.missing.join("\n"),
  } as Record<`${T}Name` | `${T}Tagline` | `${T}Blurb` | `${T}Features` | `${T}Missing`, string>;
}

const moduleDefaults = (key: ModuleKey) => ({ name: moduleInfo(key).label, pitch: moduleInfo(key).pitch });
const TELEX = moduleDefaults("aq-telex");
const MARKET = moduleDefaults("market-data");
const SIGNAL = moduleDefaults("aq-signal-pro");
const FREIGHT = moduleDefaults("freight-analytics");
const BALANCE = moduleDefaults("supply-demand");
const BRIEFING = moduleDefaults("briefing");
const ALERTS = moduleDefaults("alerts");
const ANALYTICS = offer("analytics");

/** The wording the site launched with. Saved edits replace it section by section; "Reset" brings it back. */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  home: {
    seo: {
      title: "Aquifert - Knowledge | Fertiliser | Delivered - Informing decisions with transparency on your fertiliser sourcing",
      description:
        "Aquifert is the UK-based B2B fertiliser sourcing platform where membership replaces margin. Source water-soluble fertiliser, Urea, DAP, MOP, MAP and NPK from vetted global producers, with AI-drafted quotes, live container tracking and invoice financing.",
    },
    hero: {
      title: "Connecting Clients in the Global Fertiliser Market",
      body: "Aquifert takes a completely new and unique approach to fertiliser supply. We give you live information, advisory on the market from our propriety sources. Backed by 3 decades of experience to let you make informed decisions easily. To compliment advisory, we provide fertiliser delivered with a completely transparent cost structure. No hidden margins with option of a compelling client pricing.",
      primaryLabel: "Explore Aquifert ONE for ZERO Cost",
      primaryLink: "/platform",
      secondaryLabel: "Become Globally Informed for FREE",
      secondaryLink: "/membership",
      tertiaryLabel: "Talk to the Fertiliser desk",
      tertiaryLink: DESK_MAIL,
      video: "/media/hero-ship-containers.mp4",
      image: "/media/hero-ship-containers.jpg",
      label: "Container ship loaded with fertiliser cargo being unloaded by port cranes",
    },
    motion: {
      kicker: "Analytics for informed decisions, margin-free trading, “at cost” fertiliser",
      title: "AQ ONE offers premier analytics",
      body: "AQ ONE is the HUB where you can see daily market moving news coupled with expert trader commentary",
      cards: [
        { tagline: "ZERO Guessing - ZERO extra costs", cta: "Check AQ ONE Hub", link: "/platform", video: "/media/port-terminal.mp4", image: "/media/port-terminal.jpg", label: "Gantry cranes loading fertiliser cargo at a bulk port terminal" },
        { tagline: "In the Warehouse", cta: "Market analytics", link: "/platform", video: "/media/ship-ocean.mp4", image: "/media/ship-ocean.jpg", label: "Loaded bulk carrier moving through open ocean" },
        { tagline: "Into the glasshouse", cta: "Why Aquifert", link: "/why-aquifert", video: "/media/greenhouse-tomatoes.mp4", image: "/media/greenhouse-tomatoes.jpg", label: "Tomato plants growing under fertigation in a modern greenhouse" },
        { tagline: "To every field", cta: "Join the members", link: "/membership", video: "/media/fields-aerial.mp4", image: "/media/fields-aerial.jpg", label: "Aerial view over cultivated green fields at golden hour" },
      ],
      wideTagline: "Not just yield-focused — optimal output",
      wideCta: "Explore AQ ONE Free",
      wideLink: "/why-aquifert",
      wideVideo: "/media/fields-sunrise.mp4",
      wideImage: "/media/fields-sunrise.jpg",
      wideLabel: "Misty sunrise over farmland seen from the air",
    },
    platform: {
      kicker: "Aquifert ONE",
      title: "AQ ONE - Your Free workspace for an informed choice.",
      body: "Trader tools for fertiliser price management",
      features: [
        { icon: "radio", title: "TELEX Intelligence", desc: "Desk-issued market flashes and structured trade signals, delivered the moment they clear review." },
        { icon: "ship", title: "Trend Analytics", desc: "Handysize to container rates by lane, with landed-cost impact per tonne." },
        { icon: "line-chart", title: "AQ View", desc: "Region-filtered price indications across nitrogen, phosphates and potash." },
        { icon: "file-stack", title: "Vantage Files & Hedges", desc: "Contract files, hedge positions and exposure summaries in one governed workspace." },
        { icon: "route", title: "Voyage Analytics", desc: "Milestone-by-milestone voyage performance, exceptions and revised ETAs." },
        { icon: "bot", title: "Aquibot AI Assistant", desc: "AI-drafted quotes, summaries and answers, always human-approved before anything sends." },
        { icon: "calculator", title: "Freight Calculator", desc: "Instant cost-to-cost estimates: product, ocean freight, clearing and duties." },
        { icon: "book-open", title: "Tools", desc: "Structured learning on fertiliser trade, Incoterms and risk management." },
        { icon: "compass", title: "Order Desk", desc: "Live order book with margin-gated pricing and full audit trail." },
      ],
      primaryLabel: "Explore Aquifert ONE",
      primaryLink: "/platform",
    },
    products: {
      kicker: "What we trade",
      title: "Products & services",
      items: [
        { title: "Water soluble fertilisers", desc: "Enrich our growing community, fully soluble Urea, DAP, MOP, MAP and NPK grades for fertigation and foliar programmes.", image: "/media/greenhouse-tomatoes.jpg", alt: "Tomatoes growing in a greenhouse under fertigation" },
        { title: "Micronutrients", desc: "Aquifert offers micronutrients, including Zinc and Iron for high value crops.", image: "/media/fields-sunrise.jpg", alt: "Sunrise over cultivated fields" },
        { title: "Market Analysis", desc: "Agricultural supply chain and global network, sourcing, ocean freight, clearing and delivery managed end to end.", image: "/media/port-terminal.jpg", alt: "Bulk cargo terminal at a port" },
      ],
    },
    why: {
      kicker: "The Aquifert difference",
      title: "Why the trade chooses Aquifert",
      items: [
        { title: "Global expertise", desc: "Aquifert has a global view of the fertiliser market we aim to keep our clients completely up to date. This enables informed purchasing decisions and an effective way to manage prices over seasons." },
        { title: "Transparency on Prices", desc: "Know the actual costs, know the market. Manage your prices and be informed about market moves." },
        { title: "Restricted Client roster", desc: "We have learnt we cannot be a one stop shop for everyone. Aquifert focuses on supporting and serving a specific client base." },
        { title: "Due diligence", desc: "Every counterparty vetted before a single quote is exchanged, nothing reaches either side unreviewed." },
        { title: "30+ years' trading experience", desc: "A desk that has traded through cycles, shocks and shortages across two decades." },
        { title: "Quality assurance", desc: "Specification-checked product with documentation verified at every stage of the trade." },
      ],
    },
    audiences: {
      kicker: "Two sides, one desk",
      title: "Built for Fertiliser delivery and Market Analysis",
      leftTitle: "For Fertiliser",
      leftItems: [
        { title: "Reach", desc: "Reach vetted buyers in new regions without building a local sales force." },
        { title: "Supplier vetting", desc: "Reaching vetted genuine suppliers. Actionable prices delivered weekly. All prices tailored to your specific quality, quantity, packing and destination. To your whatsapp or email. No guessing." },
        { title: "Trading support", desc: "Documentation, logistics and financing handled in our portal or in your existing channel. No gimmicks, updated on a schedule of your choice." },
      ],
      rightTitle: "For Analysis",
      rightItems: [
        { title: "Full portfolio access", desc: "Water solubles, micronutrients and bulk commodities from vetted global producers." },
        { title: "Supplier identification", desc: "We match your specification to the right producer, without ever exposing either side." },
        { title: "Competitive pricing", desc: "Cost-to-cost transparency with membership instead of hidden margin." },
      ],
    },
    zero: {
      kicker: "AQ ZERO",
      title: "One Place. Every fertiliser market.",
      body: "AQ ZERO Clients source at supplier cost plus pass-through freight and a stated fee, full document trail. Choose the tier that matches your tonnage. Our AQ Analytics ensure an informed choice and is included with ZERO.",
      primaryLabel: "AQ ZERO plans",
      primaryLink: "/membership",
      note: "Set fees · cancel anytime",
    },
    faq: {
      kicker: "Questions, answered",
      title: "Fertiliser trading on Aquifert, FAQ",
      sub: "What the platform is, how pricing works, what you can source and how both sides are protected.",
      items: [
        { q: "What is Aquifert?", a: "Aquifert is a UK-based B2B fertiliser sourcing platform that connects vetted fertiliser buyers and producers through one governed workspace. It covers water-soluble and specialty fertilisers as well as Urea, DAP, MOP, MAP and NPK, with AI-drafted quotes, live container tracking and market intelligence built in." },
        { q: "How does Aquifert fertiliser pricing work?", a: "Aquifert replaces the traditional trader's per-tonne margin with a flat membership fee. Members see the full landed-cost breakdown on every quote, product, ocean freight, clearing and duties, so they buy at true cost. AQ Zero Sprout, AQ Zero Harvest and AQ Zero Scale tiers scale with monthly tonnage." },
        { q: "Which fertilisers can I source through Aquifert?", a: "Members source water-soluble fertilisers, micronutrients such as Zinc and Iron, and bulk commodity grades including Urea, DAP, MAP, MOP and NPK, shipped containerised or in bulk from vetted producers in the Middle East, North Africa, Europe and Asia." },
        { q: "How does Aquifert protect buyers and suppliers?", a: "Every party passes KYC/KYB due diligence before trading. Buyers and suppliers never see each other's identity, every document is scanned for supplier-identifying information and cleared by a human before release, and AI-drafted messages are approved by staff before anything is sent." },
      ],
    },
    closing: {
      title: "Knowledge & Fertiliser Delivered",
      primaryLabel: "Register of AQ ZERO",
      primaryLink: "/platform",
      secondaryLabel: "Contact us",
      secondaryLink: DESK_MAIL,
    },
  },
  platform: {
    seo: {
      title: "Fertiliser Sourcing Platform Features, AI Quotes, Live Tracking & Market Intelligence | Aquifert",
      description:
        "Explore the Aquifert fertiliser sourcing platform: an AI communication hub that turns WhatsApp and email inquiries into deal cards, a quoting engine with transparent landed-cost breakdowns, live container tracking across ten milestones, fertiliser market intelligence and invoice financing.",
    },
    hero: {
      title: "AQ ZERO + AQ Analytics for the entire fertiliser stream",
      body: "Trader level market analysis for the fertiliser market designed to let you make an informed decision. Physical fertiliser available.",
      primaryLabel: "See the live platform",
      primaryLink: "/login",
      secondaryLabel: "Access AQ ZERO & AQ ONE for a complete sourcing requirements",
      secondaryLink: "/membership",
      video: "/media/port-terminal.mp4",
      image: "/media/port-terminal.jpg",
      label: "Aerial view of a container terminal moving fertiliser cargo through a seaport",
    },
    blocks: {
      items: [
        {
          icon: "ship",
          kicker: "Logistics tracker",
          title: "Live fertiliser tracking from port of loading to your gate",
          body: "Every fertiliser order carries a live shipment record: container, vessel, carrier and bill of lading, plotted on a map from Shanghai to Felixstowe. Ten milestones, from gate-in to out-for-delivery, with exception alerts and revised ETAs surfaced before you have to ask.",
          points: "Ten milestone checkpoints with live map position\nDelay detection with revised ETA alerts\nDocuments, B/L, invoices, packing lists, on the order record",
          video: "/media/ship-ocean.mp4",
          image: "/media/ship-ocean.jpg",
          label: "Loaded bulk carrier moving through open ocean",
          caption: "Factory to port to buyer, on time and visible.",
        },
      ],
    },
    more: {
      kicker: "And the rest of the desk",
      title: "Everything around the fertiliser trade, in the same workspace",
      sub: "Intelligence, financing and governance ship with the platform, no bolt-ons, no extra vendors.",
      items: [
        { icon: "line-chart", title: "Fertiliser Market Insights Engine", desc: "26 weeks of fertiliser price history across five commodities and four regions, regional heatmaps, volatility indicators and AI-generated trade recommendations, broadcast to members on a schedule." },
        { icon: "wallet", title: "Fertiliser invoice financing", desc: "AQ Zero Harvest and AQ Zero Scale members finance up to 85% of a fertiliser invoice over 30, 60 or 90 days, with e-signature and automated repayment schedules." },
        { icon: "shield-check", title: "Governance built in", desc: "Role-based access for admin, operations, finance, support, buyers and suppliers, with margins visible only to the roles that should see them." },
      ],
    },
    faq: {
      kicker: "Platform questions",
      title: "How the fertiliser sourcing platform works, FAQ",
      sub: "What Aquifert ONE does, how quotes are approved, and how both sides stay protected.",
      items: [
        { q: "What does the Aquifert fertiliser sourcing platform do?", a: "Aquifert ONE is the workspace for the fertiliser trade. It turns WhatsApp and email inquiries into structured deal cards, generates quotes with transparent landed-cost breakdowns, tracks every container across ten live milestones, and adds market intelligence, freight analytics and invoice financing in the same flow." },
        { q: "How are fertiliser quotes produced on Aquifert?", a: "The desk's AI drafts each quote from live market data and freight rates, but nothing sends automatically. A human approver reviews every message, checks the margin maths, and only then does the quote reach the buyer. The engine flags; a human clears." },
        { q: "Can buyers and suppliers see each other on Aquifert?", a: "No. Buyers and suppliers never see each other's identity. Every document is scanned for supplier-identifying information against a protected registry and must be cleared by a human before a buyer can receive it." },
        { q: "Does Aquifert track fertiliser shipments live?", a: "Yes. Every consignment moves through a 14-stage tracker from factory gate to farm gate, with freight forwarders sending booking and shipping updates that buyers see in real time." },
      ],
    },
    cta: {
      title: "See the fertiliser platform working end to end",
      subtitle: "Sign in and switch between the admin command center, buyer portal and supplier hub, all on live demo data.",
      buttonLabel: "Explore the live platform demo",
    },
  },
  why: {
    seo: {
      title: "Why Aquifert, 20+ Years of Fertiliser Trading Expertise, Transparent Supply Chains",
      description:
        "Why fertiliser buyers and suppliers choose Aquifert: two decades of global fertiliser trading experience, strict KYC/KYB due diligence, an established shipping network and a sustainability focus on water-soluble grades that raise yield per tonne.",
    },
    hero: {
      title: "Sustainability for farming",
      highlight: "and your balance sheet.",
      body: "Aquifert brings both sides of the fertiliser trade into one transparent Hub. Integrated reviews ensure your requirements move faster, at fairer prices, with less time in a few clicks.",
      primaryLabel: "Meet the platform",
      primaryLink: "/platform",
      secondaryLabel: "See membership",
      secondaryLink: "/membership",
      video: "/media/fields-sunrise.mp4",
      image: "/media/fields-sunrise.jpg",
      label: "Misty sunrise over green farmland fields seen from the air",
    },
    network: {
      kicker: "The network in motion",
      title: "Ports, lanes and fields we move through every week",
      cards: [
        { tagline: "Established port operations", cta: "Explore the platform", link: "/platform", video: "/media/port-terminal.mp4", image: "/media/port-terminal.jpg", label: "Gantry cranes moving fertiliser cargo at a port terminal" },
        { tagline: "Carrier lanes built over decades", cta: "Freight analytics", link: "/platform", video: "/media/ship-ocean.mp4", image: "/media/ship-ocean.jpg", label: "Bulk carrier crossing open ocean with fertiliser cargo" },
        { tagline: "Nutrition that reaches the crop", cta: "Become a member", link: "/membership", video: "/media/greenhouse-tomatoes.mp4", image: "/media/greenhouse-tomatoes.jpg", label: "Tomatoes ripening in a fertigated greenhouse" },
      ],
    },
    reasons: {
      kicker: "The Aquifert difference",
      title: "Built to provide accurate market levels for simple transactions",
      sub: "Every feature exists because twenty years of fertiliser trading showed us where the industry leaks time, money and trust.",
      items: [
        { icon: "globe", title: "Global fertiliser market expertise", desc: "Deep coverage of nitrogen, phosphate and potash markets, fertiliser pricing, trade flows and supply signals across four regions." },
        { icon: "ship", title: "Established Network", desc: "Extensive fertiliser supply chain experience from factories to ports to buyers, with carriers we have worked with for years." },
        { icon: "shield-check", title: "Strict due diligence", desc: "We only deal with reputable parties. Every fertiliser buyer and supplier passes KYC/KYB checks before their first trade on the platform." },
        { icon: "handshake", title: "30+ years experience", desc: "More than two decades of global fertiliser trading experience behind every quote, route and recommendation." },
        { icon: "leaf", title: "Sustainability focus", desc: "Water-soluble and specialty fertiliser grades that raise yield per tonne, efficiency for the supply chain and the field." },
      ],
    },
    audiences: {
      kicker: "How Aquifert helps",
      title: "Professional services for both sides of the fertiliser trade",
      sub: "Buyers get transparent landed cost. Suppliers get vetted demand and faster payout.",
      buyersTitle: "For fertiliser buyers",
      buyers: "A one-stop shop for a full portfolio of specialty fertilisers at true landed cost\nEstablished fertiliser suppliers only, quality control on every consignment\nCompetitive fertiliser pricing enabled by our global supply network",
      suppliersTitle: "For fertiliser suppliers",
      suppliers: "Reach vetted global fertiliser buyers and expand into new markets\nBilingual EN/中文 portal with AI-polished quotes and escrowed payouts\nDirect advisory support on fertiliser supply chain execution, factory to port",
    },
    community: {
      kicker: "Our growing community",
      title: "Enriching our growing community",
      body: "From micronutrients like Zinc and Iron for high-value crops to bulk NPK programmes, we help growers, distributors and producers work from the same live picture, quality assured at every step.",
      points: "Growers and distributors buying at verified landed cost\nProducers reaching UK demand without broker layers\nWater-soluble grades that cut waste per hectare",
      video: "/media/fields-aerial.mp4",
      image: "/media/fields-aerial.jpg",
      label: "Aerial drone view over green agricultural fields growing crops with water-soluble fertiliser",
      caption: "High-value crops depend on precise, water-soluble nutrition.",
    },
    faq: {
      kicker: "Why Aquifert, questions",
      title: "Why traders choose Aquifert, FAQ",
      sub: "The experience behind the platform, what each side gains, and the sustainability focus.",
      items: [
        { q: "Why choose Aquifert for fertiliser trading?", a: "Aquifert is built by fertiliser traders with more than twenty years of global trading experience. It combines strict KYC/KYB due diligence, an established shipping network from factories to ports to buyers, and a governed platform where AI drafts but humans approve every message." },
        { q: "How does Aquifert help fertiliser buyers?", a: "Buyers get a one-stop shop for a full portfolio of specialty fertilisers at true landed cost, established suppliers only with quality control on every consignment, and competitive pricing enabled by Aquifert's global supply network." },
        { q: "How does Aquifert help fertiliser suppliers?", a: "Suppliers reach vetted global fertiliser buyers and expand into new markets through a bilingual EN/中文 portal with AI-polished quotes and escrowed payouts, plus direct advisory support on supply chain execution from factory to port." },
        { q: "Is Aquifert focused on sustainable fertiliser?", a: "Yes. Aquifert specialises in water-soluble and specialty fertiliser grades that raise yield per tonne, improving efficiency for both the supply chain and the field, and cutting waste per hectare." },
      ],
    },
    cta: {
      title: "Trade fertiliser with a partner you can verify",
      subtitle: "Join the platform and see how transparent, well-governed fertiliser trading works in practice.",
      buttonLabel: "Start trading on Aquifert",
    },
  },
  membership: {
    seo: {
      title: "Fertiliser Membership Plans: AQ Zero Sprout, AQ Zero Harvest, AQ Zero Scale, AQ Analytics | Aquifert",
      description:
        "Aquifert membership replaces per-tonne fertiliser margin with one flat fee. AQ Zero Sprout (up to 200t a month), AQ Zero Harvest (201–600t) and AQ Zero Scale (unlimited) include cost-to-cost quotes, market intelligence, live tracking and invoice financing. AQ Analytics adds licensed market data and unlimited Aquibot without physical trading.",
    },
    hero: {
      title: "Advisory & Physical fertiliser.",
      highlight: "AQ Suite has everything covered.",
      body: "AQ ZERO tiers scale with your volumes, from first trade to full market. Choose monthly flexibility with 100% money back if not satisfied. Don’t require physical fertiliser? We have you covered with our AQ Analytics option",
      primaryLabel: "Compare the tiers",
      primaryLink: "#plans",
      secondaryLabel: "Talk to the desk",
      secondaryLink: DESK_MAIL,
      video: "/media/greenhouse-tomatoes.mp4",
      image: "/media/greenhouse-tomatoes.jpg",
      label: "Rows of tomato plants growing inside a modern greenhouse fed by water-soluble fertiliser",
    },
    sprout: { name: "AQ ZERO Sprout", tagline: "Up to 200tons/month", features: "" },
    harvest: { name: "AQ ZERO Harvest", tagline: "201 Tons /month", features: "" },
    scale: { name: "AQ ZERO Scale", tagline: "Unlimited tons/month", features: "" },
    analytics: {
      name: "AQ Analytics",
      tagline: "Analytics only, no physical fertiliser",
      features: "AQ View market analysis\nTELEX desk intelligence\nTrend Analytics dashboards\nWeekly expert trader commentary",
    },
    notes: {
      items: [
        { icon: "landmark", title: "Financing eligibility", text: "Members at AQ Zero Harvest tier and above unlock the Invoice Discounting Facility, up to 85% of a verified fertiliser invoice value, advanced within 48 hours." },
        { icon: "shield-check", title: "Verified access only", text: "Every membership follows KYC/KYB review and compliance approval. Fertiliser trading limits scale with your verification tier." },
        { icon: "refresh", title: "Change anytime", text: "Upgrade, downgrade or cancel from your portal. The desk confirms pricing with you and handles every change." },
      ],
    },
    wide: {
      tagline: "Every tonne traded at cost lands harder in the field",
      cta: "Start with a plan",
      video: "/media/fields-aerial.mp4",
      image: "/media/fields-aerial.jpg",
      label: "Aerial view over cultivated fields fed by water-soluble fertiliser",
    },
    faq: {
      kicker: "Membership questions",
      title: "Fertiliser membership, FAQ",
      sub: "Which tier fits, what it saves, and how flexible it is.",
      items: [
        { q: "Which Aquifert membership tier fits me?", a: "AQ Zero Sprout is for buyers trading up to 200 tonnes a month, AQ Zero Harvest covers 201–600 tonnes, and AQ Zero Scale has no tonnage limit. The desk confirms pricing for your tier with you directly." },
        { q: "What is the difference between AQ Analytics and AQ ZERO?", a: "AQ Analytics is for analysis and licensed market data: PRA prices, trade flows, port lineups, freight benchmarks and unlimited Aquibot, with no physical trading. AQ Zero Sprout, AQ Zero Harvest and AQ Zero Scale are AQ ZERO memberships: one flat fee replaces the margin on every quote, and every AQ Analytics module is included." },
        { q: "What do members save compared with a traditional fertiliser trader?", a: "Members pay £0 per-tonne margin and see the full landed-cost breakdown, product, ocean freight, clearing and duties, on every fertiliser quote. On typical volumes, the saving versus a traditional trader's embedded margin exceeds the membership fee many times over." },
        { q: "Can I switch or cancel my fertiliser membership?", a: "Yes. You can upgrade, downgrade or cancel from your portal at any time, and the desk handles the change for you." },
      ],
    },
    cta: {
      title: "Trade your first tonne of fertiliser this week",
      subtitle: "Launch the live demo as a buyer, supplier or admin, membership, financing and the full fertiliser trading workflow included.",
      buttonLabel: "Choose your fertiliser plan",
    },
  },
  contact: {
    seo: {
      title: "Contact Aquifert, Fertiliser Trading Desk | WhatsApp, Call, Message",
      description:
        "Contact the Aquifert fertiliser trading desk by WhatsApp, a booked call with a trader, a message or a callback. WhatsApp answered within hours in the trading day; messages and callbacks within one business day.",
    },
    hero: {
      title: "Talk to the desk",
      body: "Reach a person, not a screen. Four ways in, honest response times, and a trader on the other end.",
      video: "/media/port-terminal.mp4",
      image: "/media/port-terminal.jpg",
      label: "Aerial view of a container terminal moving fertiliser cargo through a seaport",
    },
    channels: {
      whatsappTitle: "WhatsApp the desk",
      whatsappDesc: "Fastest for a quick question. Typically answered within a couple of hours in the trading day.",
      callTitle: "Book a call",
      callDesc: "A scheduled 20-minute call with a trader. Usually available within 1–2 business days.",
      messageTitle: "Send a message",
      messageDesc: "Email-style message to the desk. We reply within one business day.",
      callbackTitle: "Request a callback",
      callbackDesc: "Leave your number in the message and we will call you back within one business day.",
    },
    faq: {
      kicker: "Contact questions",
      title: "Reaching the desk, FAQ",
      sub: "How to contact Aquifert, how fast we respond and who picks up.",
      items: [
        { q: "How do I contact Aquifert?", a: "You can reach the Aquifert fertiliser trading desk four ways: WhatsApp for quick questions (answered within a couple of hours in the trading day), a booked 20-minute call with a trader (usually within 1–2 business days), an email-style message (reply within one business day), or a callback request." },
        { q: "How fast does Aquifert respond to enquiries?", a: "WhatsApp messages are typically answered within a couple of hours during the trading day. Messages and callback requests receive a reply within one business day, and booked calls are usually available within 1–2 business days." },
        { q: "Who will I speak to at Aquifert?", a: "Every channel reaches a human trader on the Aquifert desk, not a bot. The desk handles buyer sourcing, supplier onboarding, membership questions and trading support." },
      ],
    },
    closing: {
      title: "Prefer to look around first?",
      body: "See the platform, the membership tiers and the live market data, then come back when you are ready to talk.",
      primaryLabel: "Explore the platform",
      primaryLink: "/platform",
      secondaryLabel: "See membership",
      secondaryLink: "/membership",
    },
  },
  help: {
    seo: {
      title: "Help & Aquibot, Aquifert Support",
      description: "Get help with Aquifert: ask Aquibot about membership, quoting, freight tracking and accounts, or browse help topics and contact the trading desk.",
    },
    hero: {
      kicker: "Help centre",
      title: "Ask Aquibot.",
      highlight: "Or ask the desk.",
      body: "Instant answers on membership, quoting, freight and your account, with a human trader behind every escalation.",
    },
    assistant: {
      greeting: "Hello, I'm Aquibot, the Aquifert assistant. Ask me about membership, quoting, freight, market data or your account. Anything I can't answer goes straight to the human desk.",
      suggestions: "How much does membership cost?\nHow do I request a quote?\nHow does shipment tracking work?\nHow do I sell on Aquifert?",
      answers: [
        { keywords: "member, pricing, plan, cost, price of membership, subscription, sprout, harvest, scale", answer: "Membership replaces per-tonne margin with one flat fee: AQ Zero Sprout (up to 200t a month), AQ Zero Harvest (201–600t) and AQ Zero Scale (unlimited). AQ Analytics covers licensed market data and analysis without physical trading. The desk confirms pricing for your tier with you directly. Full details are on the Membership page." },
        { keywords: "quote, request, buy, purchase, order, source, sourcing", answer: "Create a free account, then raise a sourcing request with product, tonnage, destination and delivery window. Our desk matches you with vetted suppliers and returns a landed-cost quote, product, freight, clearing and duties itemised." },
        { keywords: "freight, shipping, delivery, voyage, tracking, container, port", answer: "Every order carries a live shipment record, vessel, container, bill of lading and ten milestone checkpoints from gate-in to out-for-delivery, with revised ETAs surfaced automatically. The Freight Calculator gives instant cost estimates before you commit." },
        { keywords: "price, prices, market, data, index, assessment", answer: "Signed-in users see live market data in the Hub, nitrogen, phosphate and potash gauges, desk commentary, price boards and freight analytics. Price indications are compiled from public sources and Aquifert desk assessments; they are information only, not a price assessment." },
        { keywords: "supplier, sell, producer, selling", answer: "Suppliers pass KYC/KYB review, then receive vetted buyer demand through the supplier portal, AI-polished quotes, escrowed payouts and advisory support on execution from factory to port. Register and choose the supplier path to start." },
        { keywords: "financ, credit, invoice, payment terms", answer: "AQ Zero Harvest and AQ Zero Scale members can finance up to 85% of a verified invoice over 30, 60 or 90 days, with e-signature and automated repayment schedules." },
        { keywords: "account, register, sign up, signup, log in, login, password", answer: "Use Create an account to register with your email address (work or personal). We send a 6-digit verification code — enter it on the next screen, set a password, then you'll land in the portal. Sign-in after that is email + password. If you're locked out, use Forgot password on the login page." },
        { keywords: "product, urea, dap, map, mop, npk, micronutrient, water soluble, zinc, iron", answer: "We trade water-soluble and specialty fertilisers, Urea, DAP, MOP, MAP and NPK grades for fertigation and foliar programmes, plus micronutrients including Zinc and Iron for high-value crops." },
        { keywords: "contact, human, person, phone, email, desk, talk", answer: "The desk is at enquiry@aquifert.com. Include your company, product and tonnage and the right trader will reply within one business day." },
        { keywords: "safe, trust, vet, kyc, compliance, anonymous", answer: "Every counterparty passes credit and compliance checks before a quote is exchanged, and nothing that could reveal a supplier ever reaches a buyer. The engine flags, a human clears, that rule runs through the whole platform." },
      ],
      fallback: "That's beyond what I can answer confidently. The desk can, write to enquiry@aquifert.com with your question and a human will reply within one business day. Meanwhile, the Help topics below cover membership, quoting, freight and accounts.",
    },
    topics: {
      title: "Browse help topics",
      items: [
        { title: "Membership & billing", body: "Tiers, tonnage limits and cancellations, AQ Zero Sprout, AQ Zero Harvest and AQ Zero Scale compared.", link: "/membership" },
        { title: "Requesting quotes", body: "Raise a sourcing request, receive landed-cost quotes from vetted suppliers, accept and fund.", link: "/platform" },
        { title: "Freight & tracking", body: "Ten milestone checkpoints, live vessel positions, revised ETAs and documents on every order.", link: "/platform" },
        { title: "Why Aquifert", body: "Due diligence, the supply-chain network and twenty years of trading behind every quote.", link: "/why-aquifert" },
      ],
    },
    desk: {
      title: "Still need a human?",
      body: "The desk answers within one business day.",
      primaryLabel: "Email the desk",
      primaryLink: DESK_MAIL,
    },
  },
  global: {
    header: {
      menu: [
        { label: "Home", link: "/" },
        { label: "Platform", link: "/platform" },
        { label: "Why Aquifert", link: "/why-aquifert" },
        { label: "Fertiliser Now", link: "/membership" },
        { label: "Contact", link: "/contact" },
      ],
      utility: [
        { label: "Help", link: "/help" },
        { label: "Contact", link: "/contact" },
      ],
      loginLabel: "Log in",
      accessLabel: "Request access",
    },
    footer: {
      about: "Aquifert aims to provide its select clients an absolute advantage in their fertiliser timing and sourcing. We offer a unique combination of analytic and transparent sourcing options.",
      handle: "@Aquiferts",
      linkedin: "https://www.linkedin.com/company/aquifert/",
      email: "enquiry@aquifert.com",
      firstTitle: "Platform",
      firstLinks: ["Aquifert ONE", "Freight Calculator", "Netback", "Library", "Tools", "Order Desk"].map((label) => ({ label, link: "/platform" })),
      secondTitle: "Company",
      secondLinks: [
        { label: "Why Aquifert", link: "/why-aquifert" },
        { label: "Membership", link: "/membership" },
        { label: "Contact", link: "/contact" },
        { label: "Help", link: "/help" },
        { label: "Careers", link: "/why-aquifert" },
      ],
      copyright: "© {year} Aquifert. All rights reserved.",
      disclaimer:
        "Fertiliser price indications are compiled from public sources and Aquifert desk assessments. Data may be delayed and is provided for information only. It does not constitute a price assessment, an offer, or advice. Verify independently before trading.",
    },
  },
  aqZero: {
    hero: {
      eyebrow: "AQ Zero",
      badge: "Pilot",
      title: "Buy Fertiliser at",
      highlight: "supplier cost",
      sub: "Supplier-cost buying with a fixed operations fee. Register now for the pilot.",
      primaryLabel: "Choose your programme",
      primaryLink: "#aq-zero-tiers",
      secondaryLabel: "Talk to the trade desk",
      secondaryLink: "/hub/contact?topic=AQ%20Zero",
      video: "/media/port-terminal.mp4",
      image: "/media/port-terminal.jpg",
      label: "Containers being loaded at a port terminal, physical fertiliser moving through the supply chain",
    },
    notice: {
      badge: "Coming soon",
      text: "Choose the programme that fits how you buy and register your interest. The desk confirms pricing and availability with you.",
    },
    programmes: {
      ...tierDefaults("sprout", "For buyers proving the model on their first lanes."),
      ...tierDefaults("harvest", "For regular programmes that need financing and speed."),
      ...tierDefaults("scale", "For volume buyers running the full stream through Aquifert."),
      popularLabel: "Most popular",
      buttonLabel: "Register for {name}",
      footnote: "12 pilot slots per quarter. Fast-start: commit within 7 days of being offered a slot.",
    },
    compare: {
      title: "Compare plans",
      sub: "Modules and allowances come straight from the desk’s current settings.",
    },
    steps: {
      kicker: "How AQ Zero works",
      title: "Three steps between you and supplier-cost fertiliser",
      items: [
        { icon: "clipboard-check", title: "Register your interest", text: "Choose the programme that fits how you buy. Registration takes a minute and places you on the pilot roster." },
        { icon: "phone-call", title: "The desk confirms", text: "Our traders confirm pricing and availability with you directly, against your quality, quantity, packing and destination." },
        { icon: "badge-check", title: "Buy at supplier cost", text: "Product at cost, pass-through freight and a stated fee. Full document trail on every tonne." },
      ],
    },
    crossSell: {
      eyebrow: "AQ Analytics",
      line: "Don’t need physical fertiliser? Get the trader-level market view on its own.",
      buttonLabel: "Explore AQ Analytics",
      buttonLink: "/hub/plans/aq-analytics",
    },
    closing: {
      title: "Trade your first tonne at cost this quarter",
      body: "Pilot slots are limited to twelve per quarter. Talk to the desk about the programme that fits your tonnage, and we will confirm pricing and availability with you.",
      primaryLabel: "Talk to the trade desk",
      primaryLink: "/hub/contact?topic=AQ%20Zero",
      secondaryLabel: "Compare the tiers",
      secondaryLink: "#aq-zero-tiers",
    },
    _order: ["notice", "programmes", "compare", "steps", "crossSell", "closing"],
  },
  aqAnalytics: {
    hero: {
      eyebrow: "AQ Analytics",
      badge: "",
      title: "Advisory for the",
      highlight: "Global Market",
      sub: "Trader-level market analysis for the fertiliser market, designed to let you make an informed decision. Analytics and licensed market data, no physical trading.",
      registerLabel: "Register for AQ Analytics",
      openLabel: "Open AQ Analytics",
      secondaryLabel: "Talk to the trade desk",
      secondaryLink: "/hub/contact?topic=AQ%20Analytics",
      video: "/media/fields-sunrise.mp4",
      image: "/media/fields-sunrise.jpg",
      label: "Sunrise over cultivated fields, the market view AQ Analytics opens up",
    },
    plan: {
      name: ANALYTICS.name,
      tagline: ANALYTICS.tagline,
      features: ANALYTICS.features.join("\n"),
      missing: ANALYTICS.missing.join("\n"),
      registerLabel: "Register for AQ Analytics",
      openLabel: "Open AQ Analytics",
      telexName: TELEX.name,
      telexPitch: TELEX.pitch,
      marketDataName: MARKET.name,
      marketDataPitch: MARKET.pitch,
      signalName: SIGNAL.name,
      signalPitch: SIGNAL.pitch,
      freightName: FREIGHT.name,
      freightPitch: FREIGHT.pitch,
      supplyDemandName: BALANCE.name,
      supplyDemandPitch: BALANCE.pitch,
      briefingName: BRIEFING.name,
      briefingPitch: BRIEFING.pitch,
      alertsName: ALERTS.name,
      alertsPitch: ALERTS.pitch,
    },
    crossSell: {
      eyebrow: "AQ Zero",
      line: "Ready to buy at supplier cost? AQ Zero adds physical trading to everything here.",
      buttonLabel: "Explore AQ Zero",
      buttonLink: "/hub/plans/aq-zero",
    },
    closing: {
      title: "Know the market before you move",
      body: "AQ Analytics is included with every AQ Zero plan, and stands alone for teams that only need the intelligence. The desk can walk you through the modules on a short call.",
      primaryLabel: "Talk to the trade desk",
      primaryLink: "/hub/contact?topic=AQ%20Analytics",
      registerLabel: "Register for AQ Analytics",
    },
    _order: ["plan", "crossSell", "closing"],
  },
};

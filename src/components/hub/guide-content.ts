import {
  Activity,
  Archive,
  ArrowLeftRight,
  Calculator,
  ChartLine,
  Compass,
  Crown,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Layers,
  Mail,
  Newspaper,
  PhoneCall,
  Radar,
  Radio,
  Scale,
  UserCircle,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type GuideSection = {
  id: string;
  title: string;
  icon: LucideIcon | "aquibot";
  /** One line shown under the title and in search results. */
  summary: string;
  body: string[];
  points?: { term: string; text: string }[];
  tip?: string;
  href?: string;
  /** Extra anchor ids that land on this section, so every sidebar ⓘ has a target. */
  aliases?: string[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "start",
    title: "Getting around",
    icon: Compass,
    summary: "Where everything lives and the fastest ways to reach it.",
    aliases: ["guide"],
    body: [
      "The sidebar opens with the places you use daily: Dashboard, Hub, Library, Nitrogen Report and Aquibot. Below them, AQ ONE Free plan holds everything included with every account, and AQ Analytics holds the deeper data unlocked by plan. Desk tools and You sit at the bottom. Hover any item and tap the small ⓘ for a one-line explanation.",
      "A lock beside a menu item means your plan does not include it yet. Open it anyway: the page explains what it covers, shows a preview and lets you upgrade or talk to the desk.",
    ],
    points: [
      { term: "Search", text: "Press Ctrl K (⌘ K on Mac) or tap the search pill to jump to any page or ask Aquibot directly." },
      { term: "Ask Aquibot", text: "The gradient pill in the top bar opens Aquibot from anywhere." },
      { term: "On a phone", text: "The tab bar holds Hub, Telex and Aquibot, plus Dashboard on AQ Analytics and AQ ZERO or Library on the free plan. More opens the full menu." },
    ],
    tip: "New here? Take the tour. It walks through the places that matter in under a minute.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    summary: "Your day at a glance: usage, requests, the latest Telex and a briefing tuned to you. Included with AQ Analytics and AQ ZERO.",
    href: "/hub/dashboard",
    body: [
      "The Dashboard opens with a prompt bar for Aquibot and four counters: your order requests, Nitrogen Reports this month against your allowance, calculator runs and active price alerts. Recent requests lists the enquiries you have sent the desk and their status.",
      "The Telex panel shows the latest flashes with a thumbnail for each product. Green marks a firmer market, red a softer one. The Aquibot Briefing turns the same moves into plain language for the way you buy. Pick a persona chip, such as importer, distributor or farmer, and it is remembered next time.",
    ],
    points: [
      { term: "Firmer", text: "Prices are rising or the market is tightening. Shown in green." },
      { term: "Steady", text: "No clear direction. Shown in neutral grey." },
      { term: "Softer", text: "Prices are easing or supply is loosening. Shown in red." },
    ],
    tip: "The right-hand column shows your next Community Call and any price alert that has triggered since the desk last updated prices.",
  },
  {
    id: "home",
    title: "Hub and market indicators",
    icon: Radar,
    summary: "Gauges, the Telex feed, commentary and forward curves.",
    href: "/hub",
    body: [
      "The Hub is your morning read. It opens with three market indicators, one each for Nitrogen (green), Phosphate (orange) and Potassium (red). Each is scored from 0 to 100 with the date it was set and a stance. Hover a card for the desk's longer note.",
      "The Telex feed is the desk's running log of market events: tenders, price moves, plant outages, policy changes and cargoes on the move. Newest items sit at the top. Posts are marked Public, AQ Analytics or AQ ZERO and appear according to your plan. Treat Telex as preliminary intel and verify figures before trading.",
      "Market Analysis explains each indicator in full. When the desk publishes forward curves, Direct Hedge | Paper Forward Curves shows bid and ask prices in USD/t by month for each product. Pick a report from the Published dropdown; arrows show whether each price moved higher, lower or held.",
    ],
    points: [
      { term: "Bullish", text: "Score above 66." },
      { term: "Neutral", text: "Score from 34 to 66." },
      { term: "Bearish", text: "Score below 34." },
    ],
  },
  {
    id: "library",
    title: "Library",
    icon: Archive,
    summary: "Every report and research note the desk has published.",
    href: "/hub/library",
    body: [
      "Search by title, summary or collection, then narrow by collection, year and access. Each file carries an access badge: Free, AQ Analytics or AQ ZERO. Open a card to read the summary, view the PDF in your browser or download it.",
      "Files above your plan show a lock and an unlock panel that takes you to your plan options or the desk.",
    ],
  },
  {
    id: "nitrogen",
    title: "Nitrogen Report",
    icon: FlaskConical,
    summary: "Four short sections, one tailored nitrogen sourcing and agronomy report.",
    href: "/hub/nitrogen-report",
    body: [
      "Answer four sections: delivery (destination, packaging and source), volumes, your crop and soil, and your goals. Hints under each field explain what the desk needs and why. The report recommends a nitrogen source, an application rate band for your crop, timing, additives and the sourcing points to raise with the desk.",
      "Every report is saved with a reference number under your reports, where you can reopen, print or save it as a PDF. Each plan includes a number of reports per calendar month, shown on the page and on Plan & Usage.",
    ],
    tip: "Ready to buy? Each report links straight to Order Fertilizer Now with the product filled in.",
  },
  {
    id: "aquibot",
    title: "Aquibot",
    icon: "aquibot",
    summary: "Ask about the market in plain English and get sourced answers.",
    href: "/hub/aquibot",
    body: [
      "Aquibot answers from Aquifert's own knowledge base: Telex posts plus the desk's price and intelligence files, filtered by your plan in the same way as your feed. Sources appear as chips under each answer.",
      "Chats are saved under Your chats, titled from your first question, so you can pick up where you left off. Enter sends, Shift+Enter adds a new line, and you can stop an answer at any time.",
    ],
    tip: "Ask with a timeframe, such as “urea in Brazil over the last two weeks”, for the most focused answer.",
  },
  {
    id: "telex",
    title: "Market TELEX Feed",
    icon: Radio,
    summary: "Desk-issued market flashes, newest first, grouped by day.",
    href: "/hub/telex",
    body: [
      "Every flash shows the time, the product, whether it reads firmer, steady or softer, and the plan it was issued to. Filter by product and tap Save as default so the feed opens on what you trade.",
      "Flashes issued to a higher plan appear as a locked line, so you can see that something moved and unlock it if it matters to you.",
    ],
  },
  {
    id: "analysis",
    title: "AQ Market Analysis Feed",
    icon: Newspaper,
    summary: "What a move means for buyers and what to watch next.",
    href: "/hub/analysis",
    body: [
      "The Telex reports what happened. Analysis notes explain why it matters, who it affects and what would change the picture. Filter by product, open a note to read it in full, and follow the links back to the flashes it interprets.",
    ],
  },
  {
    id: "signal",
    title: "AQ Signal",
    icon: Activity,
    summary: "Rolling price windows on benchmark fertilizer and freight prices.",
    href: "/hub/signal",
    body: [
      "Pick a 7, 30, 60 or 90-day window. Each card compares the first and latest price in the window, with the change, the high and the low and a one-line summary. The bar shows where today's price sits between the window's low and high. A move under half a percent counts as flat.",
      "The window you pick is remembered. AQ Analytics extends Signal to 180 days on every tracked series.",
    ],
  },
  {
    id: "netback",
    title: "Netback",
    icon: ArrowLeftRight,
    summary: "Landed cost of granular urea, or what a farm-gate price implies at FOB.",
    href: "/hub/netback",
    body: [
      "The calculator answers two questions. FOB to On-Farm: given each origin's FOB price, what does a tonne cost delivered to your farm once freight, port, bagging, duty and finance are added? On-Farm to FOB: given the price you are offered on-farm, what FOB does that imply at each origin?",
      "FOB means free on board, the price loaded onto the ship at origin. Every cost on top is shown line by line. Set the destination port, cargo size (5,000 to 100,000 MT), bagged or bulk, and the pricing basis, from CFR port through to remote farms more than 150 km inland. Add import duty where it applies; the country banner explains local duty rules.",
      "Every origin is ranked on the same assumptions. In On-Farm to FOB mode each origin is rated by margin: Viable at $10/t or more, Marginal from $0, Tight down to −$20, and Unviable below that.",
    ],
    tip: "Confirm your currency and exchange rate before calculating. Calculations run in USD; your currency is shown alongside.",
  },
  {
    id: "order",
    title: "Order Fertilizer Now",
    icon: FileText,
    summary: "Send the trading desk an enquiry and get a quote back.",
    href: "/hub/order-desk",
    body: [
      "Tell the desk what you need: product and grade, quantity, packaging, origin preference, destination, Incoterms, shipping window, target price, prepayment and payment terms. Your enquiry goes straight to the Aquifert trading desk and you see a confirmation straight away. It also appears under Recent requests on your Dashboard.",
      "Where Aquifert Zero is open, its tab explains the programme and lets you register interest for a pilot slot. You can update your details at any time.",
    ],
    tip: "The more specific the grade, window and destination, the faster and sharper the quote.",
  },
  {
    id: "call",
    title: "Freight Analytics Call",
    icon: PhoneCall,
    summary: "A free live call with the desk on fertilizer prices and freight.",
    href: "/hub/community-call",
    body: [
      "The desk walks through the market and freight, then answers members' questions. Registration is free on every plan. Register in one click, add the call to your calendar and send in the question you want answered.",
      "The joining link appears on the page 15 minutes before the start. Times are shown in your own time zone.",
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: Mail,
    summary: "Four ways to reach a person on the desk.",
    href: "/hub/contact",
    body: ["Start a WhatsApp chat, book a meeting in the calendar, send a message, or open Order Fertilizer Now when you are ready to buy. When you arrive from a locked page or Membership, the topic is filled in for you."],
  },
  {
    id: "plans",
    title: "Plans, usage and limits",
    icon: Layers,
    summary: "What each plan includes and how monthly limits work.",
    href: "/hub/plan-usage",
    aliases: ["plan-usage"],
    body: [
      "Plan & Usage shows every allowance in one place: what you have used this month, your limit and the date it resets. Calculations, Aquibot questions and Nitrogen Reports are counted per calendar month.",
      "Reading is included on every plan: AQ ONE sees Public Telex and Free library files, AQ Analytics adds the AQ Analytics items, and AQ ZERO sees everything.",
    ],
  },
  {
    id: "membership",
    title: "Membership and billing",
    icon: Crown,
    summary: "Compare plans, ask to move plan, and see your invoices.",
    href: "/hub/membership",
    aliases: ["billing"],
    body: [
      "AQ ONE is the free plan. Membership shows the paid options as cards: Sprout (up to 200 tonnes a month), Harvest (201 to 600 tonnes) and Scale (unlimited) are AQ ZERO memberships that replace the margin on every quote, and AQ Analytics (£299 a month) adds licensed market data without physical trading. Switch between monthly and annual billing (10% off), select a card and send the request; the desk confirms and moves your account, and you can follow the request's status on the same page. A table below compares the modules and allowances of each plan.",
      "Billing shows your plan, the contact the desk invoices, and your invoices and payment history. The desk handles billing directly, so a person is always on hand for questions.",
    ],
  },
  {
    id: "analytics",
    title: "AQ Analytics",
    icon: ChartLine,
    summary: "Deeper data unlocked by plan: the full wire, price series, signal, freight and the briefing.",
    href: "/hub/analytics",
    aliases: ["a-telex", "a-market", "a-signal", "a-freight", "a-briefing", "a-alerts", "freight-analytics"],
    body: [
      "AQ TELEX is the full desk wire for every plan tier, searchable, with the complete archive and a CSV export. Market Data charts the benchmark price series for nitrogen, phosphate, potash and freight, and each series downloads as CSV. AQ Signal extends the signal windows to 180 days on every tracked series.",
      "Freight Analytics covers lane benchmarks, recent fixtures and desk commentary on vessel supply. The Briefing is the desk's weekly written issue with the full back catalogue, ready to print. Alerts & Brief lets you set a price above or below which you want to know; triggered alerts show on your Dashboard each time the desk updates prices.",
    ],
    tip: "A locked module shows what it covers and a preview. Upgrade from Membership, or talk to the desk to arrange a trial.",
  },
  {
    id: "supply-demand",
    title: "Supply & Demand",
    icon: Scale,
    summary: "Balance sheets for the major nutrients and the direction of travel.",
    href: "/hub/analytics/supply-demand",
    aliases: ["a-sd"],
    body: [
      "Each balance lists production, consumption, trade and closing stocks by year, with the surplus or deficit and the desk's commentary on where the market is heading.",
    ],
    points: [
      { term: "Surplus", text: "Supply minus demand. A negative number is a deficit, which usually supports prices." },
      { term: "Stocks-to-use", text: "Closing stocks as a share of a year's consumption. Lower means tighter." },
      { term: "Direction", text: "Whether the balance is tightening or loosening compared with the year before." },
    ],
  },
  {
    id: "freight",
    title: "Freight Calculator",
    icon: Calculator,
    summary: "Estimate a voyage's freight rate between any two ports.",
    href: "/hub/freight-calculator",
    body: [
      "Choose a load port and a discharge port, the cargo type and the tonnage (35,000 MT by default), then set the market: Normal, Tight (+10%) or Oversupplied (−10%). Port costs, agency and extra port days are pre-filled and editable. Tap a city on the VLSFO bar to use its bunker price.",
      "The result is an estimated freight rate in USD/MT with gross revenue and time-charter equivalent per day. Below it you get the distance, voyage days, vessel type, the Baltic Dry Index and the route (Direct, Suez, Panama or Cape), then the full cost breakdown: voyage costs, time costs and premiums for cargo type, origin region, season and war risk where it applies.",
      "Market benchmark compares the estimate with verified fixtures. When the estimate sits outside the verified band, the displayed rate is blended toward the band's midpoint and marked Outside band.",
    ],
    tip: "Share copies a link with every input filled in, so a colleague sees exactly the voyage you priced.",
  },
  {
    id: "tools",
    title: "Tools",
    icon: Wrench,
    summary: "Interactive map, production cost calculator, process guides and glossary.",
    href: "/hub/tools",
    body: [
      "World Map layers NH₃ terminals, urea exporters, phosphate producers and potash mines, with export and ex-works cost curves. Tap a country or bar for its facts.",
      "Cost Calculator moves natural gas, phosphate rock and sulphur prices and shows the production cost of eleven products, from ammonia and urea to MAP and DAP. Tap a product card for its breakdown. How It's Made shows each production chain and the Glossary defines the key terms.",
    ],
  },
  {
    id: "account",
    title: "Your account",
    icon: UserCircle,
    summary: "Profile, password and legal notices.",
    href: "/hub/account",
    body: [
      "Profile holds your name, email and billing address. Password lets you change how you sign in. Legal sets out how calculator outputs are meant to be used: as estimates, not fixtures, offers or customs advice.",
    ],
  },
];

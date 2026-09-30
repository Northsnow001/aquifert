import {
  Archive,
  ArrowLeftRight,
  Calculator,
  Compass,
  FileText,
  Home,
  Layers,
  Mail,
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
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "start",
    title: "Getting around",
    icon: Compass,
    summary: "Where everything lives and the fastest ways to reach it.",
    body: [
      "The sidebar groups the hub into Markets, Calculators, Desk and You. Hover any item and tap the small ⓘ for a one-line explanation. On a phone, the tab bar at the bottom holds the four places you use most, and More opens the full menu.",
    ],
    points: [
      { term: "Search", text: "Press Ctrl K (⌘ K on Mac) or tap the search pill to jump to any page or ask Aquibot directly." },
      { term: "Ask Aquibot", text: "The gradient pill in the top bar opens Aquibot from anywhere." },
      { term: "Account menu", text: "Your initials, top right: account, this guide, the tour and log out." },
    ],
    tip: "New here? Take the tour. It walks through the six places that matter in under a minute.",
  },
  {
    id: "home",
    title: "Home and market indicators",
    icon: Home,
    summary: "Gauges, the Telex feed, commentary and forward curves.",
    href: "/hub",
    body: [
      "Home is your morning read. It opens with three market indicators, each scored from 0 to 100 with the date it was set and a stance. Hover a card for the desk's longer note.",
      "The Telex feed is the desk's running log of market events: tenders, price moves, plant outages, policy changes and cargoes on the move. Newest items sit at the top. Posts are marked Public, Growth+ or Enterprise and appear according to your plan. Treat Telex as preliminary intel and verify figures before trading.",
      "Market Commentary explains each indicator in full. When the desk publishes forward curves, Direct Hedge | Paper Forward Curves shows bid and ask prices in USD/t by month for each product. Pick a report from the Published dropdown; arrows show whether each price moved higher, lower or held.",
    ],
    points: [
      { term: "Bullish", text: "Score above 66, shown in green." },
      { term: "Neutral", text: "Score from 34 to 66, shown in amber." },
      { term: "Bearish", text: "Score below 34, shown in red." },
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
    id: "library",
    title: "Library",
    icon: Archive,
    summary: "Every report and research note the desk has published.",
    href: "/hub/library",
    body: [
      "Search by title, filename or collection, or filter by collection. Each file carries an access badge: Free, Growth+ or Enterprise. Details shows the summary, Open views a PDF in your browser and Download saves the file.",
      "Files above your plan show a lock and an upgrade button that takes you to your plan options.",
    ],
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
    id: "order",
    title: "Order Desk",
    icon: FileText,
    summary: "Send the trading desk an enquiry and get a quote back.",
    href: "/hub/order-desk",
    body: [
      "Tell the desk what you need: product and grade, quantity, packaging, origin preference, destination, Incoterms, shipping window, target price, prepayment and payment terms. Your enquiry goes straight to the Aquifert trading desk and you see a confirmation straight away.",
      "Where Aquifert Zero is open, its tab explains the programme and lets you register interest for a pilot slot. You can update your details at any time.",
    ],
    tip: "The more specific the grade, window and destination, the faster and sharper the quote.",
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
    id: "contact",
    title: "Contact Us",
    icon: Mail,
    summary: "Four ways to reach a person on the desk.",
    href: "/hub/contact",
    body: ["Start a WhatsApp chat, book a meeting in the calendar, send a message, or open the Order Desk when you are ready to buy."],
  },
  {
    id: "account",
    title: "Your account",
    icon: UserCircle,
    summary: "Profile, password, plan and legal notices.",
    href: "/hub/account",
    body: [
      "Profile holds your name, email and billing address. Plan shows your current plan and how the plans compare; to change plan, contact the desk and it is set up for you. Legal sets out how calculator outputs are meant to be used: as estimates, not fixtures, offers or customs advice.",
    ],
  },
  {
    id: "plans",
    title: "Plans and limits",
    icon: Layers,
    summary: "What each plan includes and how monthly limits work.",
    href: "/hub/account/plan",
    body: [
      "Reading is included on every plan: Core sees Public Telex and Free library files, Growth adds Growth+, and Enterprise sees everything. Calculations and Aquibot questions are counted per calendar month. Each tool shows what you have used, your limit and the date it resets.",
    ],
  },
];

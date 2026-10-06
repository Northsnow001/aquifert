/**
 * Nitrogen Report: turns the one-page, six-question survey into an AQ View Special Edition
 * brief. Deterministic desk rules over desk reference data, so the same answers always give
 * the same brief. The brief is structured data; the report page, the PDF and the stored
 * Markdown all render from it.
 *
 * Editorial rules: British spelling, metric tonnes (t), no em dashes, exclamation marks or
 * ellipses, short sentences with one point per paragraph, and no invented transactions.
 */

import type { LegacyNitrogenAnswers } from "@/lib/nitrogen/legacy";

export type NitrogenAnswers = {
  destinationCountry: string;
  destinationPort: string;
  preferredOrigin: string;
  products: string[];
  annualTonnage: string;
  /** Months as YYYY-MM, picked from the next twelve. */
  arrivalMonths: string[];
  shipmentType: string;
  packing: string;
  warehouseCapacity: string;
};

/** What a saved report holds: this survey, or the four-section one used before it. */
export type StoredNitrogenAnswers = NitrogenAnswers | LegacyNitrogenAnswers;

export const PRODUCTS = ["Urea", "Ammonium Nitrate", "CAN", "UAN solution", "Ammonium Sulphate", "Inhibited urea"];
export const SHIPMENT_TYPES = ["Bulk", "Break Bulk", "Container"];
export const PACKING = ["Big Bags", "50kg", "25kg"];

export const EMPTY_ANSWERS: NitrogenAnswers = {
  destinationCountry: "",
  destinationPort: "",
  preferredOrigin: "",
  products: [],
  annualTonnage: "",
  arrivalMonths: [],
  shipmentType: "",
  packing: "",
  warehouseCapacity: "",
};

export const isBriefAnswers = (answers: unknown): answers is NitrogenAnswers =>
  Boolean(answers) && Array.isArray((answers as NitrogenAnswers).products) && typeof (answers as NitrogenAnswers).shipmentType === "string";

/* ---------------------------------------------------------------- helpers */

export function parseNumber(value: string): number {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

/** The current month and the eleven after it, as YYYY-MM in UTC so server and browser agree. */
export function upcomingMonths(from = new Date(), count = 12): string[] {
  return Array.from({ length: count }, (_, n) => {
    const month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + n, 1));
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthLabel(value: string, style: "short" | "long" = "short") {
  const [year, month] = value.split("-").map(Number);
  const name = MONTH_NAMES[month - 1];
  if (!year || !name) return value;
  return `${style === "short" ? name.slice(0, 3) : name} ${year}`;
}

export const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? "";

/** ISO 8601 week, e.g. "W41 2026". */
export function weekLabel(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return `W${Math.ceil(((day.getTime() - yearStart) / 864e5 + 1) / 7)} ${day.getUTCFullYear()}`;
}

/** Returns the first problem with the answers, or null when the brief can be built. */
export function briefProblem(a: NitrogenAnswers): string | null {
  if (!a.destinationCountry.trim()) return "Add the destination country.";
  if (!a.products.length) return "Pick at least one product.";
  if (!(parseNumber(a.annualTonnage) > 0)) return "Add your annual tonnage.";
  if (!a.arrivalMonths.length) return "Choose at least one preferred arrival month.";
  if (!a.shipmentType) return "Choose the shipment type.";
  if (!a.packing) return "Choose the packing.";
  return null;
}

/** How many of the six required answers are in, for the progress bar. */
export const answeredCount = (a: NitrogenAnswers) =>
  [a.destinationCountry.trim(), a.products.length, parseNumber(a.annualTonnage) > 0, a.arrivalMonths.length, a.shipmentType, a.packing].filter(Boolean).length;

const ORDER_PRODUCT: Record<string, string> = {
  Urea: "Urea - Granular",
  "Inhibited urea": "Urea - Granular",
  "Ammonium Nitrate": "AN",
  CAN: "CAN",
  "UAN solution": "UAN",
  "Ammonium Sulphate": "Amsul",
};

const productsOf = (a: Partial<StoredNitrogenAnswers>) =>
  ("products" in a && Array.isArray(a.products) ? a.products : "nitrogenSources" in a && Array.isArray(a.nitrogenSources) ? a.nitrogenSources : []) as string[];

/** Order Desk link with the report's product and destination filled in. */
export function orderDeskHref(a: Partial<StoredNitrogenAnswers>) {
  const params = new URLSearchParams();
  const product = ORDER_PRODUCT[productsOf(a)[0] ?? ""];
  const destination = [a.destinationPort, a.destinationCountry].map((part) => part?.trim()).filter(Boolean).join(", ");
  if (product) params.set("product", product);
  if (destination) params.set("destination", destination);
  const query = params.toString();
  return query ? `/hub/order-desk?${query}` : "/hub/order-desk";
}

/** Short "what was this report about" line for lists. */
export function reportTopic(a: Partial<StoredNitrogenAnswers> | null | undefined) {
  if (!a) return "";
  if ("cropType" in a && a.cropType) return a.cropType;
  return productsOf(a).join(", ");
}

/* --------------------------------------------------------- desk reference */

export type PulseSignal = "Firm" | "Soft" | "Balanced" | "Watch";

const PRODUCT_PULSE: Record<string, { view: string; signal: PulseSignal }> = {
  Urea: {
    view: "The deepest and most liquid nitrogen market. Origin competition is wide and prompt availability is adequate. Brazilian and European programmes set the tone into the next quarter.",
    signal: "Firm",
  },
  "Ammonium Nitrate": {
    view: "European supply is orderly and demand is seasonal. Regulatory handling limits keep trade regional rather than global.",
    signal: "Balanced",
  },
  CAN: {
    view: "Stable European grade with steady seasonal interest. Availability is comfortable across northern ports.",
    signal: "Balanced",
  },
  "UAN solution": {
    view: "Freight weight per unit of N keeps UAN a regional trade. Rouen and Hamburg sets are quoted flat to slightly easier.",
    signal: "Soft",
  },
  "Ammonium Sulphate": {
    view: "Chinese auction clears and Brazilian granular demand underpin the complex. Export allocation is the near-term swing factor.",
    signal: "Firm",
  },
  "Inhibited urea": {
    view: "A premium efficiency grade following the underlying urea complex. Margins over standard urea are steady.",
    signal: "Firm",
  },
};

const PRODUCT_NOTE: Record<string, string> = {
  Urea: "Urea (46% N) is the reference nitrogen market, with the widest origin competition and typically the lowest cost per unit of N.",
  "Ammonium Nitrate": "Ammonium nitrate (33.5-34.5% N) offers fast, reliable uptake. Storage and transport regulation is tighter in several jurisdictions.",
  CAN: "CAN (27% N) is a stable calcium ammonium nitrate grade popular across Europe, easier to store and handle than straight AN.",
  "UAN solution": "UAN suits liquid application systems and blending. Freight is weight-heavy per unit of N, so regional sourcing matters.",
  "Ammonium Sulphate": "Ammonium sulphate (21% N plus 24% S) adds a sulphur credit and is competitive where sulphur deficiency is a factor.",
  "Inhibited urea": "Inhibited urea adds a urease or nitrification inhibitor to standard urea, protecting efficiency where incorporation is delayed.",
};

const SHIPMENT_GUIDANCE: Record<string, string> = {
  Bulk: "Bulk vessel shipment is the lowest-cost mode per tonne and suits single-product parcels of 3,000 t and up. It requires berth access, grab or conveyor discharge and covered bulk storage at destination. Demurrage risk is managed with clear laytime terms and an agreed discharge rate.",
  "Break Bulk":
    "Break bulk shipment carries bagged or big-bag cargo in a geared vessel's holds. It suits multi-product consignments and ports without bulk handling. It adds stevedoring cost and weather-sensitive discharge, so arrival windows should carry buffer days.",
  Container:
    "Containerised shipment gives the most flexible routing, the widest port coverage and the simplest onward distribution in smaller lots, at the highest per-tonne freight. It suits parcels under roughly 500 t and buyers with limited storage.",
};

const PACKING_GUIDANCE: Record<string, string> = {
  "Big Bags": "Big bags (500-1,000 kg) suit forklift handling and direct transfer to spreaders or blending lines. They keep port and store handling simple at moderate volumes.",
  "50kg": "Fifty-kilogram bags suit manual handling and merchant distribution. Palletised and shrink-wrapped presentation protects the product through onward retail channels.",
  "25kg": "Twenty-five-kilogram bags suit specialty and retail channels. Unit handling cost is highest, so packing at origin should be confirmed against the resale format.",
};

const FREIGHT_PULSE: Record<string, { view: string; signal: PulseSignal }> = {
  Bulk: { view: "Dry bulk rates are range-bound; prompt handysize and supramax tonnage is available on the main nitrogen routes.", signal: "Balanced" },
  "Break Bulk": { view: "Geared tonnage is available on most nitrogen routes; stevedoring capacity at discharge is the constraint to watch.", signal: "Balanced" },
  Container: { view: "Container indices remain elevated on main east-west lanes; booking lead times of three to four weeks are prudent.", signal: "Watch" },
};

/* ------------------------------------------------------------------ brief */

export const BRIEF_TITLE = "AQ VIEW SPECIAL EDITION | Nitrogen Brief";
export const BRIEF_QUOTE = { text: "The intelligent investor is a realist who sells to optimists and buys from pessimists.", source: "Benjamin Graham, The Intelligent Investor, 1949" };
export const BRIEF_FOOTER = "Aquifert ONE Hub | aquifert.com | 71-75 Shelton Street, London WC2H 9JQ";

export type NitrogenBrief = {
  refNo: string;
  partner: string;
  week: string;
  date: string;
  disclaimer: string;
  requirement: [string, string][];
  pulse: { market: string; view: string; signal: PulseSignal }[];
  position: string[];
  products: { name: string; note: string; view: string }[];
  logistics: string[];
  recommendations: { label: string; text: string }[];
};

export function buildBrief(a: NitrogenAnswers, { refNo, partner: partnerName = "", date = new Date() }: { refNo: string; partner?: string; date?: Date }): NitrogenBrief {
  const annual = parseNumber(a.annualTonnage);
  const warehouse = parseNumber(a.warehouseCapacity);
  const products = a.products.length ? a.products : ["Urea"];
  const type = a.shipmentType || "Bulk";
  const months = [...a.arrivalMonths].sort().map((month) => monthLabel(month, "long"));
  const partner = partnerName.trim() || "Partner";
  const destination = [a.destinationCountry, a.destinationPort].filter(Boolean).join(", ") || "the stated destination";
  const tonnage = annual > 0 ? annual.toLocaleString("en-GB") : "";

  // Parcels sized against warehouse capacity, or against what the shipment mode carries.
  const modeCap = type === "Container" ? 300 : type === "Break Bulk" ? 1500 : 3000;
  const lotSize = warehouse > 0 ? warehouse : annual > 0 ? Math.min(annual, modeCap) : 0;
  const parcels = annual > 0 && lotSize > 0 ? Math.max(1, Math.min(12, Math.ceil(annual / lotSize))) : null;
  const parcelSize = parcels ? Math.round(annual / parcels).toLocaleString("en-GB") : null;
  const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

  const monthSpan = months.length === 0 ? "the stated window" : months.length === 1 ? months[0] : `${months[0]} to ${months[months.length - 1]}`;

  const position = [
    `${partner} is buying ${products.join(", ")} into ${destination}. The stated programme is ${tonnage ? `${tonnage} t` : "an undisclosed volume"} per year, arriving ${monthSpan}. That profile shapes every recommendation in this brief.`,
    products.length > 1
      ? `The basket spreads risk across ${products.length} nitrogen sources. That is sensible. It lets the desk arbitrage origins and switch grades if one complex tightens.`
      : `${products[0]} is the core of the programme. Concentration keeps execution simple but ties the cost base to one complex.`,
    type === "Bulk"
      ? `Bulk shipment into ${a.destinationPort || destination} implies port discharge and covered storage are in place. ${parcels ? `Against the stated programme the desk would structure ${plural(parcels, "parcel")} of roughly ${parcelSize} t.` : "Parcel sizing follows once annual tonnage is confirmed."}`
      : type === "Break Bulk"
        ? `Break bulk suits the packing specification. ${parcels ? `The desk would structure ${plural(parcels, "parcel")} of roughly ${parcelSize} t across ${monthSpan}.` : "Parcel sizing follows once annual tonnage is confirmed."}`
        : `Containerised arrival gives flexibility across ${monthSpan}. ${parcels ? `The programme divides into approximately ${plural(parcels, "container consignment")}.` : "Consignment sizing follows once annual tonnage is confirmed."}`,
    a.preferredOrigin
      ? `The stated origin preference, ${a.preferredOrigin}, is noted. The desk will quote it alongside at least one alternative origin so the freight-adjusted spread is visible before commitment.`
      : "No origin preference was stated. The desk will quote the two or three most competitive origins on a freight-adjusted, landed-cost basis.",
  ];

  const read = (signal: PulseSignal) =>
    signal === "Firm" ? "a market to cover in tranches rather than chase" : signal === "Soft" ? "a market where patience is rewarded" : "a balanced market where timing matters more than direction";

  return {
    refNo,
    partner,
    week: weekLabel(date),
    date: date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    disclaimer: `Prepared exclusively for ${partner}. Assessments are indicative and drawn from desk reference data. Prices are not quotations and do not constitute trading recommendations.`,
    requirement: [
      ["Products", products.join(", ")],
      ["Annual tonnage", tonnage ? `${tonnage} t` : "Not stated"],
      ["Destination", destination],
      ["Preferred origin", a.preferredOrigin || "Open"],
      ["Preferred arrival months", months.length ? months.join(", ") : "Flexible"],
      ["Shipment type", type],
      ["Packing", a.packing || "Not stated"],
      ["Warehouse capacity", warehouse > 0 ? `${warehouse.toLocaleString("en-GB")} t` : "Not stated"],
    ],
    pulse: [
      ...products.map((name) => ({ market: name, ...(PRODUCT_PULSE[name] ?? { view: "A recognised nitrogen source; the desk will quote availability across origins.", signal: "Balanced" as const }) })),
      { market: `Freight / ${type}`, ...(FREIGHT_PULSE[type] ?? FREIGHT_PULSE.Bulk) },
    ],
    position,
    products: products.map((name) => {
      const pulse = PRODUCT_PULSE[name];
      return {
        name,
        note: PRODUCT_NOTE[name] ?? "The desk will quote availability across vetted origins.",
        view: pulse
          ? `${pulse.view} For a buyer programme into ${destination}, the desk reads this as ${read(pulse.signal)}.`
          : `The desk will assess ${name} availability against the arrival months stated before quoting.`,
      };
    }),
    logistics: [
      SHIPMENT_GUIDANCE[type] ?? "The desk will structure the shipment mode against parcel size and port capability.",
      PACKING_GUIDANCE[a.packing] ?? "Packing is confirmed at origin against the resale and handling format.",
      parcels
        ? `Against the stated programme, the desk structures ${plural(parcels, "shipment")} across ${monthSpan}. This spreads arrival risk and smooths working capital.`
        : "Share annual tonnage and storage capacity and the desk will structure a shipment schedule against them.",
    ],
    recommendations: [
      {
        label: "What to do now",
        text: "Send this brief to the desk as a sourcing request on Aquifert ONE, with the products, tonnage and arrival months stated. The desk returns anonymised, landed-cost quotations from vetted suppliers: cost plus pass-through freight and a stated fee, with a full document trail.",
      },
      {
        label: "What to watch",
        text: `${products.includes("Urea") ? "Brazilian import pace and Chinese export quota announcements set the urea tone into the next quarter. " : ""}${
          type === "Container" ? "Container freight indices on the relevant lanes, booked three to four weeks ahead. " : "Freight availability for the arrival window, fixed at enquiry stage. "
        }Arrival scheduling across ${monthSpan} should be confirmed against storage capacity${warehouse > 0 ? ` of ${warehouse.toLocaleString("en-GB")} t` : ""}.`,
      },
      {
        label: "What to avoid",
        text: "Do not concentrate the full annual programme into a single arrival month. Do not commit to an origin before seeing the freight-adjusted spread. Avoid open exposure past the first stated arrival month without a desk review.",
      },
    ],
  };
}

const cell = (value: string) => value.replace(/\|/g, "/");

/** The brief as Markdown, stored with the report and shown in the admin console. */
export function briefMarkdown(b: NitrogenBrief): string {
  return [
    `# ${BRIEF_TITLE}`,
    `**${b.partner} Partnership Intelligence** | Prepared by the Aquifert Trading Desk`,
    `**${b.week}** | ${b.date} | Reference ${b.refNo} | Confidential. Not for redistribution.`,
    `*${b.disclaimer}*`,
    `## Supply Requirement`,
    ["| Parameter | Value |", "|---|---|", ...b.requirement.map(([name, value]) => `| ${name} | ${cell(value)} |`)].join("\n"),
    `## Market Pulse | ${b.week}`,
    [`| Market | ${b.week} View | Signal |`, "|---|---|---|", ...b.pulse.map((row) => `| ${cell(row.market)} | ${cell(row.view)} | ${row.signal} |`)].join("\n"),
    `## The Position`,
    ...b.position,
    ...b.products.flatMap((item) => [`## ${item.name}`, item.note, item.view]),
    `## Logistics and Shipment Plan`,
    ...b.logistics,
    `## Recommendations`,
    ...b.recommendations.map((item) => `**${item.label}.** ${item.text}`),
    `---`,
    `*“${BRIEF_QUOTE.text}” ${BRIEF_QUOTE.source}*`,
    `*${BRIEF_FOOTER}*`,
  ].join("\n\n");
}

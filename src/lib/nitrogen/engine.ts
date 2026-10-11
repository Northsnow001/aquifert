/**
 * Nitrogen Report: turns the one-page, six-question survey into an AQ View Special Edition
 * brief. Deterministic desk rules over desk reference data, so the same answers always give
 * the same brief. The brief is structured data; the report page, the PDF and the stored
 * Markdown all render from it.
 *
 * Editorial rules: British spelling, metric tonnes (MT), no em dashes, exclamation marks or
 * ellipses, short sentences with one point per paragraph, and no invented transactions.
 */

import type { LegacyNitrogenAnswers } from "@/lib/nitrogen/legacy";
import { DEFAULT_REFERENCE, type DeskReference, type PulseSignal } from "@/lib/nitrogen/reference";

export type { PulseSignal } from "@/lib/nitrogen/reference";

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
  /** Free text in MT: one figure or a range, e.g. "5,000" or "5,000-10,000". */
  cargoSize: string;
  /** Asked before preferred cargo size replaced it; only on older reports. */
  warehouseCapacity?: string;
};

/** What a saved report holds: this survey, or the four-section one used before it. */
export type StoredNitrogenAnswers = NitrogenAnswers | LegacyNitrogenAnswers;

export const PRODUCTS = ["Urea", "Ammonium Nitrate", "CAN", "UAN solution", "Ammonium Sulphate", "Inhibited urea"];
export const SHIPMENT_TYPES = ["Bulk", "Break Bulk", "Container"];
export const PACKING = ["Big Bags", "50kg", "25kg", "In bulk"];

export const EMPTY_ANSWERS: NitrogenAnswers = {
  destinationCountry: "",
  destinationPort: "",
  preferredOrigin: "",
  products: [],
  annualTonnage: "",
  arrivalMonths: [],
  shipmentType: "",
  packing: "",
  cargoSize: "",
};

export const isBriefAnswers = (answers: unknown): answers is NitrogenAnswers =>
  Boolean(answers) && Array.isArray((answers as NitrogenAnswers).products) && typeof (answers as NitrogenAnswers).shipmentType === "string";

/* ---------------------------------------------------------------- helpers */

export function parseNumber(value: string): number {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

/** The largest figure in a cargo size, so a range like "5,000-10,000" sizes parcels by its upper end. */
export function cargoSizeTonnes(value: string | undefined): number {
  const figures = (value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? [];
  return figures.reduce((max, figure) => Math.max(max, Number(figure)), 0);
}

/** A cargo size as written, with "MT" added when the member left the unit off; a lone figure gets thousands separators. */
export function cargoSizeLabel(value: string | undefined): string {
  const text = (value ?? "").trim();
  if (!text) return "";
  if (/\b(mt|tonnes?|tons?)\b/i.test(text)) return text;
  const single = /^\d[\d,]*(\.\d+)?$/.test(text) ? Number(text.replace(/,/g, "")) : NaN;
  return `${Number.isFinite(single) ? single.toLocaleString("en-GB") : text} MT`;
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

/* ------------------------------------------------------------------ brief */

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

/** The desk-rules brief. AI writing starts from it, and it is used whenever AI is off or fails. */
export function buildBrief(
  a: NitrogenAnswers,
  { refNo, partner: partnerName = "", date = new Date(), reference = DEFAULT_REFERENCE }: { refNo: string; partner?: string; date?: Date; reference?: DeskReference },
): NitrogenBrief {
  const { products: PRODUCT_REF, freight: FREIGHT_PULSE, shipping: SHIPMENT_GUIDANCE, packing: PACKING_GUIDANCE } = reference;
  const annual = parseNumber(a.annualTonnage);
  const cargo = cargoSizeTonnes(a.cargoSize) || parseNumber(a.warehouseCapacity ?? "");
  const cargoLabel = cargoSizeLabel(a.cargoSize);
  const products = a.products.length ? a.products : ["Urea"];
  const type = a.shipmentType || "Bulk";
  const months = [...a.arrivalMonths].sort().map((month) => monthLabel(month, "long"));
  const partner = partnerName.trim() || "Partner";
  const destination = [a.destinationCountry, a.destinationPort].filter(Boolean).join(", ") || "the stated destination";
  const tonnage = annual > 0 ? annual.toLocaleString("en-GB") : "";

  // Parcels sized against the preferred cargo size, or against what the shipment mode carries.
  const modeCap = type === "Container" ? 300 : type === "Break Bulk" ? 1500 : 3000;
  const lotSize = cargo > 0 ? cargo : annual > 0 ? Math.min(annual, modeCap) : 0;
  const parcels = annual > 0 && lotSize > 0 ? Math.max(1, Math.min(12, Math.ceil(annual / lotSize))) : null;
  const parcelSize = parcels ? Math.round(annual / parcels).toLocaleString("en-GB") : null;
  const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

  const monthSpan = months.length === 0 ? "the stated window" : months.length === 1 ? months[0] : `${months[0]} to ${months[months.length - 1]}`;

  const position = [
    `${partner} is buying ${products.join(", ")} into ${destination}. The stated programme is ${tonnage ? `${tonnage} MT` : "an undisclosed volume"} per year, arriving ${monthSpan}. That profile shapes every recommendation in this brief.`,
    products.length > 1
      ? `The basket spreads risk across ${products.length} nitrogen sources. That is sensible. It lets the desk arbitrage origins and switch grades if one complex tightens.`
      : `${products[0]} is the core of the programme. Concentration keeps execution simple but ties the cost base to one complex.`,
    type === "Bulk"
      ? `Bulk shipment into ${a.destinationPort || destination} implies port discharge and covered storage are in place. ${parcels ? `Against the stated programme the desk would structure ${plural(parcels, "parcel")} of roughly ${parcelSize} MT.` : "Parcel sizing follows once annual tonnage is confirmed."}`
      : type === "Break Bulk"
        ? `Break bulk suits the packing specification. ${parcels ? `The desk would structure ${plural(parcels, "parcel")} of roughly ${parcelSize} MT across ${monthSpan}.` : "Parcel sizing follows once annual tonnage is confirmed."}`
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
      ["Annual tonnage", tonnage ? `${tonnage} MT` : "Not stated"],
      ["Destination", destination],
      ["Preferred origin", a.preferredOrigin || "Open"],
      ["Preferred arrival months", months.length ? months.join(", ") : "Flexible"],
      ["Shipment type", type],
      ["Packing", a.packing || "Not stated"],
      ["Preferred cargo size", cargoLabel || "Flexible"],
    ],
    pulse: [
      ...products.map((name) => {
        const ref = PRODUCT_REF[name];
        return { market: name, ...(ref ? { view: ref.view, signal: ref.signal } : { view: "A recognised nitrogen source; the desk will quote availability across origins.", signal: "Balanced" as const }) };
      }),
      { market: `Freight / ${type}`, ...(FREIGHT_PULSE[type] ?? FREIGHT_PULSE.Bulk ?? DEFAULT_REFERENCE.freight.Bulk) },
    ],
    position,
    products: products.map((name) => {
      const pulse = PRODUCT_REF[name];
      return {
        name,
        note: pulse?.note || "The desk will quote availability across vetted origins.",
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
        : "Share annual tonnage and a preferred cargo size and the desk will structure a shipment schedule against them.",
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
        }Arrival scheduling across ${monthSpan} should be confirmed against discharge and storage capacity at destination.`,
      },
      {
        label: "What to avoid",
        text: "Do not concentrate the full annual programme into a single arrival month. Do not commit to an origin before seeing the freight-adjusted spread. Avoid open exposure past the first stated arrival month without a desk review.",
      },
    ],
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");

/** A brief saved with a report, checked before it is shown; null when it is missing or damaged. */
export function storedBrief(value: unknown): NitrogenBrief | null {
  if (!isRecord(value)) return null;
  const ok =
    typeof value.refNo === "string" &&
    typeof value.partner === "string" &&
    typeof value.week === "string" &&
    typeof value.date === "string" &&
    Array.isArray(value.requirement) &&
    Array.isArray(value.pulse) &&
    strings(value.position) &&
    Array.isArray(value.products) &&
    strings(value.logistics) &&
    Array.isArray(value.recommendations);
  return ok ? (value as NitrogenBrief) : null;
}

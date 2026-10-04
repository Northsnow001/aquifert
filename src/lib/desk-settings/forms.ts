import type { DetailSection } from "@/lib/desk-settings/render";
import type { TemplateKind } from "@/lib/desk-settings/types";

export type OrderSubmission = {
  name: string;
  email: string;
  company: string;
  product: string;
  grade: string;
  quantity: string;
  packaging: string;
  pallets: string;
  origins: string;
  destination: string;
  incoterm: string;
  shipFrom: string;
  shipTo: string;
  currency: string;
  targetPrice: string;
  prepayment: string;
  paymentTerms: string;
  frequency: string;
  notes: string;
  submittedAt: string;
};

export type ZeroSubmission = {
  name: string;
  email: string;
  company: string;
  programme: string;
  /** "Join the waitlist" or "Book a call for early discounted access". */
  request: string;
  nextStep: string;
  phone: string;
  callDate: string;
  callWindow: string;
  timezone: string;
  annualVolume: string;
  product: string;
  notes: string;
  submittedAt: string;
};

const callDay = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : value;
};

const stamp = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
};

const tonnes = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) && value.trim() ? `${number.toLocaleString("en-GB")} MT` : value;
};

export function orderVars(order: OrderSubmission): Record<string, string> {
  return {
    user_name: order.name,
    user_email: order.email,
    user_company: order.company,
    product: order.product,
    qty: order.quantity,
    destination: order.destination,
    ship_from: order.shipFrom,
    ship_to: order.shipTo,
  };
}

export function orderSections(order: OrderSubmission): DetailSection[] {
  const price = Number(order.targetPrice);
  return [
    { title: "Contact information", rows: [["Name", order.name], ["Email", order.email], ["Company", order.company]] },
    {
      title: "Product details",
      rows: [["Product", order.product], ["Grade", order.grade], ["Quantity", tonnes(order.quantity)], ["Packaging", order.packaging], ["Pallets required", order.pallets]],
    },
    { title: "Origin and destination", rows: [["Origin", order.origins], ["Destination", order.destination], ["Incoterm", order.incoterm]] },
    { title: "Shipping period", rows: [["From", order.shipFrom], ["To", order.shipTo]] },
    {
      title: "Pricing and payment",
      rows: [
        ["Target price", order.targetPrice && Number.isFinite(price) ? `${order.currency} ${price.toFixed(2)} ${order.incoterm}` : ""],
        ["Prepayment", order.prepayment ? `${order.prepayment}%` : ""],
        ["Payment terms", order.paymentTerms],
        ["Purchase frequency", order.frequency],
      ],
    },
    { title: "Additional notes", rows: [["Notes", order.notes]] },
    { title: "Submission", rows: [["Submitted", stamp(order.submittedAt)]] },
  ];
}

export function zeroVars(zero: ZeroSubmission): Record<string, string> {
  return {
    user_name: zero.name,
    user_email: zero.email,
    user_company: zero.company,
    programme: zero.programme,
    request: zero.request,
    next_step: zero.nextStep,
    annual_volume: zero.annualVolume,
    primary_product: zero.product,
  };
}

export function zeroSections(zero: ZeroSubmission): DetailSection[] {
  return [
    {
      title: "Submission details",
      rows: [
        ["Request", zero.request],
        ["Name", zero.name],
        ["Email", zero.email],
        ["Company", zero.company],
        ["Programme", zero.programme],
        ["Estimated annual volume", tonnes(zero.annualVolume)],
        ["Primary product", zero.product],
        ["Preferred call day", callDay(zero.callDate)],
        ["Preferred call time", [zero.callWindow, zero.timezone].filter(Boolean).join(", ")],
        ["Phone", zero.phone],
        ["Additional notes", zero.notes],
        ["Submitted", stamp(zero.submittedAt)],
      ],
    },
    { title: "What happens next", rows: [["Next step", zero.nextStep]] },
  ];
}

export const ORDER_SAMPLE: OrderSubmission = {
  name: "Amara Okafor",
  email: "amara@harvestco.com",
  company: "Harvest Co",
  product: "Urea - Granular",
  grade: "46% N, 2–4 mm",
  quantity: "25000",
  packaging: "50kg",
  pallets: "no",
  origins: "Arab Gulf, North Africa",
  destination: "Lagos",
  incoterm: "CFR",
  shipFrom: "2026-11-01",
  shipTo: "2026-11-30",
  currency: "USD",
  targetPrice: "455",
  prepayment: "20",
  paymentTerms: "LC at sight",
  frequency: "Quarterly",
  notes: "Split discharge between Lagos and Onne is possible.",
  submittedAt: "2026-09-30T09:15:00.000Z",
};

export const ZERO_SAMPLE: ZeroSubmission = {
  name: "Amara Okafor",
  email: "amara@harvestco.com",
  company: "Harvest Co",
  programme: "AQ Zero Harvest",
  request: "Book a call for early discounted access",
  nextStep: "The desk will email you to confirm a call time. Early callers get discounted access when Aquifert Zero goes live.",
  phone: "+234 801 234 5678",
  callDate: "2026-10-06",
  callWindow: "Morning (09:00–12:00)",
  timezone: "Africa/Lagos",
  annualVolume: "5000",
  product: "Urea (Prilled / Granular)",
  notes: "Interested in a Q1 pilot slot.",
  submittedAt: "2026-09-30T09:15:00.000Z",
};

export function sampleFor(kind: TemplateKind) {
  return kind === "order"
    ? { vars: orderVars(ORDER_SAMPLE), sections: orderSections(ORDER_SAMPLE), email: ORDER_SAMPLE.email }
    : { vars: zeroVars(ZERO_SAMPLE), sections: zeroSections(ZERO_SAMPLE), email: ZERO_SAMPLE.email };
}

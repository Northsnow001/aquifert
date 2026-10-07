import { renderEmail, type DetailSection, type EmailAction, type EmailFrame } from "@/lib/desk-settings/render";
import type { EmailTemplate, TemplateKind } from "@/lib/desk-settings/types";
import { DESK_EMAIL, firstName } from "@/lib/email/brand";
import { ZERO_INTENT_LABEL } from "@/lib/zero-types";

export type OrderSubmission = {
  /** Quoted back to the member so replies can be matched to the enquiry. */
  reference: string;
  name: string;
  email: string;
  company: string;
  product: string;
  grade: string;
  quantity: string;
  packaging: string;
  pallets: string;
  customPackaging: string;
  /** No longer asked on the form; kept so older enquiries still show their origin. */
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
  /** "yes" or "no": can the buyer receive or arrange more than 1,000 tonnes a year. */
  largeVolume: string;
  /** "yes" or "no": would the buyer like a call from the desk. */
  wantsCall: string;
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

/** "2026-11" reads as "November 2026"; full dates from older enquiries pass through unchanged. */
export const monthLabel = (value: string) => {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

const tonnes = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) && value.trim() ? `${number.toLocaleString("en-GB")} MT` : value;
};

export function orderVars(order: OrderSubmission): Record<string, string> {
  return {
    first_name: firstName(order.name),
    reference: order.reference,
    user_name: order.name,
    user_email: order.email,
    user_company: order.company,
    product: order.product,
    qty: order.quantity,
    destination: order.destination,
    ship_from: monthLabel(order.shipFrom),
    ship_to: monthLabel(order.shipTo),
  };
}

export function orderSections(order: OrderSubmission): DetailSection[] {
  const price = Number(order.targetPrice);
  return [
    { title: "Contact information", rows: [["Reference", order.reference], ["Name", order.name], ["Email", order.email], ["Company", order.company]] },
    {
      title: "Product details",
      rows: [["Product", order.product], ["Grade", order.grade], ["Quantity", tonnes(order.quantity)], ["Packaging", order.packaging], ["Pallets required", order.pallets], ["Customised packaging", order.customPackaging]],
    },
    { title: order.origins ? "Origin and destination" : "Destination", rows: [["Origin", order.origins], ["Destination", order.destination], ["Incoterm", order.incoterm]] },
    { title: "Shipping period", rows: [["Preferred shipment month", monthLabel(order.shipFrom)], ["Preferred arrival month", monthLabel(order.shipTo)]] },
    {
      title: "Pricing and payment",
      rows: [
        ["Target price", order.targetPrice && Number.isFinite(price) ? `${order.currency} ${price.toFixed(2)} ${order.incoterm}` : ""],
        ["Prepayment", order.prepayment ? `${order.prepayment}%` : ""],
        ["Payment terms", order.paymentTerms],
      ],
    },
    {
      title: "Additional information",
      rows: [
        ["Receives or arranges over 1,000 t a year", order.largeVolume],
        ["Interested in a call", order.wantsCall],
        ["Purchase frequency", order.frequency],
        ["Notes", order.notes],
      ],
    },
    { title: "Submission", rows: [["Submitted", stamp(order.submittedAt)]] },
  ];
}

/** The short card in the member's confirmation; the desk alert gets every section. */
export function orderSummary(order: OrderSubmission): DetailSection[] {
  return [
    {
      title: "Your requirement",
      rows: [
        ["Reference", order.reference],
        ["Product", order.grade ? `${order.product} (${order.grade})` : order.product],
        ["Volume", tonnes(order.quantity)],
        ["Destination", order.destination],
        ["Shipping window", [monthLabel(order.shipFrom), monthLabel(order.shipTo)].filter(Boolean).join(" to ")],
      ],
    },
  ];
}

export function zeroVars(zero: ZeroSubmission): Record<string, string> {
  return {
    first_name: firstName(zero.name),
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

export function zeroSummary(zero: ZeroSubmission): DetailSection[] {
  return [
    {
      title: "Your registration",
      rows: [
        ["Programme", zero.programme],
        ["Request", zero.request],
        ["Estimated annual volume", tonnes(zero.annualVolume)],
        ["Primary product", zero.product],
      ],
    },
  ];
}

export type FormEmailData = { vars: Record<string, string>; sections: DetailSection[]; summary: DetailSection[] };

export const orderEmailData = (order: OrderSubmission): FormEmailData => ({ vars: orderVars(order), sections: orderSections(order), summary: orderSummary(order) });
export const zeroEmailData = (zero: ZeroSubmission): FormEmailData => ({ vars: zeroVars(zero), sections: zeroSections(zero), summary: zeroSummary(zero) });

function frameFor(kind: TemplateKind, audience: "applicant" | "admin", vars: Record<string, string>, deskEmail: string): Partial<EmailFrame> {
  if (audience === "admin") {
    return {
      preheader: kind === "order" ? `${vars.user_name || "A member"} sent an enquiry for ${vars.product || "fertilizer"}.` : `${vars.user_name || "A member"}: ${vars.request || "Aquifert Zero registration"}.`,
      tagline: "Trading desk alert",
      eyebrow: kind === "order" ? "New enquiry" : "Aquifert Zero",
      heading: kind === "order" ? "New enquiry" : "New Aquifert Zero registration",
      detailsTitle: "Submission",
      footerNote: `Sent to the desk address set in Admin → Settings → ${kind === "order" ? "Order Desk" : "Aquifert Zero"}.`,
      signature: false,
      deskEmail,
    };
  }
  if (kind === "order") {
    return {
      preheader: "Your trading requirement has been received. The desk is reviewing it and will come back to you.",
      tagline: "Transparent Global Fertiliser Access",
      eyebrow: "Trading desk · Requirement received",
      heading: "Your requirement is with the desk",
      detailsTitle: "Your requirement",
      footerNote: "You received this email because you submitted a requirement to the Aquifert trade desk.",
      deskEmail,
    };
  }
  const call = vars.request === ZERO_INTENT_LABEL.call;
  return {
    preheader: call
      ? "Thank you for registering for AQ Zero. Pick your call time and the desk will see you there."
      : "Thank you for joining the AQ Zero waitlist. The trade desk will be in touch when we are live.",
    tagline: "Transparent Global Fertiliser Access",
    eyebrow: call ? "AQ Zero · Call request received" : "AQ Zero · Waitlist confirmed",
    heading: "You are on the list",
    detailsTitle: "Your registration",
    footerNote: call ? "You received this email because you registered for AQ Zero." : "You received this email because you joined the AQ Zero waitlist.",
    deskEmail,
  };
}

function actionFor(kind: TemplateKind, audience: "applicant" | "admin", vars: Record<string, string>, deskEmail: string, adminHref: string): EmailAction {
  if (audience === "admin") return { label: "Open in admin", href: adminHref };
  const subject = kind === "order" ? `Requirement ${vars.reference ?? ""}`.trim() : "AQ Zero question";
  return { label: kind === "order" ? "Add detail to this requirement" : "Talk to the trade desk", href: `mailto:${deskEmail}?subject=${encodeURIComponent(subject)}` };
}

/** One form email, framed for its audience. Used for real sends, admin tests and the admin preview. */
export function formEmail(input: { kind: TemplateKind; audience: "applicant" | "admin"; template: EmailTemplate; data: FormEmailData; deskEmail?: string; adminHref: string }) {
  const desk = input.deskEmail?.trim() || DESK_EMAIL;
  return renderEmail({
    template: input.template,
    vars: input.data.vars,
    sections: input.audience === "applicant" ? input.data.summary : input.data.sections,
    action: actionFor(input.kind, input.audience, input.data.vars, desk, input.adminHref),
    frame: frameFor(input.kind, input.audience, input.data.vars, desk),
  });
}

export const ORDER_SAMPLE: OrderSubmission = {
  reference: "AQ-R-7K2M9Q",
  name: "Amara Okafor",
  email: "amara@harvestco.com",
  company: "Harvest Co",
  product: "Urea - Granular",
  grade: "46% N, 2–4 mm",
  quantity: "25000",
  packaging: "50kg",
  pallets: "no",
  customPackaging: "no",
  origins: "",
  destination: "Lagos",
  incoterm: "CFR",
  shipFrom: "2026-11",
  shipTo: "2026-12",
  currency: "USD",
  targetPrice: "455",
  prepayment: "20",
  paymentTerms: "LC at sight",
  frequency: "",
  largeVolume: "yes",
  wantsCall: "yes",
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
  return kind === "order" ? { data: orderEmailData(ORDER_SAMPLE), email: ORDER_SAMPLE.email } : { data: zeroEmailData(ZERO_SAMPLE), email: ZERO_SAMPLE.email };
}

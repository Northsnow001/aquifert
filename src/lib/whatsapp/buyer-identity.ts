import type { TradeBuyer, TradeBuyerDraft } from "@/lib/trade/types";

export const BUYER_TYPE_LABELS: Record<string, string> = {
  distributor: "Distributor",
  importer: "Importer",
  wholesaler: "Wholesaler",
  "government buyer": "Government Buyer",
  government: "Government Buyer",
  cooperative: "Cooperative",
  "end user": "End User",
  other: "Other",
};

export function canonicalBuyerType(raw: string) {
  return BUYER_TYPE_LABELS[raw.trim().toLowerCase()] || "";
}

export type IdentityFields = {
  name: string;
  jobTitle: string;
  company: string;
  email: string;
  country: string;
  address: string;
  buyerType: string;
  productsOfInterest: string;
  notes: string;
  phone: string;
  missing: string[];
};

export function identityFromBuyer(row: TradeBuyer): IdentityFields {
  return identityFromParts({
    name: row.contactName,
    jobTitle: row.jobTitle,
    company: row.companyName,
    email: row.email,
    country: row.country,
    address: row.address,
    buyerType: row.buyerType,
    productsOfInterest: row.productsOfInterest,
    notes: row.notes,
    phone: row.whatsappE164 || "",
  });
}

export function identityFromParts(input: {
  name: string;
  jobTitle: string;
  company: string;
  email: string;
  country: string;
  address: string;
  buyerType: string;
  productsOfInterest?: string;
  notes?: string;
  phone: string;
}): IdentityFields {
  const email = input.email.trim().toLowerCase();
  const buyerType = canonicalBuyerType(input.buyerType);
  const missing: string[] = [];
  if (!input.name.trim()) missing.push("your name");
  if (!input.jobTitle.trim()) missing.push("job title");
  if (!input.company.trim()) missing.push("company name");
  if (!email.includes("@")) missing.push("email");
  if (!input.country.trim()) missing.push("country");
  if (!input.address.trim()) missing.push("city or address");
  if (!buyerType) missing.push("buyer type");
  return {
    name: input.name.trim(),
    jobTitle: input.jobTitle.trim(),
    company: input.company.trim(),
    email,
    country: input.country.trim(),
    address: input.address.trim(),
    buyerType,
    productsOfInterest: (input.productsOfInterest || "").trim(),
    notes: (input.notes || "").trim(),
    phone: input.phone,
    missing,
  };
}

export function mergeIdentity(row: TradeBuyer, next: IdentityFields): TradeBuyerDraft {
  return {
    companyName: next.company || row.companyName,
    contactName: next.name || row.contactName,
    jobTitle: next.jobTitle || row.jobTitle,
    email: next.email || row.email,
    phone: row.whatsappE164 || next.phone,
    country: next.country || row.country,
    address: next.address || row.address,
    buyerType: next.buyerType || row.buyerType,
    productsOfInterest: next.productsOfInterest || row.productsOfInterest,
    notes: next.notes || row.notes,
    wechatId: row.wechatId,
    partnerName: row.partnerName,
    partnerEmail: row.partnerEmail,
  };
}

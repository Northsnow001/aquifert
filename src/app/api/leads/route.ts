import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, notifyAdmins } from "@/lib/supabase/admin";

type LeadInput = {
  intent: string;
  source: string;
  products: string[];
  regions: string[];
  goals: string[];
  fullName: string;
  email: string;
  company: string;
  country: string;
  role?: string;
  annualVolume?: string;
  timeline?: string;
  phone?: string;
  termsAccepted: boolean;
  marketingOptIn: boolean;
  consentPolicyVersion: string;
  consentAt: string;
  cookieConsent: { analytics: boolean; marketing: boolean; version: string };
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPage?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max = 255) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max = 255) => str(v, max) || undefined;
const list = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 255)).slice(0, 50) : [];

/** Hot = buying role + meaningful volume + near-term timeline. */
function scoreLead(role?: string, volume?: string, timeline?: string) {
  let pts = 0;
  if (role && ["Trader", "Buyer / Procurement", "Producer", "Distributor"].includes(role)) pts += 2;
  else if (role === "Executive") pts += 1;
  if (volume && !["Under 1,000 MT", "N/A"].includes(volume)) pts += 2;
  else if (volume === "Under 1,000 MT") pts += 1;
  if (timeline === "Immediately") pts += 2;
  else if (timeline === "Within 1 month") pts += 1;
  if (pts >= 5) return "HOT" as const;
  if (pts >= 2) return "WARM" as const;
  return "COLD" as const;
}

function parse(body: Record<string, unknown>): LeadInput | null {
  const cc = (body.cookieConsent ?? {}) as Record<string, unknown>;
  const input: LeadInput = {
    intent: str(body.intent, 64),
    source: str(body.source, 64),
    products: list(body.products),
    regions: list(body.regions),
    goals: list(body.goals),
    fullName: str(body.fullName),
    email: str(body.email, 320),
    company: str(body.company),
    country: str(body.country, 128),
    role: opt(body.role, 64),
    annualVolume: opt(body.annualVolume, 64),
    timeline: opt(body.timeline, 64),
    phone: opt(body.phone, 64),
    termsAccepted: body.termsAccepted === true,
    marketingOptIn: body.marketingOptIn === true,
    consentPolicyVersion: str(body.consentPolicyVersion, 32),
    consentAt: str(body.consentAt, 64),
    cookieConsent: {
      analytics: cc.analytics === true,
      marketing: cc.marketing === true,
      version: str(cc.version, 32),
    },
    utmSource: opt(body.utmSource),
    utmMedium: opt(body.utmMedium),
    utmCampaign: opt(body.utmCampaign),
    referrer: opt(body.referrer, 2000),
    landingPage: opt(body.landingPage, 2000),
  };
  const ok =
    input.intent &&
    input.source &&
    input.products.length &&
    input.regions.length &&
    input.goals.length &&
    input.fullName.length >= 2 &&
    EMAIL.test(input.email) &&
    input.company &&
    input.country &&
    input.termsAccepted &&
    input.consentPolicyVersion &&
    !Number.isNaN(Date.parse(input.consentAt));
  return ok ? input : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const input = body && parse(body);
  if (!input) return NextResponse.json({ error: "Invalid lead" }, { status: 400 });

  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Lead capture is not configured" }, { status: 503 });

  const score = scoreLead(input.role, input.annualVolume, input.timeline);
  const consentIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

  const { data, error } = await db
    .from("leads")
    .insert({ ...input, consentAt: new Date(input.consentAt).toISOString(), consentIp, score })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Could not save lead" }, { status: 500 });

  if (score === "HOT") {
    await notifyAdmins(
      db,
      "LEAD_HOT",
      "Hot lead captured",
      `${input.fullName} (${input.company}, ${input.country}), ${input.role ?? "role n/a"}, ${input.annualVolume ?? "volume n/a"}, timeline: ${input.timeline ?? "n/a"}. Email: ${input.email}`,
    );
  }
  return NextResponse.json({ id: Number(data.id), score });
}

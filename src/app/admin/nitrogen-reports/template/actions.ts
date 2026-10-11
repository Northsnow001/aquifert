"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { PACKING, PRODUCTS, SHIPMENT_TYPES, type NitrogenAnswers, type NitrogenBrief } from "@/lib/nitrogen/engine";
import { contentProblem, designProblem, normalizeContent, normalizeDesign, SAMPLE_PARTNER, sampleAnswers, type BriefContent, type BriefDesign } from "@/lib/nitrogen/template";
import { saveBriefContent, saveBriefDesign } from "@/lib/nitrogen/template-store";
import { writeBrief, type BriefWriter } from "@/lib/nitrogen/writer";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

type Failure = { ok: false; message: string };
type Saved = { at: string; by: string };

const PATH = "/admin/nitrogen-reports/template";

export async function saveReportContent(value: BriefContent): Promise<({ ok: true; content: BriefContent } & Saved) | Failure> {
  const user = await requireAdmin();
  const problem = contentProblem(normalizeContent(value));
  if (problem) return { ok: false, message: problem };
  try {
    const saved = await saveBriefContent(value, user.name || user.email);
    revalidatePath(PATH);
    return { ok: true, ...saved };
  } catch (error) {
    console.error("[nitrogen-template] Could not save the report content.", error);
    return { ok: false, message: "The changes could not be saved just now. Try again in a moment." };
  }
}

export async function saveReportDesign(value: BriefDesign): Promise<({ ok: true; design: BriefDesign } & Saved) | Failure> {
  const user = await requireAdmin();
  const problem = designProblem(normalizeDesign(value));
  if (problem) return { ok: false, message: problem };
  try {
    const saved = await saveBriefDesign(value, user.name || user.email);
    revalidatePath(PATH);
    revalidatePath("/hub/nitrogen-report", "layout");
    return { ok: true, ...saved };
  } catch (error) {
    console.error("[nitrogen-template] Could not save the report design.", error);
    return { ok: false, message: "The changes could not be saved just now. Try again in a moment." };
  }
}

const pick = (value: unknown, options: string[], fallback: string) => (options.includes(String(value)) ? String(value) : fallback);

/** Writes a brief for the sample buyer with the unsaved content, so admins can judge a prompt before members get it. */
export async function trySampleBrief(
  value: BriefContent,
  input: Partial<NitrogenAnswers>,
): Promise<{ ok: true; brief: NitrogenBrief; writer: BriefWriter; fallback?: string; ms: number } | Failure> {
  await requireAdmin();
  const content = normalizeContent(value);
  const problem = contentProblem(content);
  if (problem) return { ok: false, message: problem };
  const base = sampleAnswers();
  const products = Array.isArray(input.products) ? PRODUCTS.filter((item) => input.products!.includes(item)) : [];
  const answers: NitrogenAnswers = {
    ...base,
    destinationCountry: String(input.destinationCountry ?? "").trim().slice(0, 80) || base.destinationCountry,
    destinationPort: String(input.destinationPort ?? "").trim().slice(0, 80),
    products: products.length ? products : base.products,
    annualTonnage: String(input.annualTonnage ?? "").trim().slice(0, 20) || base.annualTonnage,
    cargoSize: String(input.cargoSize ?? "").trim().slice(0, 40),
    shipmentType: pick(input.shipmentType, SHIPMENT_TYPES, base.shipmentType),
    packing: pick(input.packing, PACKING, base.packing),
  };
  const written = await writeBrief(answers, { refNo: "NR-SAMPLE", partner: SAMPLE_PARTNER }, content);
  return { ok: true, brief: written.brief, writer: written.writer, fallback: written.fallback, ms: written.ms };
}

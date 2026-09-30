"use server";

import { revalidatePath } from "next/cache";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { zeroSections, zeroVars } from "@/lib/desk-settings/forms";
import { notifySubmission } from "@/lib/desk-settings/notify";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { ZERO_PRODUCTS } from "@/lib/desk-settings/types";
import { getSession } from "@/lib/session";
import { addZeroRegistration, listZeroRegistrations } from "@/lib/zero-interest";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;

export async function registerZeroInterest(input: { name: string; email: string; company: string; annualVolume: string; product: string; notes: string; website?: string }) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Your session has ended. Sign in again to register." };
  if (!getDeskSettings().zero.showOnHub) return { ok: false as const, message: "Aquifert Zero registrations are closed right now." };
  if (input.website?.trim()) return { ok: true as const, at: new Date().toISOString() };

  const text = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const company = text(input.company);
  const annualVolume = text(input.annualVolume, 20);
  const product = text(input.product);
  const notes = text(input.notes, 2000);
  if (!name || !company) return { ok: false as const, message: "Add your name and company." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false as const, message: "Enter a valid email address." };
  if (!(Number(annualVolume) > 0)) return { ok: false as const, message: "Enter your estimated annual volume in metric tonnes." };
  if (!(ZERO_PRODUCTS as readonly string[]).includes(product)) return { ok: false as const, message: "Choose the product you are most interested in." };

  const since = Date.now() - WINDOW_MS;
  const recent = listZeroRegistrations().filter((row) => row.userId === user.id && Date.parse(row.at) > since).length;
  if (recent >= MAX_IN_WINDOW) return { ok: false as const, message: "You have registered several times in the last few minutes. Wait a little, then try again." };

  const row = addZeroRegistration({ userId: user.id, name, email, company, annualVolume, product, notes });
  const submission = { name, email, company, annualVolume, product, notes, submittedAt: row.at };
  await notifySubmission("zero", { vars: zeroVars(submission), sections: zeroSections(submission), applicantEmail: email, adminPath: "/admin/zero" });
  revalidatePath("/admin", "layout");
  return { ok: true as const, at: row.at };
}

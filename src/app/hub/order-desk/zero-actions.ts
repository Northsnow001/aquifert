"use server";

import { revalidatePath } from "next/cache";
import { isCalendlyInvitee } from "@/lib/calendly";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { zeroSections, zeroVars } from "@/lib/desk-settings/forms";
import { notifySubmission } from "@/lib/desk-settings/notify";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { ZERO_PRODUCTS } from "@/lib/desk-settings/types";
import { getSession } from "@/lib/session";
import { addZeroRegistration, findZeroRegistration, listZeroRegistrations, updateZeroRegistration } from "@/lib/zero-interest";
import { intentOf, isZeroIntent, isZeroProgramme, programmeName, ZERO_INTENT_LABEL, ZERO_NEXT_STEP } from "@/lib/zero-types";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;

export async function registerZeroInterest(input: {
  name: string;
  email: string;
  company: string;
  programme: string;
  intent: string;
  annualVolume: string;
  product: string;
  notes: string;
  website?: string;
}) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Your session has ended. Sign in again to register." };
  if (!(await getDeskSettings()).zero.showOnHub) return { ok: false as const, message: "Aquifert Zero registrations are closed right now." };
  if (input.website?.trim()) return { ok: true as const, at: new Date().toISOString() };

  const text = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const company = text(input.company);
  const annualVolume = text(input.annualVolume, 20);
  const product = text(input.product);
  const notes = text(input.notes, 2000);
  const programme = input.programme;
  const intent = input.intent;
  if (!isZeroIntent(intent)) return { ok: false as const, message: "Choose to join the waitlist or book a call." };
  if (!isZeroProgramme(programme)) return { ok: false as const, message: "Choose the programme you are interested in." };
  if (!name || !company) return { ok: false as const, message: "Add your name and company." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false as const, message: "Enter a valid email address." };
  if (!(Number(annualVolume) > 0)) return { ok: false as const, message: "Enter your estimated annual volume in metric tonnes." };
  if (!(ZERO_PRODUCTS as readonly string[]).includes(product)) return { ok: false as const, message: "Choose the product you are most interested in." };

  const since = Date.now() - WINDOW_MS;
  const recent = (await listZeroRegistrations()).filter((row) => row.userId === user.id && Date.parse(row.at) > since).length;
  if (recent >= MAX_IN_WINDOW) return { ok: false as const, message: "You have registered several times in the last few minutes. Wait a little, then try again." };

  const row = await addZeroRegistration({ userId: user.id, name, email, company, programme, intent, annualVolume, product, notes });
  const submission = {
    name,
    email,
    company,
    programme: programmeName(programme),
    request: ZERO_INTENT_LABEL[intent],
    nextStep: ZERO_NEXT_STEP[intent],
    phone: "",
    callDate: "",
    callWindow: "",
    timezone: "",
    annualVolume,
    product,
    notes,
    submittedAt: row.at,
  };
  await notifySubmission("zero", { vars: zeroVars(submission), sections: zeroSections(submission), applicantEmail: email, adminPath: "/admin/zero" });
  revalidatePath("/admin", "layout");
  return { ok: true as const, at: row.at };
}

/** Called when the Calendly embed reports a booking, so the desk sees the call as booked. */
export async function markZeroCallBooked(inviteeUri: string) {
  const user = await getSession();
  if (!user) return { ok: false as const };
  const row = await findZeroRegistration(user);
  if (!row || intentOf(row) !== "call") return { ok: false as const };
  await updateZeroRegistration(row.id, {
    status: "scheduled",
    callBookedAt: new Date().toISOString(),
    calendlyInvitee: isCalendlyInvitee(inviteeUri) ? inviteeUri : row.calendlyInvitee,
  });
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

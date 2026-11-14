"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { EMAIL_PATTERN, cleanEntries } from "@/lib/desk-settings/email-rules";
import { formEmail, sampleFor } from "@/lib/desk-settings/forms";
import { siteOrigin } from "@/lib/desk-settings/notify";
import { getDeskSettings, updateDeskSettings } from "@/lib/desk-settings/store";
import type { DeskSettings, EmailTemplate, FormEmails, MemberRules, TemplateKind } from "@/lib/desk-settings/types";
import { deskAlertEmail } from "@/lib/email/templates";
import { deskInbox } from "@/lib/email/member-emails";
import { clearOutbox, resendDelivery, sendEmail } from "@/lib/mailer";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/hub", "layout");
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const clip = (value: unknown, max: number) => String(value ?? "").slice(0, max);

function cleanTemplate(raw: EmailTemplate | undefined, label: string): EmailTemplate | string {
  const subject = clip(raw?.subject, 200).replace(/\s+/g, " ").trim();
  const body = clip(raw?.body, 8000).replace(/\r\n/g, "\n").trim();
  if (!subject) return `Add a subject for the ${label}.`;
  if (!body) return `Add a message for the ${label}.`;
  return { subject, body };
}

export async function saveFormEmails(kind: TemplateKind, input: FormEmails & { showOnHub?: boolean }): Promise<Result<{ savedAt: string }>> {
  await requireAdmin();
  const recipient = clip(input.recipient, 200).trim().toLowerCase();
  if (input.sendAdmin && !EMAIL_PATTERN.test(recipient)) return { ok: false, message: "Enter the desk address that receives new submissions." };
  const success = clip(input.success, 300).trim();
  if (!success) return { ok: false, message: "Add the message members see after they submit." };
  const applicant = cleanTemplate(input.applicant, "member confirmation");
  if (typeof applicant === "string") return { ok: false, message: applicant };
  const admin = cleanTemplate(input.admin, "desk alert");
  if (typeof admin === "string") return { ok: false, message: admin };
  const form: FormEmails = { recipient, success, sendApplicant: Boolean(input.sendApplicant), sendAdmin: Boolean(input.sendAdmin), applicant, admin };
  const saved = await updateDeskSettings((draft) => {
    if (kind === "order") draft.orderDesk = form;
    else draft.zero = { ...form, showOnHub: Boolean(input.showOnHub) };
  });
  refresh();
  return { ok: true, savedAt: saved.updatedAt! };
}

export async function saveMemberRules(input: { blocked: string; allowed: string }): Promise<Result<{ rules: MemberRules; savedAt: string }>> {
  await requireAdmin();
  const rules: MemberRules = {
    blocked: cleanEntries(clip(input.blocked, 20_000).split(/[\s,;]+/)),
    allowed: cleanEntries(clip(input.allowed, 20_000).split(/[\s,;]+/)),
  };
  const overlap = rules.blocked.filter((entry) => rules.allowed.includes(entry));
  if (overlap.length) return { ok: false, message: `${overlap.join(", ")} is on both lists. Keep it on one.` };
  const saved = await updateDeskSettings((draft) => {
    draft.members = rules;
  });
  refresh();
  return { ok: true, rules, savedAt: saved.updatedAt! };
}

export async function saveDelivery(input: DeskSettings["delivery"]): Promise<Result<{ savedAt: string }>> {
  await requireAdmin();
  const replyTo = clip(input.replyTo, 200).trim().toLowerCase();
  if (replyTo && !EMAIL_PATTERN.test(replyTo)) return { ok: false, message: "Enter a full reply-to address, or leave it empty." };
  const saved = await updateDeskSettings((draft) => {
    draft.delivery = { fromName: clip(input.fromName, 80).trim(), replyTo };
  });
  refresh();
  return { ok: true, savedAt: saved.updatedAt! };
}

/** Sends the draft template, filled with sample data, to the signed-in admin. */
export async function sendTestEmail(kind: TemplateKind, audience: "applicant" | "admin", template: EmailTemplate): Promise<Result<{ status: string; to: string; error?: string }>> {
  const user = await requireAdmin();
  const cleaned = cleanTemplate(template, audience === "applicant" ? "member confirmation" : "desk alert");
  if (typeof cleaned === "string") return { ok: false, message: cleaned };
  const { delivery } = await getDeskSettings();
  const email = formEmail({
    kind,
    audience,
    template: cleaned,
    data: sampleFor(kind).data,
    deskEmail: delivery.replyTo,
    adminHref: `${await siteOrigin()}${kind === "order" ? "/admin/enquiries" : "/admin/zero"}`,
  });
  const entry = await sendEmail({ kind: "test", to: user.email, ...email, subject: `[Test] ${email.subject}` }, delivery);
  refresh();
  return { ok: true, status: entry.status, to: user.email, error: entry.error };
}

const DESK_TEST_COPY = "kaytoba49@gmail.com";

export type DeskTestOutcome = "delivered" | "accepted" | "held" | "failed";

export type DeskTestResult = { to: string; outcome: DeskTestOutcome; detail: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resend can confirm the inbox received it. Wait a short while for that event. */
async function resendOutcome(id: string): Promise<{ outcome: DeskTestOutcome; detail: string } | null> {
  let latest: string | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    latest = await resendDelivery(id);
    if (latest === "delivered") return { outcome: "delivered", detail: "Resend confirmed this message was delivered." };
    if (latest === "bounced" || latest === "complained" || latest === "failed") return { outcome: "failed", detail: `Resend reports ${latest}.` };
    if (attempt < 5) await sleep(2_000);
  }
  return latest
    ? { outcome: "accepted", detail: `Resend accepted it (${latest}). Delivery to the inbox is not confirmed yet.` }
    : { outcome: "accepted", detail: "Resend accepted it. Delivery to the inbox is not confirmed yet." };
}

/** Sends the same desk alert used for sign-ups and other events, to the desk inbox and a second check address. */
export async function sendDeskEventTest(): Promise<Result<{ results: DeskTestResult[] }>> {
  await requireAdmin();
  const { delivery } = await getDeskSettings();
  const desk = deskInbox(delivery.replyTo);
  const targets = [...new Set([desk, DESK_TEST_COPY].map((address) => address.toLowerCase()))];
  const sentAt = new Date().toISOString();
  const email = deskAlertEmail({
    subject: "Aquifert desk test",
    heading: "Desk test",
    preheader: "This is a test that an Aquifert event reached the desk inbox.",
    rows: [
      ["Event", "Test from Admin, Settings, Email delivery"],
      ["Sent at", sentAt],
      ["Desk inbox", desk],
      ["Check copy", DESK_TEST_COPY],
    ],
  });
  const results: DeskTestResult[] = [];
  for (const to of targets) {
    const entry = await sendEmail({ kind: "test", to, ...email, subject: `[Test] ${email.subject}` }, delivery);
    if (entry.status === "held") {
      results.push({ to, outcome: "held", detail: "Nothing left the server. Email delivery is not connected." });
    } else if (entry.status === "failed") {
      results.push({ to, outcome: "failed", detail: entry.error ?? "The provider refused it." });
    } else if (entry.providerId) {
      results.push({ to, ...(await resendOutcome(entry.providerId)) });
    } else {
      results.push({ to, outcome: "accepted", detail: "The mail server accepted it. That confirms sending, not that it is in the inbox." });
    }
  }
  refresh();
  return { ok: true, results };
}

export async function emptyOutbox(): Promise<Result> {
  await requireAdmin();
  await clearOutbox();
  refresh();
  return { ok: true };
}

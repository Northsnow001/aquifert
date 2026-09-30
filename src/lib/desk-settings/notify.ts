import "server-only";

import { headers } from "next/headers";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { renderEmail, type DetailSection } from "@/lib/desk-settings/render";
import { getDeskSettings } from "@/lib/desk-settings/store";
import type { TemplateKind } from "@/lib/desk-settings/types";
import { sendEmail, type OutboxEntry } from "@/lib/mailer";

export async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Sends the member confirmation and the desk alert for a submission, as the Settings page configures them. */
export async function notifySubmission(kind: TemplateKind, input: { vars: Record<string, string>; sections: DetailSection[]; applicantEmail: string; adminPath: string }) {
  const settings = await getDeskSettings();
  const form = kind === "order" ? settings.orderDesk : settings.zero;
  const sent: OutboxEntry[] = [];
  if (form.sendApplicant && EMAIL_PATTERN.test(input.applicantEmail)) {
    const email = renderEmail({ template: form.applicant, vars: input.vars, sections: input.sections });
    sent.push(await sendEmail({ kind: `${kind}-applicant`, to: input.applicantEmail, ...email }, settings.delivery));
  }
  if (form.sendAdmin && EMAIL_PATTERN.test(form.recipient.trim())) {
    const origin = await siteOrigin();
    const email = renderEmail({ template: form.admin, vars: input.vars, sections: input.sections, action: { label: "Open in admin", href: `${origin}${input.adminPath}` } });
    sent.push(await sendEmail({ kind: `${kind}-admin`, to: form.recipient.trim(), ...email }, settings.delivery));
  }
  return { settings, sent };
}

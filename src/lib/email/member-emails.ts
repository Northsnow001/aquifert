import "server-only";

import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { DESK_EMAIL } from "@/lib/email/brand";
import { analyticsWaitlistEmail, contactReceiptEmail, deskAlertEmail, splitTopic } from "@/lib/email/templates";
import { sendEmail, type MailKind } from "@/lib/mailer";

/** The inbox that should receive desk alerts. Falls back to noreply@aquifert.com. */
export function deskInbox(replyTo: string | undefined) {
  const value = replyTo?.trim() ?? "";
  return EMAIL_PATTERN.test(value) ? value : DESK_EMAIL;
}

/** Tells the desk inbox that something happened. Never throws. */
export async function sendDeskAlert(input: { kind: MailKind; subject: string; heading: string; preheader: string; rows: Array<[string, string]> }) {
  try {
    const { delivery } = await getDeskSettings();
    const email = deskAlertEmail(input);
    return await sendEmail({ kind: input.kind, to: deskInbox(delivery.replyTo), ...email }, delivery);
  } catch (error) {
    console.error("[member-emails] desk alert failed", error);
    return null;
  }
}

/** Confirms an AQ Analytics waitlist sign-up. Never throws, so a mail problem cannot undo the request. */
export async function sendAnalyticsWaitlistEmail(input: { name: string; email: string }) {
  if (!EMAIL_PATTERN.test(input.email)) return null;
  try {
    const { delivery } = await getDeskSettings();
    return await sendEmail({ kind: "analytics-applicant", to: input.email, ...analyticsWaitlistEmail({ name: input.name, deskEmail: delivery.replyTo }) }, delivery);
  } catch (error) {
    console.error("[member-emails] analytics waitlist email failed", error);
    return null;
  }
}

/** Sends the sender of a contact message a receipt quoting its reference. Never throws. */
export async function sendContactReceipt(input: { name: string; email: string; message: string; reference: string; topic?: string }) {
  if (!EMAIL_PATTERN.test(input.email)) return null;
  try {
    const { delivery } = await getDeskSettings();
    const parsed = splitTopic(input.message, input.topic);
    const email = contactReceiptEmail({ name: input.name, reference: input.reference, topic: parsed.topic, message: parsed.body, deskEmail: delivery.replyTo });
    return await sendEmail({ kind: "contact-applicant", to: input.email, ...email }, delivery);
  } catch (error) {
    console.error("[member-emails] contact receipt failed", error);
    return null;
  }
}

import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { clearRecords, getRecord, listRecords, putRecords } from "@/lib/data/records";
import { OUTBOX } from "@/lib/data/tables";
import type { DeliverySettings } from "@/lib/desk-settings/types";

export type MailKind = "order-applicant" | "order-admin" | "zero-applicant" | "zero-admin" | "test";

type Message = { to: string; subject: string; html: string; text: string };

export type OutboxEntry = {
  id: string;
  at: string;
  kind: MailKind;
  to: string;
  subject: string;
  /** Sent by the provider, refused by it, or kept here because no provider is connected. */
  status: "sent" | "failed" | "held";
  error?: string;
  html: string;
};

/** SMTP wins when SMTP_HOST is set; otherwise Resend; otherwise emails stay in the outbox. */
export function deliveryStatus() {
  const from = process.env.EMAIL_FROM?.trim() || null;
  const provider = !from ? null : process.env.SMTP_HOST?.trim() ? ("SMTP" as const) : process.env.RESEND_API_KEY?.trim() ? ("Resend" as const) : null;
  return { connected: provider !== null, provider, from };
}

const sender = (delivery: DeliverySettings, from: string) => (delivery.fromName.trim() ? `${delivery.fromName.trim()} <${from}>` : from);

let smtp: Transporter | null = null;

function smtpTransport() {
  if (smtp) return smtp;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim();
  smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE.trim().toLowerCase() === "true" : port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return smtp;
}

async function sendWithSmtp(message: Message, delivery: DeliverySettings, from: string) {
  await smtpTransport().sendMail({
    from: sender(delivery, from),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(delivery.replyTo.trim() ? { replyTo: delivery.replyTo.trim() } : {}),
  });
}

export const listOutbox = () => listRecords(OUTBOX) as Promise<OutboxEntry[]>;

export const getOutboxEntry = (id: string) => getRecord(OUTBOX, id) as Promise<OutboxEntry | null>;

export const clearOutbox = () => clearRecords(OUTBOX);

async function sendWithResend(message: Message, delivery: DeliverySettings, from: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender(delivery, from),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(delivery.replyTo.trim() ? { reply_to: delivery.replyTo.trim() } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}

/** Sends one email and records it in the outbox. Never throws, so a mail failure cannot lose a submission. */
export async function sendEmail(message: { kind: MailKind; to: string; subject: string; html: string; text: string }, delivery: DeliverySettings): Promise<OutboxEntry> {
  const status = deliveryStatus();
  const entry: OutboxEntry = {
    id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    kind: message.kind,
    to: message.to,
    subject: message.subject,
    status: "held",
    html: message.html,
  };
  if (status.provider && status.from) {
    try {
      await (status.provider === "SMTP" ? sendWithSmtp : sendWithResend)(message, delivery, status.from);
      entry.status = "sent";
    } catch (error) {
      entry.status = "failed";
      entry.error = error instanceof Error ? error.message : "Delivery failed.";
    }
  }
  try {
    await putRecords(OUTBOX, [entry]);
  } catch (error) {
    console.error("[mailer] could not record the email", error);
  }
  return entry;
}

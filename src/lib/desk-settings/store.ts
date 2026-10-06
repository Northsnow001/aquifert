import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { DEFAULT_DESK_SETTINGS, RETIRED_ADDRESSES, RETIRED_TEMPLATES, type DeskSettings, type EmailTemplate, type FormEmails } from "@/lib/desk-settings/types";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

const sameText = (a: string, b: string) => a.replace(/\r\n/g, "\n").trim() === b.replace(/\r\n/g, "\n").trim();

function address(raw: unknown, fallback: string) {
  const saved = text(raw, fallback);
  return RETIRED_ADDRESSES.includes(saved.trim().toLowerCase()) ? fallback : saved;
}

function template(raw: unknown, fallback: EmailTemplate, retired: EmailTemplate[]): EmailTemplate {
  const value = isRecord(raw) ? raw : {};
  const saved = { subject: text(value.subject, fallback.subject), body: text(value.body, fallback.body) };
  return retired.some((old) => sameText(old.subject, saved.subject) && sameText(old.body, saved.body)) ? { ...fallback } : saved;
}

function form<T extends FormEmails>(raw: unknown, fallback: T, retired: (typeof RETIRED_TEMPLATES)["order"]): T {
  const value = isRecord(raw) ? raw : {};
  return {
    ...fallback,
    recipient: address(value.recipient, fallback.recipient),
    success: text(value.success, fallback.success),
    sendApplicant: flag(value.sendApplicant, fallback.sendApplicant),
    sendAdmin: flag(value.sendAdmin, fallback.sendAdmin),
    applicant: template(value.applicant, fallback.applicant, retired.applicant),
    admin: template(value.admin, fallback.admin, retired.admin),
  };
}

function normalize(raw: unknown): DeskSettings {
  const value = isRecord(raw) ? raw : {};
  const zero = isRecord(value.zero) ? value.zero : {};
  const members = isRecord(value.members) ? value.members : {};
  const delivery = isRecord(value.delivery) ? value.delivery : {};
  const base = DEFAULT_DESK_SETTINGS;
  return {
    orderDesk: form(value.orderDesk, base.orderDesk, RETIRED_TEMPLATES.order),
    zero: { ...form(zero, base.zero, RETIRED_TEMPLATES.zero), showOnHub: flag(zero.showOnHub, base.zero.showOnHub) },
    members: { requireWorkEmail: flag(members.requireWorkEmail, base.members.requireWorkEmail), blocked: list(members.blocked), allowed: list(members.allowed) },
    delivery: { fromName: text(delivery.fromName, base.delivery.fromName), replyTo: address(delivery.replyTo, base.delivery.replyTo) },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

const cachedSettings = cache(async () => normalize(await readDocument("desk-settings")));

/** Read once per request; each caller gets its own copy. */
export async function getDeskSettings(): Promise<DeskSettings> {
  return structuredClone(await cachedSettings());
}

export function updateDeskSettings(mutate: (settings: DeskSettings) => void): Promise<DeskSettings> {
  return updateDocument("desk-settings", (raw) => {
    const settings = normalize(raw);
    mutate(settings);
    return { ...settings, updatedAt: new Date().toISOString() };
  });
}

import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { DEFAULT_DESK_SETTINGS, type DeskSettings, type EmailTemplate, type FormEmails } from "@/lib/desk-settings/types";

const filePath = path.join(process.cwd(), "data", "desk-settings.json");

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

function template(raw: unknown, fallback: EmailTemplate): EmailTemplate {
  const value = isRecord(raw) ? raw : {};
  return { subject: text(value.subject, fallback.subject), body: text(value.body, fallback.body) };
}

function form<T extends FormEmails>(raw: unknown, fallback: T): T {
  const value = isRecord(raw) ? raw : {};
  return {
    ...fallback,
    recipient: text(value.recipient, fallback.recipient),
    success: text(value.success, fallback.success),
    sendApplicant: flag(value.sendApplicant, fallback.sendApplicant),
    sendAdmin: flag(value.sendAdmin, fallback.sendAdmin),
    applicant: template(value.applicant, fallback.applicant),
    admin: template(value.admin, fallback.admin),
  };
}

export function getDeskSettings(): DeskSettings {
  let raw: unknown = null;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    raw = null;
  }
  const value = isRecord(raw) ? raw : {};
  const zero = isRecord(value.zero) ? value.zero : {};
  const members = isRecord(value.members) ? value.members : {};
  const delivery = isRecord(value.delivery) ? value.delivery : {};
  const base = DEFAULT_DESK_SETTINGS;
  return {
    orderDesk: form(value.orderDesk, base.orderDesk),
    zero: { ...form(zero, base.zero), showOnHub: flag(zero.showOnHub, base.zero.showOnHub) },
    members: { requireWorkEmail: flag(members.requireWorkEmail, base.members.requireWorkEmail), blocked: list(members.blocked), allowed: list(members.allowed) },
    delivery: { fromName: text(delivery.fromName, base.delivery.fromName), replyTo: text(delivery.replyTo, base.delivery.replyTo) },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

export function updateDeskSettings(mutate: (settings: DeskSettings) => void): DeskSettings {
  const settings = getDeskSettings();
  mutate(settings);
  const next = { ...settings, updatedAt: new Date().toISOString() };
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(`${filePath}.tmp`, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(`${filePath}.tmp`, filePath);
  return next;
}

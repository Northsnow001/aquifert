import "server-only";

import { countRecords, getRecord, listRecords, putRecords, removeRecords } from "@/lib/data/records";
import { CALL_REGISTRATIONS, MEMBER_ALERTS, MEMBER_PREFS, MEMBERSHIP_REQUESTS, NITROGEN_REPORTS } from "@/lib/data/tables";
import type { CallRegistration, MemberAlert, MemberPrefs, MembershipRequest, NitrogenReport } from "@/lib/aq-modules/member-types";
import type { SessionUser } from "@/lib/session-shared";

type Owner = Pick<SessionUser, "id" | "email">;

const owner = (user: Owner) => ({ userId: user.id, email: user.email.trim().toLowerCase() });
const newRowId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

/* ---------------- Nitrogen reports ---------------- */

export const listNitrogenReports = (user: Owner, limit = 100): Promise<NitrogenReport[]> => listRecords(NITROGEN_REPORTS, { ...owner(user), limit });

export const nitrogenReportsThisMonth = (user: Owner) => countRecords(NITROGEN_REPORTS, { ...owner(user), since: monthStart() });

export async function getNitrogenReport(user: Owner, id: string): Promise<NitrogenReport | null> {
  const row = await getRecord(NITROGEN_REPORTS, id);
  return row && row.userId === user.id ? row : null;
}

export async function saveNitrogenReport(row: NitrogenReport, keep: number) {
  await putRecords(NITROGEN_REPORTS, [row]);
  if (keep > 0) {
    const mine = await listNitrogenReports({ id: row.userId, email: row.email }, keep + 50);
    await removeRecords(NITROGEN_REPORTS, mine.slice(keep).map((item) => item.id));
  }
}

export async function deleteNitrogenReport(user: Owner, id: string) {
  const row = await getNitrogenReport(user, id);
  return row ? (await removeRecords(NITROGEN_REPORTS, [id])) > 0 : false;
}

export const listAllNitrogenReports = (limit = 500) => listRecords(NITROGEN_REPORTS, { limit });

/* ---------------- Preferences ---------------- */

export const DEFAULT_PREFS: Omit<MemberPrefs, "id" | "at" | "userId" | "email"> = {
  telexProducts: [],
  persona: "buyer",
  signalWindow: 30,
  briefProducts: [],
  briefByEmail: false,
};

export async function getPrefs(user: Owner): Promise<MemberPrefs> {
  const row = await getRecord(MEMBER_PREFS, user.id);
  return { ...DEFAULT_PREFS, ...(row ?? {}), id: user.id, userId: user.id, email: user.email, at: row?.at ?? new Date(0).toISOString() };
}

export async function savePrefs(user: Owner, patch: Partial<Omit<MemberPrefs, "id" | "at" | "userId" | "email">>) {
  const current = await getPrefs(user);
  const next: MemberPrefs = { ...current, ...patch, at: new Date().toISOString() };
  await putRecords(MEMBER_PREFS, [next]);
  return next;
}

/* ---------------- Alerts ---------------- */

export const listAlerts = (user: Owner): Promise<MemberAlert[]> => listRecords(MEMBER_ALERTS, owner(user));

export async function addAlert(user: Owner, input: Pick<MemberAlert, "seriesId" | "direction" | "threshold" | "note">) {
  const row: MemberAlert = { ...input, id: newRowId("alert"), at: new Date().toISOString(), userId: user.id, email: user.email, active: true, lastTriggered: null };
  await putRecords(MEMBER_ALERTS, [row]);
  return row;
}

export async function updateAlert(user: Owner, id: string, patch: Partial<Pick<MemberAlert, "active" | "threshold" | "direction" | "note" | "lastTriggered">>) {
  const row = await getRecord(MEMBER_ALERTS, id);
  if (!row || row.userId !== user.id) return null;
  const next = { ...row, ...patch };
  await putRecords(MEMBER_ALERTS, [next]);
  return next;
}

export async function deleteAlert(user: Owner, id: string) {
  const row = await getRecord(MEMBER_ALERTS, id);
  return row && row.userId === user.id ? (await removeRecords(MEMBER_ALERTS, [id])) > 0 : false;
}

/* ---------------- Community call registrations ---------------- */

export const myRegistrations = (user: Owner): Promise<CallRegistration[]> => listRecords(CALL_REGISTRATIONS, owner(user));

export const listRegistrations = (): Promise<CallRegistration[]> => listRecords(CALL_REGISTRATIONS);

/** Registers once per call; registering again after cancelling reactivates the same row. */
export async function registerForCall(user: Owner, input: Pick<CallRegistration, "callId" | "name" | "company" | "country" | "question" | "reminders">) {
  const existing = (await myRegistrations(user)).find((row) => row.callId === input.callId);
  const now = new Date().toISOString();
  const row: CallRegistration = existing
    ? { ...existing, ...input, status: "registered", updatedAt: now }
    : { ...input, id: newRowId("reg"), at: now, userId: user.id, email: user.email.trim().toLowerCase(), status: "registered", updatedAt: null };
  await putRecords(CALL_REGISTRATIONS, [row]);
  return { row, already: existing?.status === "registered" };
}

export async function cancelRegistration(user: Owner, callId: string) {
  const existing = (await myRegistrations(user)).find((row) => row.callId === callId && row.status === "registered");
  if (!existing) return false;
  await putRecords(CALL_REGISTRATIONS, [{ ...existing, status: "cancelled", updatedAt: new Date().toISOString() }]);
  return true;
}

/* ---------------- Membership requests ---------------- */

export const listMembershipRequests = (): Promise<MembershipRequest[]> => listRecords(MEMBERSHIP_REQUESTS);

export const myMembershipRequests = (user: Owner): Promise<MembershipRequest[]> => listRecords(MEMBERSHIP_REQUESTS, owner(user));

export async function addMembershipRequest(input: Omit<MembershipRequest, "id" | "at" | "status" | "adminNote" | "updatedAt">) {
  const row: MembershipRequest = { ...input, email: input.email.trim().toLowerCase(), id: newRowId("mreq"), at: new Date().toISOString(), status: "new", adminNote: "", updatedAt: null };
  await putRecords(MEMBERSHIP_REQUESTS, [row]);
  return row;
}

export async function updateMembershipRequest(id: string, patch: Partial<Pick<MembershipRequest, "status" | "adminNote">>) {
  const row = await getRecord(MEMBERSHIP_REQUESTS, id);
  if (!row) return null;
  const next = { ...row, ...patch, updatedAt: new Date().toISOString() };
  await putRecords(MEMBERSHIP_REQUESTS, [next]);
  return next;
}

export const deleteMembershipRequest = async (id: string) => (await removeRecords(MEMBERSHIP_REQUESTS, [id])) > 0;

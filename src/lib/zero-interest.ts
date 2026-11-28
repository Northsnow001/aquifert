import "server-only";

import { dataClient } from "@/lib/data/db";
import { countRecords, findRecord, getRecord, listRecords, putRecords, removeRecords } from "@/lib/data/records";
import { ZERO } from "@/lib/data/tables";
import type { ZeroRegistration } from "@/lib/zero-types";

export { ZERO_STATUSES, ZERO_STATUS_LABEL, type ZeroRegistration, type ZeroStatus } from "@/lib/zero-types";

export const listZeroRegistrations = (): Promise<ZeroRegistration[]> => listRecords(ZERO);

/** Nav badge: how many registrations exist, and how many are still new. */
export async function zeroRegistrationCounts(): Promise<{ total: number; fresh: number }> {
  const db = dataClient();
  if (!db) {
    const rows = await listZeroRegistrations();
    return { total: rows.length, fresh: rows.filter((row) => row.status === "new").length };
  }
  const [total, fresh] = await Promise.all([
    countRecords(ZERO),
    db.from(ZERO.table).select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  if (fresh.error) {
    const rows = await listZeroRegistrations();
    return { total: rows.length, fresh: rows.filter((row) => row.status === "new").length };
  }
  return { total, fresh: fresh.count ?? 0 };
}

/** The member's latest registration, matched by account id or email. */
export function findZeroRegistration(user: { id: string; email: string }): Promise<ZeroRegistration | null> {
  return findRecord(ZERO, { userId: user.id, email: user.email });
}

export async function addZeroRegistration(input: Omit<ZeroRegistration, "id" | "at" | "status" | "adminNote" | "updatedAt">): Promise<ZeroRegistration> {
  const row: ZeroRegistration = {
    ...input,
    email: input.email.trim().toLowerCase(),
    id: `zero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    status: "new",
    adminNote: "",
    updatedAt: null,
  };
  await putRecords(ZERO, [row]);
  return row;
}

export async function updateZeroRegistration(id: string, patch: Partial<Pick<ZeroRegistration, "status" | "adminNote" | "callBookedAt" | "calendlyInvitee">>): Promise<ZeroRegistration | null> {
  const row = await getRecord(ZERO, id);
  if (!row) return null;
  const next = { ...row, ...patch, updatedAt: new Date().toISOString() };
  await putRecords(ZERO, [next]);
  return next;
}

export async function deleteZeroRegistration(id: string): Promise<boolean> {
  return (await removeRecords(ZERO, [id])) > 0;
}

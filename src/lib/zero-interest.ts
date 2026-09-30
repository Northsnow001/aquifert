import "server-only";

import { findRecord, getRecord, listRecords, putRecords, removeRecords } from "@/lib/data/records";
import { ZERO } from "@/lib/data/tables";
import type { ZeroRegistration } from "@/lib/zero-types";

export { ZERO_STATUSES, ZERO_STATUS_LABEL, type ZeroRegistration, type ZeroStatus } from "@/lib/zero-types";

export const listZeroRegistrations = (): Promise<ZeroRegistration[]> => listRecords(ZERO);

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

export async function updateZeroRegistration(id: string, patch: Partial<Pick<ZeroRegistration, "status" | "adminNote">>): Promise<ZeroRegistration | null> {
  const row = await getRecord(ZERO, id);
  if (!row) return null;
  const next = { ...row, ...patch, updatedAt: new Date().toISOString() };
  await putRecords(ZERO, [next]);
  return next;
}

export async function deleteZeroRegistration(id: string): Promise<boolean> {
  return (await removeRecords(ZERO, [id])) > 0;
}

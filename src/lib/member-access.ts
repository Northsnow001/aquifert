import "server-only";

import { findRecord, getRecord, listRecords, putRecords, removeRecords } from "@/lib/data/records";
import { ACCESS_EVENTS, BANS, type AccessRow, type BanRow } from "@/lib/data/tables";

export type BanRecord = BanRow;
export type AccessEvent = AccessRow;

export const listBans = (): Promise<BanRecord[]> => listRecords(BANS);
export const listAccessHistory = (): Promise<AccessEvent[]> => listRecords(ACCESS_EVENTS);

export function findBan(user: { id?: string | null; email?: string | null }): Promise<BanRecord | null> {
  return findRecord(BANS, { userId: user.id ?? null, email: user.email ?? null });
}

export const isBannedEmail = async (email: string) => Boolean(await findBan({ email }));

export async function banMember(input: { email: string; userId?: string | null; name?: string; reason: string }, by: string): Promise<BanRecord> {
  const email = input.email.trim().toLowerCase();
  const record: BanRecord = {
    email,
    userId: input.userId ?? null,
    name: input.name?.trim() ?? "",
    reason: input.reason.trim(),
    bannedAt: new Date().toISOString(),
    bannedBy: by,
  };
  await putRecords(BANS, [record]);
  await putRecords<AccessEvent>(ACCESS_EVENTS, [{ at: record.bannedAt, email, action: "banned", by, reason: record.reason }]);
  return record;
}

export async function reinstateMember(email: string, by: string, note = ""): Promise<BanRecord | null> {
  const key = email.trim().toLowerCase();
  const record = await getRecord(BANS, key);
  if (!record) return null;
  await removeRecords(BANS, [key]);
  await putRecords<AccessEvent>(ACCESS_EVENTS, [{ at: new Date().toISOString(), email: key, action: "reinstated", by, reason: note.trim() }]);
  return record;
}

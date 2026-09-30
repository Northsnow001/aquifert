import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";

export type BanRecord = {
  email: string;
  userId: string | null;
  name: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
};

export type AccessEvent = { at: string; email: string; action: "banned" | "reinstated"; by: string; reason: string };

type AccessFile = { bans: BanRecord[]; history: AccessEvent[] };

const filePath = path.join(process.cwd(), "data", "member-access.json");
const MAX_HISTORY = 500;

function read(): AccessFile {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<AccessFile>;
    return { bans: Array.isArray(parsed.bans) ? parsed.bans : [], history: Array.isArray(parsed.history) ? parsed.history : [] };
  } catch {
    return { bans: [], history: [] };
  }
}

function write(value: AccessFile) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(`${filePath}.tmp`, `${JSON.stringify({ ...value, history: value.history.slice(0, MAX_HISTORY) }, null, 2)}\n`, "utf8");
  renameSync(`${filePath}.tmp`, filePath);
}

export const listBans = () => read().bans.sort((a, b) => b.bannedAt.localeCompare(a.bannedAt));
export const listAccessHistory = () => read().history;

export function findBan(user: { id?: string | null; email?: string | null }): BanRecord | null {
  const email = user.email?.trim().toLowerCase();
  return read().bans.find((ban) => (email && ban.email === email) || (user.id && ban.userId === user.id)) ?? null;
}

export const isBannedEmail = (email: string) => Boolean(findBan({ email }));

export function banMember(input: { email: string; userId?: string | null; name?: string; reason: string }, by: string): BanRecord {
  const data = read();
  const email = input.email.trim().toLowerCase();
  const record: BanRecord = {
    email,
    userId: input.userId ?? null,
    name: input.name?.trim() ?? "",
    reason: input.reason.trim(),
    bannedAt: new Date().toISOString(),
    bannedBy: by,
  };
  write({
    bans: [record, ...data.bans.filter((ban) => ban.email !== email)],
    history: [{ at: record.bannedAt, email, action: "banned", by, reason: record.reason }, ...data.history],
  });
  return record;
}

export function reinstateMember(email: string, by: string, note = ""): BanRecord | null {
  const data = read();
  const key = email.trim().toLowerCase();
  const record = data.bans.find((ban) => ban.email === key) ?? null;
  if (!record) return null;
  write({
    bans: data.bans.filter((ban) => ban.email !== key),
    history: [{ at: new Date().toISOString(), email: key, action: "reinstated", by, reason: note.trim() }, ...data.history],
  });
  return record;
}

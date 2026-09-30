import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type { ZeroRegistration } from "@/lib/zero-types";

export { ZERO_STATUSES, ZERO_STATUS_LABEL, type ZeroRegistration, type ZeroStatus } from "@/lib/zero-types";

const filePath = path.join(process.cwd(), "data", "zero-interest.json");

export function listZeroRegistrations(): ZeroRegistration[] {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? (parsed as ZeroRegistration[]).sort((a, b) => b.at.localeCompare(a.at)) : [];
  } catch {
    return [];
  }
}

function save(rows: ZeroRegistration[]) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(`${filePath}.tmp`, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  renameSync(`${filePath}.tmp`, filePath);
}

/** The member's latest registration, matched by account id or email. */
export function findZeroRegistration(user: { id: string; email: string }): ZeroRegistration | null {
  const email = user.email.trim().toLowerCase();
  return listZeroRegistrations().find((row) => row.userId === user.id || row.email === email) ?? null;
}

export function addZeroRegistration(input: Omit<ZeroRegistration, "id" | "at" | "status" | "adminNote" | "updatedAt">): ZeroRegistration {
  const row: ZeroRegistration = {
    ...input,
    email: input.email.trim().toLowerCase(),
    id: `zero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    status: "new",
    adminNote: "",
    updatedAt: null,
  };
  save([row, ...listZeroRegistrations()]);
  return row;
}

export function updateZeroRegistration(id: string, patch: Partial<Pick<ZeroRegistration, "status" | "adminNote">>): ZeroRegistration | null {
  const rows = listZeroRegistrations();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  rows[index] = { ...rows[index], ...patch, updatedAt: new Date().toISOString() };
  save(rows);
  return rows[index];
}

export function deleteZeroRegistration(id: string): boolean {
  const rows = listZeroRegistrations();
  const next = rows.filter((row) => row.id !== id);
  if (next.length === rows.length) return false;
  save(next);
  return true;
}

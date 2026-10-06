import "server-only";

import { getRecord, listRecords, putRecords } from "@/lib/data/records";
import { TELEX_VISITS } from "@/lib/data/tables";
import type { SessionUser } from "@/lib/session-shared";
import { mergeVisit, type TelexVisit } from "@/lib/telex-reads/stats";

export type VisitReport = { visit: string; seconds: number; depth: number };

/**
 * Saves a browser report for one visit. The first report creates the row, after `findFlash` confirms
 * the member may read it; later ones only grow it. The row id carries the account id, so one member
 * can never touch another member's visit.
 */
export async function recordVisit(
  user: SessionUser & { admin: boolean },
  telexId: string,
  report: VisitReport,
  findFlash: () => Promise<{ headline: string } | null>,
): Promise<TelexVisit | null> {
  const id = `${user.id}:${report.visit}`;
  const now = new Date().toISOString();
  const current = await getRecord(TELEX_VISITS, id);
  if (current && current.telexId !== telexId) return null;
  let base = current;
  if (!base) {
    const flash = await findFlash();
    if (!flash) return null;
    base = {
      id,
      at: now,
      startedAt: now,
      userId: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      admin: user.admin,
      telexId,
      headline: flash.headline,
      seconds: 0,
      depth: 0,
      readAt: null,
    };
  }
  const next = mergeVisit(base, report, now);
  await putRecords(TELEX_VISITS, [next]);
  return next;
}

export const listVisits = (options: { since?: string } = {}) => listRecords(TELEX_VISITS, options);

/** Flash ids this member has read, for the Read marks on the feed. The marks are a nicety, so a failed read leaves them off. */
export async function readTelexIds(user: Pick<SessionUser, "id">): Promise<Set<string>> {
  try {
    const visits = await listRecords(TELEX_VISITS, { userId: user.id });
    return new Set(visits.filter((visit) => visit.readAt).map((visit) => visit.telexId));
  } catch {
    return new Set();
  }
}

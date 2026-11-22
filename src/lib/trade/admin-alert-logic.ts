/** Aquifert's no-reply mailbox is a required desk alert inbox. Other noreply locals are skipped. */
export function isAlertInbox(addr: string) {
  const email = addr.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const [local, domain] = email.split("@");
  if (local === "noreply" || local === "no-reply") return domain === "aquifert.com";
  return true;
}

/** Quiet window so a continuing chat does not re-page the desk. */
export const CONVERSATION_QUIET_MS = 4 * 60 * 60 * 1000;

const LIVE_DESK = new Set(["indication_sent", "negotiating", "firm_interest"]);

export function isLiveDeskStatus(status: string | null | undefined) {
  return Boolean(status && LIVE_DESK.has(status));
}

/** True when this inbound starts a new session (first ever, or a gap after the last inbound). */
export function isNewBuyerConversation(
  thread: Array<{ direction: string; createdAt: string }>,
  now = Date.now(),
) {
  const inbound = thread
    .filter((row) => row.direction === "in")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (inbound.length <= 1) return true;
  const previous = Date.parse(inbound[inbound.length - 2]?.createdAt || "");
  return Number.isFinite(previous) && now - previous >= CONVERSATION_QUIET_MS;
}

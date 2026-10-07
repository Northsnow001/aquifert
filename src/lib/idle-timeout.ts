/** Signed-in pages end the session after this long without activity. */
export const IDLE_LIMIT_MS = 15 * 60_000;
/** The "still there?" warning appears this far into a quiet spell. */
export const IDLE_WARN_MS = 13 * 60_000;
/** Browsers report activity to the server at most this often. */
export const HEARTBEAT_MS = 30_000;
/** The server waits a little past the limit, so a heartbeat's delay never ends a session before the browser does. */
export const IDLE_SERVER_GRACE_MS = 60_000;

/** Last server-confirmed activity, in milliseconds since the epoch. */
export const ACTIVITY_COOKIE = "aq_active";
export const ACTIVITY_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 400 * 24 * 60 * 60,
} as const;

/** Where a timed-out member re-enters their password. */
export const REAUTH_PATH = "/session-expired";
/** sessionStorage key carrying the timed-out member's email to the re-auth page. */
export const REAUTH_EMAIL_KEY = "aq.reauth.email";

export type IdleState = "fresh" | "active" | "expired";

/**
 * "fresh" when there is no usable stamp, or the stamp predates the current sign-in (it belongs to an
 * earlier session); "expired" once the server limit has passed; otherwise "active".
 */
export function idleState(stamp: string | undefined, { now = Date.now(), signedInAt }: { now?: number; signedInAt?: string | null } = {}): IdleState {
  const last = Number(stamp);
  if (!stamp || !Number.isFinite(last) || last <= 0) return "fresh";
  const since = signedInAt ? Date.parse(signedInAt) : NaN;
  if (Number.isFinite(since) && since > last) return "fresh";
  return now - last >= IDLE_LIMIT_MS + IDLE_SERVER_GRACE_MS ? "expired" : "active";
}

/** Same-site path to send the member back to after re-auth, or null when the value is unsafe. */
export function safeReturnPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith(REAUTH_PATH) || path.startsWith("/login")) return null;
  return path;
}

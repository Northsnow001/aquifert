/**
 * Cookie consent state (UK GDPR / PECR).
 *
 * The consent record itself is strictly-necessary storage, it is the only
 * key written before a choice exists. Nothing non-essential is written
 * anywhere before a choice is recorded.
 */

export const COOKIE_POLICY_VERSION = "1.0";
const KEY = "aq.consent";
const REPROMPT_MS = 365 * 864e5; // 12 months

export type ConsentState = {
  version: string;
  at: string;
  analytics: boolean;
  marketing: boolean;
};

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ConsentState;
    if (c.version !== COOKIE_POLICY_VERSION) return null; // policy changed → re-prompt
    if (Date.now() - new Date(c.at).getTime() > REPROMPT_MS) return null; // 12 months
    return c;
  } catch {
    return null;
  }
}

export function recordConsent(analytics: boolean, marketing: boolean): ConsentState {
  const c: ConsentState = {
    version: COOKIE_POLICY_VERSION,
    at: new Date().toISOString(),
    analytics,
    marketing,
  };
  localStorage.setItem(KEY, JSON.stringify(c));
  return c;
}

export function marketingAllowed(): boolean {
  return getConsent()?.marketing === true;
}

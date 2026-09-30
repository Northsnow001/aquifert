import type { MemberRules } from "@/lib/desk-settings/types";

export const FREEMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.ca", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.com.au",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "outlook.com", "live.com", "live.co.uk", "msn.com", "aol.com", "icloud.com",
  "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "gmx.de", "mail.com", "zoho.com", "fastmail.com",
  "ymail.com", "yandex.com", "yandex.ru", "163.com", "126.com", "qq.com", "naver.com", "hanmail.net", "daum.net",
];

export const DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "yopmail.com", "10minutemail.com", "10minutemail.net",
  "tempmail.com", "temp-mail.org", "tempmailo.com", "throwawaymail.com", "trashmail.com", "trashmail.net", "getnada.com", "maildrop.cc",
  "mailnesia.com", "fakeinbox.com", "dispostable.com", "mintemail.com", "moakt.com", "spambox.us", "sharklasers.com", "pokemail.net",
  "mailcatch.com", "mytrashmail.com", "spamgourmet.com", "burnermail.io", "emailondeck.com", "getairmail.com", "trashmailer.com",
  "tmpmail.net", "disposablemail.com", "mail-temporaire.fr", "mailnull.com",
];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const WORK_EMAIL_MESSAGE = "Please use your work email address. Free or disposable email providers are not allowed.";
export const DISPOSABLE_MESSAGE = "Please use a valid email address. Disposable email providers are not allowed.";

export type EmailReason = "invalid" | "banned" | "disposable" | "blocked" | "freemail";

export type EmailVerdict =
  | { ok: true; rule: "allowed" | "work" | "freemail-permitted" }
  | { ok: false; reason: EmailReason; message: string };

/** Lower-cases and trims each line, keeping entries that look like a domain or an address. */
export function cleanEntries(lines: string[]): string[] {
  const seen = new Set<string>();
  for (const line of lines) {
    const value = line.trim().toLowerCase().replace(/^@/, "");
    if (value && /^[^\s@]*@?[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) seen.add(value);
  }
  return [...seen].sort();
}

export const emailDomain = (email: string) => email.trim().toLowerCase().split("@").pop() ?? "";

/** True when the domain is on the list or is a subdomain of one that is. */
function onList(domain: string, list: Iterable<string>) {
  for (const entry of list) if (domain === entry || domain.endsWith(`.${entry}`)) return true;
  return false;
}

function matches(email: string, domain: string, entries: string[]) {
  return entries.some((entry) => (entry.includes("@") ? entry === email : domain === entry || domain.endsWith(`.${entry}`)));
}

/**
 * Decides whether an address may sign up. Banned addresses get the disposable message so the ban is not
 * revealed; the allow list overrides every rule except a ban.
 */
export function checkSignupEmail(raw: string, rules: MemberRules, isBanned: (email: string) => boolean = () => false): EmailVerdict {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, reason: "invalid", message: "Enter a valid work email." };
  if (isBanned(email)) return { ok: false, reason: "banned", message: DISPOSABLE_MESSAGE };
  const domain = emailDomain(email);
  if (matches(email, domain, rules.allowed)) return { ok: true, rule: "allowed" };
  if (onList(domain, DISPOSABLE_DOMAINS)) return { ok: false, reason: "disposable", message: DISPOSABLE_MESSAGE };
  if (matches(email, domain, rules.blocked)) return { ok: false, reason: "blocked", message: rules.requireWorkEmail ? WORK_EMAIL_MESSAGE : DISPOSABLE_MESSAGE };
  if (onList(domain, FREEMAIL_DOMAINS)) {
    return rules.requireWorkEmail ? { ok: false, reason: "freemail", message: WORK_EMAIL_MESSAGE } : { ok: true, rule: "freemail-permitted" };
  }
  return { ok: true, rule: "work" };
}

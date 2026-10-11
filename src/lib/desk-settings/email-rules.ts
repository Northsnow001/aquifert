import type { MemberRules } from "@/lib/desk-settings/types";

export const FREEMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.ca", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.com.au",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "outlook.com", "live.com", "live.co.uk", "msn.com", "aol.com", "icloud.com",
  "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "gmx.de", "mail.com", "zoho.com", "fastmail.com",
  "ymail.com", "yandex.com", "yandex.ru", "163.com", "126.com", "qq.com", "naver.com", "hanmail.net", "daum.net",
  "rocketmail.com", "aim.com", "zohomail.com", "tutanota.com", "tuta.io", "mail.ru", "inbox.ru", "list.ru", "bk.ru", "rediffmail.com",
  "web.de", "t-online.de", "freenet.de", "orange.fr", "wanadoo.fr", "laposte.net", "free.fr", "sfr.fr", "libero.it", "virgilio.it",
  "seznam.cz", "wp.pl", "onet.pl", "o2.pl", "interia.pl", "sina.com", "sohu.com", "yeah.net", "foxmail.com", "aliyun.com", "hushmail.com",
  "lycos.com", "inbox.com", "btinternet.com", "sky.com", "virginmedia.com", "comcast.net", "verizon.net", "att.net", "sbcglobal.net",
  "bellsouth.net", "cox.net", "charter.net", "shaw.ca", "rogers.com", "sympatico.ca", "bigpond.com", "optusnet.com.au", "xtra.co.nz",
  "uol.com.br", "bol.com.br", "terra.com.br", "skynet.be", "telenet.be", "ziggo.nl", "kpnmail.nl", "home.nl", "bluewin.ch",
];

/** Providers refused under any country ending, so yahoo.com.ng or hotmail.co.za count as personal too. */
export const FREEMAIL_BRANDS = ["gmail", "googlemail", "yahoo", "ymail", "hotmail", "outlook", "aol", "icloud", "protonmail", "gmx", "yandex", "rediffmail"];

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
  if (onList(domain, FREEMAIL_DOMAINS) || FREEMAIL_BRANDS.includes(domain.split(".")[0])) {
    return rules.requireWorkEmail ? { ok: false, reason: "freemail", message: WORK_EMAIL_MESSAGE } : { ok: true, rule: "freemail-permitted" };
  }
  return { ok: true, rule: "work" };
}

/** What the sign-up form is told. workEmail asks for the work email pop-up; other refusals show under the field. */
export type SignupCheck = { ok: true } | { ok: false; message: string; workEmail: boolean };

export function signupCheck(verdict: EmailVerdict): SignupCheck {
  if (verdict.ok) return { ok: true };
  return { ok: false, message: verdict.message, workEmail: verdict.reason === "freemail" || (verdict.reason === "blocked" && verdict.message === WORK_EMAIL_MESSAGE) };
}

/** The launch rules, for when the saved ones cannot be read: work email required, no named exceptions. */
export const DEFAULT_SIGNUP_RULES: MemberRules = { requireWorkEmail: true, blocked: [], allowed: [] };

/** Accounts created from this moment must pass the sign-up rules to open the hub; older accounts keep their access. */
export const WORK_EMAIL_FROM = "2026-10-11T17:00:00.000Z";

export const underWorkEmailRule = (createdAt: string | undefined) => {
  const created = Date.parse(createdAt ?? "");
  return Number.isFinite(created) && created >= Date.parse(WORK_EMAIL_FROM);
};

/** True for an account created under the rule whose address the sign-up form would now refuse. */
export function personalAccountBlocked(email: string, createdAt: string | undefined, rules: MemberRules) {
  if (!underWorkEmailRule(createdAt)) return false;
  const verdict = checkSignupEmail(email, rules);
  return !verdict.ok && verdict.reason !== "invalid";
}

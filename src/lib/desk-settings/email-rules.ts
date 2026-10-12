import type { MemberRules } from "@/lib/desk-settings/types";

/** Free webmail: anyone can open an inbox here. */
export const WEBMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.ca", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.com.au",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "outlook.com", "live.com", "live.co.uk", "msn.com", "aol.com", "icloud.com",
  "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "gmx.de", "mail.com", "zoho.com", "fastmail.com",
  "ymail.com", "yandex.com", "yandex.ru", "163.com", "126.com", "qq.com", "naver.com", "hanmail.net", "daum.net",
  "rocketmail.com", "aim.com", "zohomail.com", "tutanota.com", "tuta.io", "mail.ru", "inbox.ru", "list.ru", "bk.ru", "rediffmail.com",
  "web.de", "laposte.net", "libero.it", "virgilio.it", "seznam.cz", "wp.pl", "onet.pl", "o2.pl", "interia.pl", "sina.com", "sohu.com",
  "yeah.net", "foxmail.com", "aliyun.com", "hushmail.com", "lycos.com", "inbox.com", "uol.com.br", "bol.com.br", "terra.com.br",
  "rambler.ru", "ukr.net", "i.ua", "abv.bg", "mail.ee", "email.cz", "centrum.cz", "post.cz", "atlas.cz", "azet.sk", "freemail.hu",
  "citromail.hu", "tiscali.it", "alice.it", "tin.it", "email.it", "ono.com", "terra.es", "juno.com", "netzero.net", "earthlink.net",
  "mail.yahoo.com", "rediff.com", "indiatimes.com", "sify.com", "myself.com", "consultant.com", "engineer.com", "usa.com", "post.com",
  "europe.com", "asia.com", "techie.com", "writeme.com", "gmx.at", "gmx.ch", "gmx.fr", "hey.com", "skiff.com", "mailfence.com",
  "posteo.de", "posteo.net", "runbox.com", "disroot.org", "riseup.net", "duck.com", "simplelogin.com", "anonaddy.me",
];

/** Home broadband and phone-company mailboxes: personal, but tied to a household connection. */
export const ISP_DOMAINS = [
  "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net", "ntlworld.com", "blueyonder.co.uk", "comcast.net", "verizon.net",
  "att.net", "sbcglobal.net", "bellsouth.net", "cox.net", "charter.net", "optonline.net", "frontier.com", "windstream.net", "centurylink.net",
  "shaw.ca", "rogers.com", "sympatico.ca", "telus.net", "videotron.ca", "bigpond.com", "bigpond.net.au", "optusnet.com.au", "iinet.net.au",
  "tpg.com.au", "xtra.co.nz", "skynet.be", "telenet.be", "ziggo.nl", "kpnmail.nl", "home.nl", "planet.nl", "bluewin.ch", "t-online.de",
  "freenet.de", "arcor.de", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "neuf.fr", "bbox.fr", "telefonica.net", "movistar.es",
  "mweb.co.za", "telkomsa.net", "webmail.co.za", "vodamail.co.za", "ptcl.net", "eircom.net", "otenet.gr", "netvigator.com", "singnet.com.sg",
  "pacific.net.sg", "tm.net.my", "streamyx.com", "vsnl.net", "airtelmail.in", "bsnl.in", "emirates.net.ae", "omantel.net.om",
];

/** Every personal provider, for the admin's reference list. */
export const FREEMAIL_DOMAINS = [...WEBMAIL_DOMAINS, ...ISP_DOMAINS];

/** Providers that count as personal under any country ending, so yahoo.com.ng or hotmail.co.za are personal too. */
export const FREEMAIL_BRANDS = ["gmail", "googlemail", "yahoo", "ymail", "hotmail", "outlook", "live", "aol", "icloud", "protonmail", "gmx", "yandex", "rediffmail", "zoho"];

export const DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "yopmail.com", "10minutemail.com", "10minutemail.net",
  "tempmail.com", "temp-mail.org", "tempmailo.com", "throwawaymail.com", "trashmail.com", "trashmail.net", "getnada.com", "maildrop.cc",
  "mailnesia.com", "fakeinbox.com", "dispostable.com", "mintemail.com", "moakt.com", "spambox.us", "sharklasers.com", "pokemail.net",
  "mailcatch.com", "mytrashmail.com", "spamgourmet.com", "burnermail.io", "emailondeck.com", "getairmail.com", "trashmailer.com",
  "tmpmail.net", "disposablemail.com", "mail-temporaire.fr", "mailnull.com",
];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const DISPOSABLE_MESSAGE = "Please use a valid email address. Disposable email providers are not allowed.";

export type EmailReason = "invalid" | "banned" | "disposable" | "blocked";

export type EmailVerdict = { ok: true; rule: "allowed" | "work" | "personal" } | { ok: false; reason: EmailReason; message: string };

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

/* ---------------- Email type ---------------- */

export type EmailType = "work" | "personal";
export type EmailGroup = "company" | "education" | "government" | "webmail" | "isp" | "disposable";

export type EmailClass = {
  type: EmailType;
  group: EmailGroup;
  /** The organisation's domain for work addresses, the provider's name for personal ones. */
  source: string;
  domain: string;
};

export const EMAIL_TYPE_LABEL: Record<EmailType, string> = { work: "Work email", personal: "Personal / public email" };
export const EMAIL_GROUP_LABEL: Record<EmailGroup, string> = {
  company: "Company",
  education: "Education",
  government: "Government",
  webmail: "Free webmail",
  isp: "Internet provider",
  disposable: "Throwaway inbox",
};

const PROVIDER_NAMES: Record<string, string> = {
  gmail: "Gmail", googlemail: "Gmail", yahoo: "Yahoo", ymail: "Yahoo", rocketmail: "Yahoo", hotmail: "Outlook", outlook: "Outlook",
  live: "Outlook", msn: "Outlook", aol: "AOL", aim: "AOL", icloud: "iCloud", me: "iCloud", mac: "iCloud", proton: "Proton",
  protonmail: "Proton", pm: "Proton", gmx: "GMX", yandex: "Yandex", zoho: "Zoho", zohomail: "Zoho", qq: "QQ", foxmail: "QQ",
  "163": "NetEase", "126": "NetEase", yeah: "NetEase", rediffmail: "Rediff", rediff: "Rediff", tutanota: "Tuta", tuta: "Tuta",
};

/** Where an address comes from, from its domain alone. Unknown domains are assumed to belong to an organisation. */
export function classifyEmail(raw: string): EmailClass {
  const domain = emailDomain(raw);
  const labels = domain.split(".");
  const brand = labels[0] ?? "";
  const provider = PROVIDER_NAMES[brand] ?? domain;
  if (onList(domain, DISPOSABLE_DOMAINS)) return { type: "personal", group: "disposable", source: domain, domain };
  if (onList(domain, ISP_DOMAINS)) return { type: "personal", group: "isp", source: domain, domain };
  if (onList(domain, WEBMAIL_DOMAINS) || (FREEMAIL_BRANDS.includes(brand) && labels.length <= 4)) return { type: "personal", group: "webmail", source: provider, domain };
  if (/(^|\.)(edu|ac|sch)(\.[a-z]{2})?$/.test(domain)) return { type: "work", group: "education", source: domain, domain };
  if (/(^|\.)(gov|mil|gob|gouv|go|govt)(\.[a-z]{2})?$/.test(domain) || /\.gc\.ca$|\.nhs\.(uk|net)$|\.europa\.eu$/.test(domain)) {
    return { type: "work", group: "government", source: domain, domain };
  }
  return { type: "work", group: "company", source: domain, domain };
}

/* ---------------- Sign-up ---------------- */

/**
 * Decides whether an address may sign up. Any real inbox may, work or personal; throwaway inboxes, the admin's
 * block list and bans may not. Banned addresses get the disposable message so the ban is not revealed; the
 * allow list overrides every rule except a ban.
 */
export function checkSignupEmail(raw: string, rules: MemberRules, isBanned: (email: string) => boolean = () => false): EmailVerdict {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, reason: "invalid", message: "Enter a valid email address." };
  if (isBanned(email)) return { ok: false, reason: "banned", message: DISPOSABLE_MESSAGE };
  const domain = emailDomain(email);
  if (matches(email, domain, rules.allowed)) return { ok: true, rule: "allowed" };
  if (onList(domain, DISPOSABLE_DOMAINS)) return { ok: false, reason: "disposable", message: DISPOSABLE_MESSAGE };
  if (matches(email, domain, rules.blocked)) return { ok: false, reason: "blocked", message: DISPOSABLE_MESSAGE };
  return { ok: true, rule: classifyEmail(email).type };
}

/** What the sign-up form is told. */
export type SignupCheck = { ok: true } | { ok: false; message: string };

export function signupCheck(verdict: EmailVerdict): SignupCheck {
  return verdict.ok ? { ok: true } : { ok: false, message: verdict.message };
}

/** The launch rules, for when the saved ones cannot be read: no named exceptions. */
export const DEFAULT_SIGNUP_RULES: MemberRules = { blocked: [], allowed: [] };

/** Accounts created from this moment must pass the sign-up rules to open the hub; older accounts keep their access. */
export const SIGNUP_RULES_FROM = "2026-10-11T17:00:00.000Z";

export const underSignupRules = (createdAt: string | undefined) => {
  const created = Date.parse(createdAt ?? "");
  return Number.isFinite(created) && created >= Date.parse(SIGNUP_RULES_FROM);
};

/** True for an account created under the rules whose address the sign-up form would now refuse: a throwaway inbox or a blocked address. */
export function accountAddressRefused(email: string, createdAt: string | undefined, rules: MemberRules) {
  if (!underSignupRules(createdAt)) return false;
  const verdict = checkSignupEmail(email, rules);
  return !verdict.ok && verdict.reason !== "invalid";
}

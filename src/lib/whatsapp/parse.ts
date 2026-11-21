const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/i;
const EMAIL_FULL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function digitsOnly(raw: string) {
  return raw.replace(/\D/g, "");
}

export function toE164(raw: string) {
  const digits = digitsOnly(raw);
  if (!digits) return "";
  return `+${digits.replace(/^00/, "")}`;
}

export function emailInMessage(text: string) {
  return text.match(EMAIL)?.[0].trim().toLowerCase() ?? "";
}

/** Invite wa.me prefills a hello plus START email so we can match the buyer row. */
export function parseWhatsAppStart(text: string) {
  const raw = text.trim();
  const start = raw.match(/\bstart(?:\s+|:)([^\n]+)/i);
  const hay = start ? start[1] : raw;
  const email = hay.match(EMAIL)?.[0].trim().toLowerCase() ?? "";
  const isStart = Boolean(start) && Boolean(email);
  return { isStart, email: isStart ? email : emailInMessage(raw), linkedEmail: isStart ? email : "" };
}

export function buyerInviteEligible(row: {
  email: string | null | undefined;
  whatsappE164: string | null | undefined;
  onboardingStatus: string;
}) {
  const email = String(row.email ?? "").trim().toLowerCase();
  if (!EMAIL_FULL.test(email)) return { ok: false as const, reason: "Add a valid email before inviting." };
  if (row.whatsappE164?.trim() || row.onboardingStatus === "subscribed") {
    return { ok: false as const, reason: "Already on WhatsApp." };
  }
  if (row.onboardingStatus === "skipped") return { ok: false as const, reason: "Marked skipped." };
  return { ok: true as const, email };
}

export function deskWhatsAppE164() {
  const from = process.env.TWILIO_WHATSAPP_FROM || process.env.WHATSAPP_DESK_E164 || "+447427829952";
  return toE164(from) || "+447427829952";
}

export function buyerWhatsAppLink(email: string, who?: { name?: string; company?: string }) {
  const number = digitsOnly(deskWhatsAppE164());
  const name = who?.name?.trim();
  const company = who?.company?.trim();
  const intro = name && company ? `Hi, this is ${name} from ${company}.` : name ? `Hi, this is ${name}.` : "Hi.";
  const text = encodeURIComponent(`${intro} START ${email.trim().toLowerCase()}`);
  return `https://wa.me/${number}?text=${text}`;
}

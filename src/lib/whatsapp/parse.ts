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

/** Workflow 1b wa.me link prefills `START email@domain`. */
export function parseWhatsAppStart(text: string) {
  const raw = text.trim();
  const start = raw.match(/^\s*start(?:\s+|:)(.+)$/i);
  const hay = start ? start[1] : raw;
  const email = hay.match(EMAIL)?.[0].trim().toLowerCase() ?? "";
  const isStart = Boolean(start) && Boolean(email);
  return { isStart, email: isStart ? email : inviteEmailFromText(raw), linkedEmail: isStart ? email : "" };
}

function inviteEmailFromText(raw: string) {
  if (!/^\s*start\b/i.test(raw)) return "";
  return raw.match(EMAIL)?.[0].trim().toLowerCase() ?? "";
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

export function buyerWhatsAppLink(email: string) {
  const number = digitsOnly(deskWhatsAppE164());
  const text = encodeURIComponent(`START ${email.trim().toLowerCase()}`);
  return `https://wa.me/${number}?text=${text}`;
}

import type { CommunityCall } from "@/lib/aq-modules/types";

const stampOf = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** RFC 5545 caps lines at 75 octets; continuation lines start with a space. */
function fold(line: string) {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = out.length ? 74 : 75;
    if (size + bytes > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

/**
 * Calendar invite for a community call. `stamp` is when the file was made (ISO) and `pageUrl`
 * is where the member returns to join, used when the call has no joining link yet.
 */
export function callIcs(call: Pick<CommunityCall, "id" | "topic" | "host" | "description" | "startsAt" | "durationMinutes" | "joinUrl">, stamp: string, pageUrl: string) {
  const start = Date.parse(call.startsAt);
  const end = new Date(start + call.durationMinutes * 60_000).toISOString();
  const where = call.joinUrl || pageUrl;
  const description = [call.description, `Hosted by ${call.host}.`, call.joinUrl ? `Join: ${call.joinUrl}` : `The joining link appears on ${pageUrl} 15 minutes before the start.`]
    .filter(Boolean)
    .join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aquifert//Freight Analytics Call//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${call.id}@aquifert.com`,
    `DTSTAMP:${stampOf(stamp)}`,
    `DTSTART:${stampOf(call.startsAt)}`,
    `DTEND:${stampOf(end)}`,
    `SUMMARY:${escapeText(`Aquifert: ${call.topic}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(where)}`,
    `URL:${where}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`${call.topic} starts in 15 minutes`)}`,
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export const icsFileName = (call: Pick<CommunityCall, "topic" | "startsAt">) =>
  `aquifert-call-${call.startsAt.slice(0, 10)}-${call.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "call"}.ics`;

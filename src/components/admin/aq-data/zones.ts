/** Zones the desk schedules calls in. The date and time inputs are read as wall time in the chosen zone. */
export const CALL_ZONES = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (UK time)" },
  { value: "Europe/Paris", label: "Central Europe" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
] as const;

export const DEFAULT_ZONE = "Europe/London";

export const isCallZone = (value: string) => CALL_ZONES.some((zone) => zone.value === value);

function wallParts(zone: string, at: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, second: get("second") };
}

const offsetMinutes = (zone: string, at: number) => {
  const wall = wallParts(zone, at);
  return (Date.parse(`${wall.date}T${wall.time}:${wall.second}Z`) - at) / 60_000;
};

/** `2026-10-15` + `15:00` in `Europe/London` → `2026-10-15T14:00:00.000Z`, or null when the inputs are incomplete. */
export function wallToUtc(date: string, time: string, zone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const guess = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(guess)) return null;
  const first = offsetMinutes(zone, guess);
  let at = guess - first * 60_000;
  const second = offsetMinutes(zone, at);
  if (second !== first) at = guess - second * 60_000;
  return new Date(at).toISOString();
}

/** The wall date and time an ISO timestamp shows in a zone, for filling the form when editing. */
export function utcToWall(iso: string, zone: string) {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return { date: "", time: "" };
  const wall = wallParts(zone, at);
  return { date: wall.date, time: wall.time };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Thu 15 Oct 2026, 14:00 UTC` */
export function utcLabel(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${WEEKDAYS[at.getUTCDay()]} ${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}, ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} UTC`;
}

"use client";

import { useSyncExternalStore } from "react";
import { Clock, Radio } from "lucide-react";

const MINUTE = 60_000;
const TICK = 30_000;

const noSubscribe = () => () => {};
const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** The browser's time zone; null while rendering on the server and during hydration. */
export function useTimeZone() {
  return useSyncExternalStore(noSubscribe, localZone, () => null);
}

function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, TICK);
  return () => clearInterval(id);
}
const clockNow = () => Math.floor(Date.now() / TICK) * TICK;

/** Current time rounded to 30 seconds; null on the server so nothing time-dependent is baked into the HTML. */
export function useNow() {
  return useSyncExternalStore(subscribeClock, clockNow, () => null);
}

function zoneLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

export function callTimes(startsAt: string, durationMinutes: number, zone: string | null) {
  const timeZone = zone ?? "UTC";
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * MINUTE);
  const time = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
  return {
    day: start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }),
    shortDay: start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone }),
    range: `${time(start)} to ${time(end)}`,
    zone: zoneLabel(start, timeZone),
  };
}

/** Date and time of a call in the member's own time zone. */
export function CallWhen({ startsAt, durationMinutes, size = "lg" }: { startsAt: string; durationMinutes: number; size?: "lg" | "sm" }) {
  const zone = useTimeZone();
  const when = callTimes(startsAt, durationMinutes, zone);
  if (size === "sm") {
    return (
      <span className="tabular-nums">
        {when.shortDay}, {when.range} {when.zone}
      </span>
    );
  }
  return (
    <div>
      <p className="text-[17px] font-semibold text-ink">{when.day}</p>
      <p className="mt-0.5 text-[15.5px] text-mid tabular-nums">
        {when.range} <span className="font-semibold text-ink">{when.zone}</span>
      </p>
      <p className="mt-1 text-[13px] text-dim">{zone ? `Shown in your time zone (${zone.replace(/_/g, " ")}).` : "Times in UTC."}</p>
    </div>
  );
}

const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

export function countdownLabel(startsAt: string, durationMinutes: number, now: number) {
  const start = Date.parse(startsAt);
  const end = start + durationMinutes * MINUTE;
  if (now >= end) return { live: false, text: "Finished" };
  if (now >= start) return { live: true, text: "Live now" };
  const minutes = Math.max(1, Math.round((start - now) / MINUTE));
  if (minutes < 60) return { live: false, text: `Starts ${relative.format(minutes, "minute")}` };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { live: false, text: `Starts ${relative.format(hours, "hour")}` };
  return { live: false, text: `Starts ${relative.format(Math.round(minutes / 1440), "day")}` };
}

export function Countdown({ startsAt, durationMinutes }: { startsAt: string; durationMinutes: number }) {
  const now = useNow();
  if (now === null) return null;
  const { live, text } = countdownLabel(startsAt, durationMinutes, now);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${live ? "bg-[#fdecea] text-[#b53a2f]" : "bg-blue-light text-blue"}`}
      aria-live="polite"
    >
      {live ? <Radio className="h-3 w-3" aria-hidden /> : <Clock className="h-3 w-3" aria-hidden />}
      {text}
    </span>
  );
}

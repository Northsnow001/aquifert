"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";
import { READ_SECONDS } from "@/lib/telex-reads/stats";

/** No scroll, pointer or key input for this long and the clock stops until the reader is back. */
const IDLE_MS = 60_000;
const HEARTBEAT_SECONDS = 30;
/** After a failed report, wait this long before the next try, doubling up to the heartbeat. */
const RETRY_SECONDS = 5;
const INPUT_EVENTS = ["scroll", "wheel", "pointermove", "pointerdown", "keydown", "touchstart"] as const;

/** Fired on window each active second until the read is saved, and once when it is. The TELEX guide listens. */
export const READING_EVENT = "aq:telex-reading";
export type ReadingDetail = { telexId: string; seconds: number; read: boolean };

const newVisitId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

/**
 * Wraps a flash's full story and reports how it is read: active seconds (tab visible, reader not idle)
 * and how far down the story they got. The desk sees it as a read once a visit reaches READ_SECONDS.
 * A report that fails is retried, so a slow or briefly unavailable server does not lose the read.
 */
export function TelexReadTracker({ telexId, children }: { telexId: string; children: React.ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  const visit = useRef<{ telexId: string; id: string } | null>(null);
  const [read, setRead] = useState(false);

  useEffect(() => {
    if (visit.current?.telexId !== telexId) visit.current = { telexId, id: newVisitId() };
    const visitId = visit.current.id;
    const url = `/hub/telex/${encodeURIComponent(telexId)}/read`;
    let seconds = 0;
    let depth = 0;
    let sentSeconds = -1;
    let sentDepth = -1;
    let lastInput = Date.now();
    let stopped = false;
    let saved = false;
    let failed = false;
    let retryIn = RETRY_SECONDS;
    let nextTry = 0;

    const announce = (done: boolean) => window.dispatchEvent(new CustomEvent<ReadingDetail>(READING_EVENT, { detail: { telexId, seconds, read: done } }));

    const measure = () => {
      const el = body.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const seen = rect.height > 0 ? ((window.innerHeight - rect.top) / rect.height) * 100 : 100;
      depth = Math.max(depth, Math.min(100, Math.max(0, Math.round(seen))));
    };

    const send = (leaving = false) => {
      if (stopped || (!failed && seconds === sentSeconds && depth === sentDepth)) return;
      sentSeconds = seconds;
      sentDepth = depth;
      const payload = JSON.stringify({ visit: visitId, seconds, depth });
      if (leaving && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
        return;
      }
      fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true })
        .then(async (response) => {
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            stopped = true;
            return;
          }
          if (!response.ok) throw new Error(String(response.status));
          failed = false;
          retryIn = RETRY_SECONDS;
          const result = (await response.json().catch(() => ({}))) as { read?: boolean };
          if (result.read && !saved) {
            saved = true;
            setRead(true);
            announce(true);
          }
        })
        .catch(() => {
          failed = true;
          nextTry = seconds + retryIn;
          retryIn = Math.min(HEARTBEAT_SECONDS, retryIn * 2);
        });
    };

    const onInput = () => {
      lastInput = Date.now();
      measure();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") send(true);
    };
    const onLeave = () => send(true);

    const timer = window.setInterval(() => {
      if (stopped || document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
      seconds += 1;
      if (!saved) announce(false);
      const due = failed
        ? seconds >= nextTry
        : !saved && seconds >= READ_SECONDS
          ? (seconds - READ_SECONDS) % RETRY_SECONDS === 0
          : seconds - Math.max(0, sentSeconds) >= HEARTBEAT_SECONDS;
      if (due) send();
    }, 1000);

    measure();
    send();
    INPUT_EVENTS.forEach((name) => document.addEventListener(name, onInput, { capture: true, passive: true }));
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.clearInterval(timer);
      INPUT_EVENTS.forEach((name) => document.removeEventListener(name, onInput, { capture: true }));
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
      send(true);
    };
  }, [telexId]);

  return (
    <div ref={body} data-telex-tracker={telexId}>
      {children}
      {read ? (
        <p role="status" className="aq-rise mt-4 inline-flex items-center gap-1.5 rounded-full bg-s2 px-2.5 py-1 text-[12.5px] font-semibold text-dim">
          <CheckCheck className="h-3.5 w-3.5 text-teal-700" aria-hidden /> Marked as read
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { READ_SECONDS } from "@/lib/telex-reads/stats";

/** No scroll, pointer or key input for this long and the clock stops until the reader is back. */
const IDLE_MS = 60_000;
const HEARTBEAT_SECONDS = 30;
const INPUT_EVENTS = ["scroll", "wheel", "pointermove", "pointerdown", "keydown", "touchstart"] as const;

const newVisitId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

/**
 * Wraps a flash's full story and reports how it is read: active seconds (tab visible, reader not idle)
 * and how far down the story they got. The desk sees it as a read once a visit reaches READ_SECONDS.
 */
export function TelexReadTracker({ telexId, children }: { telexId: string; children: React.ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  const visit = useRef<{ telexId: string; id: string } | null>(null);

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

    const measure = () => {
      const el = body.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const seen = rect.height > 0 ? ((window.innerHeight - rect.top) / rect.height) * 100 : 100;
      depth = Math.max(depth, Math.min(100, Math.max(0, Math.round(seen))));
    };

    const send = (leaving = false) => {
      if (stopped || (seconds === sentSeconds && depth === sentDepth)) return;
      sentSeconds = seconds;
      sentDepth = depth;
      const payload = JSON.stringify({ visit: visitId, seconds, depth });
      if (leaving && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
        return;
      }
      fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true })
        .then((response) => {
          if (response.status === 401 || response.status === 404 || response.status === 503) stopped = true;
        })
        .catch(() => undefined);
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
      if (document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
      seconds += 1;
      if (seconds === READ_SECONDS || seconds - Math.max(0, sentSeconds) >= HEARTBEAT_SECONDS) send();
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

  return <div ref={body}>{children}</div>;
}

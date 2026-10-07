"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, LogOut } from "lucide-react";
import { HEARTBEAT_MS, IDLE_LIMIT_MS, IDLE_WARN_MS, REAUTH_EMAIL_KEY, REAUTH_PATH } from "@/lib/idle-timeout";

/** Shared by every open tab, so activity in one keeps the others alive. */
const LAST_ACTIVE_KEY = "aq.lastActive";
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

const minutesAndSeconds = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Ends the session after 15 minutes without activity, warning at 13. Once the warning shows, only
 * "Stay signed in" (or activity in another tab) keeps the session; a stray mouse movement does not.
 */
export function IdleTimeout({ email }: { email: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const memory = useRef(0);
  const lastWrite = useRef(0);
  const lastBeat = useRef(0);
  const unsent = useRef(false);
  const warning = useRef(false);
  const ending = useRef(false);
  const stayButton = useRef<HTMLButtonElement>(null);

  const readLast = useCallback(() => {
    try {
      const shared = Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0;
      // A time ahead of the clock (after a clock correction) would postpone the timeout indefinitely.
      return Math.max(memory.current, shared > Date.now() ? 0 : shared);
    } catch {
      return memory.current;
    }
  }, []);

  const markActive = useCallback(() => {
    const now = Date.now();
    memory.current = now;
    unsent.current = true;
    if (now - lastWrite.current < 1000) return;
    lastWrite.current = now;
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    } catch {
      // Private browsing can refuse storage; this tab still tracks itself.
    }
  }, []);

  const expire = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    try {
      sessionStorage.setItem(REAUTH_EMAIL_KEY, email);
    } catch {
      // The re-auth page asks for the email when it cannot be carried over.
    }
    await fetch("/api/session/timeout", { method: "POST" }).catch(() => undefined);
    const back = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`${REAUTH_PATH}?redirect_to=${encodeURIComponent(back)}`);
  }, [email]);

  const heartbeat = useCallback(() => {
    unsent.current = false;
    lastBeat.current = Date.now();
    fetch("/api/session/activity", { method: "POST" })
      .then((res) => {
        if (res.status === 401) void expire();
      })
      .catch(() => undefined);
  }, [expire]);

  const tick = useCallback(() => {
    if (ending.current) return;
    const idle = Date.now() - readLast();
    if (idle >= IDLE_LIMIT_MS) {
      void expire();
      return;
    }
    if (idle >= IDLE_WARN_MS) {
      warning.current = true;
      setRemaining(IDLE_LIMIT_MS - idle);
    } else if (warning.current) {
      warning.current = false;
      setRemaining(null);
    }
    if (unsent.current && Date.now() - lastBeat.current >= HEARTBEAT_MS) heartbeat();
  }, [expire, heartbeat, readLast]);

  useEffect(() => {
    markActive();
    const onActivity = () => {
      if (!warning.current && !ending.current) markActive();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    ACTIVITY_EVENTS.forEach((name) => document.addEventListener(name, onActivity, { capture: true, passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(tick, 1000);
    return () => {
      ACTIVITY_EVENTS.forEach((name) => document.removeEventListener(name, onActivity, { capture: true }));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [markActive, tick]);

  const open = remaining !== null;
  useEffect(() => {
    if (open) stayButton.current?.focus();
  }, [open]);

  const stay = () => {
    warning.current = false;
    setRemaining(null);
    markActive();
    heartbeat();
  };

  if (!open) return null;
  return createPortal(
    <div className="aq-app fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-body">
      <div className="aq-backdrop absolute inset-0 bg-[#0b1e2d]/55 backdrop-blur-[2px]" aria-hidden />
      <div className="aq-sheet aq-safe-bottom relative w-full max-w-[420px] rounded-t-[22px] bg-white p-6 shadow-2xl sm:rounded-[22px]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-light text-blue">
          <Clock className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="idle-title" className="mt-4 text-[19px] font-bold text-ink">
          Are you still there?
        </h2>
        <p id="idle-body" className="mt-1.5 text-[14.5px] leading-relaxed text-mid">
          For your security, you will be signed out after 15 minutes without activity. You will need your password to continue.
        </p>
        <p className="mt-4 rounded-xl bg-s2 px-4 py-3 text-[14px] text-mid">
          Signing out in{" "}
          <span className="font-mono text-[17px] font-bold tabular-nums text-ink" translate="no">
            {minutesAndSeconds(remaining)}
          </span>
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[14.5px] font-semibold text-mid transition hover:bg-s2 hover:text-ink sm:w-auto"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Sign out now
            </button>
          </form>
          <button
            ref={stayButton}
            type="button"
            onClick={stay}
            className="inline-flex h-11 items-center justify-center rounded-full bg-blue px-5 text-[14.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgb(47_111_179/0.7)] transition hover:bg-blue-dim"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

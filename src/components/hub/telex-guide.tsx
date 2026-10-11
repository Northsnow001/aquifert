"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { CheckCheck, CirclePlay } from "lucide-react";
import { btnSecondary } from "@/components/app/form";
import { TOUR_END_EVENT, tourSettled } from "@/components/app/tour";
import { READING_EVENT, type ReadingDetail } from "@/components/hub/telex-read-tracker";
import { READ_SECONDS } from "@/lib/telex-reads/stats";

const START_EVENT = "aq:telex-guide";
const CARD = 320;

type Status = "running" | "done" | "skipped";
type Stage = "open" | "pick" | "stay";

export function startTelexGuide() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** Restarts the guide from the TELEX page header. */
export function TelexGuideButton() {
  return (
    <button type="button" onClick={startTelexGuide} className={btnSecondary}>
      <CirclePlay className="h-4 w-4" /> How to read
    </button>
  );
}

function load(key: string): Status | null {
  try {
    const value = localStorage.getItem(key);
    return value === "running" || value === "done" || value === "skipped" ? value : null;
  } catch {
    return null;
  }
}

function store(key: string, value: Status) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the guide may show again next visit.
  }
}

function anchorFor(key: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)).find((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function stageFor(pathname: string): Stage {
  if (pathname === "/hub/telex") return "pick";
  return /^\/hub\/telex\/[^/]+$/.test(pathname) ? "stay" : "open";
}

const ANCHOR: Record<Stage, string | null> = { open: "telex", pick: "telex-read", stay: null };

/**
 * A three-step guide to reading TELEX, shown once to each member after the menu tour: open TELEX, open a
 * flash, stay for READ_SECONDS while the read is counted. It follows the member across pages and never
 * blocks the page, so they press the real menu item and headline themselves.
 */
export function TelexGuide({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const key = `aq.telex-guide.v1.${userId}`;
  const [running, setRunning] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState<{ seconds: number; read: boolean }>({ seconds: 0, read: false });
  const [tracked, setTracked] = useState(false);
  const stage = stageFor(pathname);

  const begin = useCallback(() => {
    store(key, "running");
    setRunning(true);
  }, [key]);

  const end = useCallback(
    (status: "done" | "skipped") => {
      store(key, status);
      setRunning(false);
    },
    [key],
  );

  useEffect(() => {
    const status = load(key);
    let timer: number | undefined;
    if (status === "running") timer = window.setTimeout(() => setRunning(true), 0);
    else if (!status && tourSettled(userId)) timer = window.setTimeout(begin, 1200);
    const afterTour = () => {
      if (!load(key)) window.setTimeout(begin, 700);
    };
    window.addEventListener(TOUR_END_EVENT, afterTour);
    window.addEventListener(START_EVENT, begin);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(TOUR_END_EVENT, afterTour);
      window.removeEventListener(START_EVENT, begin);
    };
  }, [key, userId, begin]);

  useEffect(() => {
    const onReading = (event: Event) => {
      const detail = (event as CustomEvent<ReadingDetail>).detail;
      setReading({ seconds: detail.seconds, read: detail.read });
    };
    window.addEventListener(READING_EVENT, onReading);
    return () => window.removeEventListener(READING_EVENT, onReading);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setReading({ seconds: 0, read: false });
      setTracked(Boolean(document.querySelector("[data-telex-tracker]")));
      const anchor = ANCHOR[stage];
      if (anchor) anchorFor(anchor)?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      setReady(true);
    }, 500);
    return () => {
      window.clearTimeout(timer);
      setReady(false);
    };
  }, [running, stage, pathname]);

  useEffect(() => {
    if (!running || !ready) return;
    const anchor = ANCHOR[stage];
    const measure = () => {
      const node = anchor ? anchorFor(anchor) : undefined;
      setRect(node ? node.getBoundingClientRect() : null);
    };
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && end("skipped");
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [running, ready, stage, end]);

  if (!running || !ready || typeof document === "undefined") return null;

  const step = stage === "open" ? 1 : stage === "pick" ? 2 : 3;
  let title: string;
  let body: string;
  let action: { label: string; run: () => void } | null = null;

  if (stage === "open") {
    title = "Read today's TELEX";
    body = "The desk's latest market flashes live in TELEX: tenders, price moves, plant news and freight. Open it to see what is moving.";
    action = { label: "Open TELEX", run: () => router.push("/hub/telex") };
  } else if (stage === "pick") {
    const target = anchorFor("telex-read");
    title = target ? "Open a flash" : "Nothing to open yet";
    body = target
      ? "Press a headline, or Read more under it, to open the full story."
      : "There are no flashes on your plan in this view. Clear the filters, or come back when the desk files the next one.";
    const href = target?.getAttribute("href");
    action = href ? { label: "Open this one", run: () => router.push(href) } : { label: "Done", run: () => end("done") };
  } else if (!tracked) {
    title = "This flash is on a higher plan";
    body = "Go back to the feed and open a flash without a lock to read it in full.";
    action = { label: "Back to TELEX", run: () => router.push("/hub/telex") };
  } else if (reading.read) {
    title = "Marked as read";
    body = "That is all it takes. Flashes you have read show a Read tick in the feed, so you can see what is new at a glance.";
    action = { label: "Done", run: () => end("done") };
  } else {
    title = `Stay for ${READ_SECONDS} seconds`;
    body = `Read on. After ${READ_SECONDS} seconds on the story the flash counts as read for you.`;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let style: React.CSSProperties;
  if (rect) {
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD / 2), vw - CARD - 12);
    style = rect.top > vh / 2 ? { left, bottom: vh - rect.top + 14 } : { left, top: rect.bottom + 14 };
  } else {
    style = { right: 16, bottom: vw < 1024 ? 96 : 24 };
  }
  const progress = Math.min(1, reading.seconds / READ_SECONDS);

  return createPortal(
    <div className="aq-app pointer-events-none fixed inset-0 z-[85]">
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-[#5fa88a] transition-all duration-300"
          style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10, boxShadow: "0 0 0 9999px rgb(11 30 45 / 0.35)" }}
        />
      ) : null}
      <div
        key={`${stage}-${reading.read}`}
        role="dialog"
        aria-label={`TELEX guide, step ${step} of 3: ${title}`}
        className="aq-drop aq-float pointer-events-auto absolute rounded-2xl bg-white p-4"
        style={{ ...style, width: `min(${CARD}px, calc(100vw - 24px))` }}
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-[12px] font-semibold text-dim">TELEX guide · {step} of 3</p>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#d5dde6]" aria-hidden>
            <div className="h-full rounded-full bg-blue transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>
        <h3 className="mt-1.5 flex items-center gap-1.5 text-[17px] font-semibold text-ink">
          {stage === "stay" && reading.read ? <CheckCheck className="h-4 w-4 text-teal-700" aria-hidden /> : null}
          {title}
        </h3>
        <p className="mt-1 text-[15px] leading-relaxed text-mid">{body}</p>
        {stage === "stay" && tracked && !reading.read ? (
          <div className="mt-3" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-s2">
              <div className="h-full rounded-full bg-teal-600 transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-1 font-mono text-[12px] text-dim">
              {reading.seconds >= READ_SECONDS ? "Saving your read…" : `${Math.max(0, READ_SECONDS - reading.seconds)}s to go`}
            </p>
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-2">
          {action ? (
            <button type="button" autoFocus onClick={action.run} className="h-9 rounded-full bg-blue px-4 text-[14.5px] font-semibold text-white hover:bg-blue-dim">
              {action.label}
            </button>
          ) : null}
          <button type="button" onClick={() => end("skipped")} className="ml-auto h-9 rounded-full px-3 text-[14.5px] font-semibold text-mid hover:bg-s3">
            {stage === "stay" && reading.read ? "Close" : "Skip"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

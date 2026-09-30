"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { TOUR_STOPS } from "@/components/hub/nav";

const KEY = "aq.tour.v1";
const CARD = 320;

type Saved = { status: "done" | "skipped" | "running"; step: number; offered?: boolean };

function read(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(value: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Private mode: the tour simply runs again next visit.
  }
}

function anchorFor(key: string) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`));
  return nodes.find((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function startTour() {
  window.dispatchEvent(new Event("aq:tour"));
}

/** First-run coach marks on the real menu items. Skippable, keyboard operable, resumable once, restartable from the guide. */
export function Tour() {
  const pathname = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [resume, setResume] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const total = TOUR_STOPS.length;

  useEffect(() => {
    const restart = () => {
      setResume(null);
      setStep(0);
      save({ status: "running", step: 0, offered: true });
    };
    window.addEventListener("aq:tour", restart);
    return () => window.removeEventListener("aq:tour", restart);
  }, []);

  useEffect(() => {
    if (pathname !== "/hub") return;
    const saved = read();
    const timer = setTimeout(() => {
      if (!saved) {
        setStep(0);
        save({ status: "running", step: 0 });
      } else if (saved.status === "running" && saved.step > 0 && !saved.offered) {
        setResume(saved.step);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  const measure = useCallback(() => {
    if (step === null) return;
    const node = anchorFor(TOUR_STOPS[step].key);
    setRect(node ? node.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    anchorFor(TOUR_STOPS[step].key)?.scrollIntoView({ block: "nearest" });
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  const finish = useCallback(
    (status: "done" | "skipped") => {
      save({ status, step: step ?? 0, offered: true });
      setStep(null);
    },
    [step],
  );

  const go = useCallback(
    (next: number) => {
      if (next >= total) return finish("done");
      if (next < 0) return;
      setStep(next);
      save({ status: "running", step: next });
    },
    [finish, total],
  );

  useEffect(() => {
    if (step === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish("skipped");
      if (event.key === "ArrowRight") go(step + 1);
      if (event.key === "ArrowLeft") go(step - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, go, finish]);

  if (typeof document === "undefined") return null;

  if (step === null) {
    if (resume === null) return null;
    return createPortal(
      <div className="aq-app">
        <div role="dialog" aria-label="Resume tour" className="aq-rise aq-float fixed bottom-24 right-4 z-[90] w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-4 lg:bottom-6 lg:right-6">
          <p className="text-[14px] font-semibold text-ink">Pick up the tour where you left off?</p>
          <p className="mt-1 text-[13px] text-mid">
            You stopped at step {resume + 1} of {total}.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="h-9 rounded-full bg-blue px-4 text-[13px] font-semibold text-white"
              onClick={() => {
                setStep(resume);
                setResume(null);
                save({ status: "running", step: resume, offered: true });
              }}
            >
              Resume
            </button>
            <button
              type="button"
              className="h-9 rounded-full px-4 text-[13px] font-semibold text-mid hover:bg-s3"
              onClick={() => {
                save({ status: "skipped", step: resume, offered: true });
                setResume(null);
              }}
            >
              No thanks
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const stop = TOUR_STOPS[step];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let style: React.CSSProperties;
  if (!rect) {
    style = { left: Math.max(16, (vw - CARD) / 2), top: Math.max(16, vh / 2 - 100) };
  } else if (rect.right + 16 + CARD <= vw - 12) {
    style = { left: rect.right + 16, top: Math.min(Math.max(12, rect.top - 12), vh - 200) };
  } else if (rect.top > vh / 2) {
    style = { left: Math.min(Math.max(12, rect.left + rect.width / 2 - CARD / 2), vw - CARD - 12), bottom: vh - rect.top + 14 };
  } else {
    style = { left: Math.min(Math.max(12, rect.left), vw - CARD - 12), top: rect.bottom + 14 };
  }

  return createPortal(
    <div className="aq-app fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={`Tour step ${step + 1} of ${total}: ${stop.title}`}>
      <button type="button" aria-label="Skip tour" className="absolute inset-0 cursor-default" onClick={() => finish("skipped")} />
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-[#5fa88a] transition-all duration-300"
          style={{
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10,
            boxShadow: "0 0 0 9999px rgb(11 30 45 / 0.45)",
          }}
        />
      ) : (
        <div className="aq-backdrop pointer-events-none absolute inset-0 bg-[#0b1e2d]/45" />
      )}
      <div key={step} className="aq-drop aq-float absolute rounded-2xl bg-white p-4" style={{ ...style, width: `min(${CARD}px, calc(100vw - 24px))` }}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-semibold text-dim">
            {step + 1} of {total}
          </p>
          <div className="flex gap-1" aria-hidden>
            {TOUR_STOPS.map((item, index) => (
              <span key={item.key} className={`h-1.5 rounded-full transition-all ${index === step ? "w-4 bg-blue" : "w-1.5 bg-[#d5dde6]"}`} />
            ))}
          </div>
        </div>
        <h3 className="mt-1.5 text-[16px] font-semibold text-ink">{stop.title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mid">{stop.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" autoFocus onClick={() => go(step + 1)} className="h-9 rounded-full bg-blue px-4 text-[13px] font-semibold text-white hover:bg-blue-dim">
            {step + 1 === total ? "Finish" : "Next"}
          </button>
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="h-9 rounded-full border border-border px-4 text-[13px] font-semibold text-ink disabled:opacity-40"
          >
            Back
          </button>
          <button type="button" onClick={() => finish("skipped")} className="ml-auto h-9 rounded-full px-3 text-[13px] font-semibold text-mid hover:bg-s3">
            Skip
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

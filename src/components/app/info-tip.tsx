"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";

const WIDTH = 300;

/**
 * (i) affordance with the feature explained in plain words. Opens after a short hover,
 * instantly on focus or tap, stays open while the pointer is on it, and becomes a
 * bottom sheet on phones.
 */
export function InfoTip({ label, text, href = "/hub/guide", className = "" }: { label: string; text: string; href?: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [phone, setPhone] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setPhone(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = button.current?.getBoundingClientRect();
      if (!rect) return;
      const right = rect.right + 12;
      const left = right + WIDTH <= window.innerWidth - 8 ? right : Math.max(8, rect.left - 12 - WIDTH);
      setPos({ top: Math.min(Math.max(rect.top + rect.height / 2, 90), window.innerHeight - 90), left });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const later = (value: boolean, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(value), ms);
  };

  const body = (
    <>
      <p className="text-[15px] leading-relaxed text-ink">{text}</p>
      <Link href={href} onClick={() => setOpen(false)} className="mt-2 inline-block text-[14.5px] font-semibold text-blue no-underline hover:underline">
        Learn more
      </Link>
    </>
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={open && !phone ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => !phone && later(true, 150)}
        onMouseLeave={() => !phone && later(false, 140)}
        onFocus={() => !phone && setOpen(true)}
        onBlur={() => !phone && later(false, 140)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={`aq-nopress inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-dim transition hover:bg-white hover:text-blue ${className}`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="aq-app">
              {phone ? (
                <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={label}>
                  <button type="button" aria-label="Close" className="aq-backdrop absolute inset-0 bg-[#0b1e2d]/40" onClick={() => setOpen(false)} />
                  <div className="aq-sheet aq-safe-bottom absolute inset-x-0 bottom-0 rounded-t-[22px] bg-white px-5 pt-3 shadow-2xl">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d5dde6]" />
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[17px] font-semibold text-ink">{label}</h2>
                      <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full bg-s3 p-1.5 text-mid">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 pb-5">{body}</div>
                  </div>
                </div>
              ) : pos ? (
                <div
                  id={id}
                  role="tooltip"
                  onMouseEnter={() => later(true, 0)}
                  onMouseLeave={() => later(false, 140)}
                  className="aq-drop aq-float fixed z-[95] -translate-y-1/2 rounded-2xl border border-border bg-white p-4"
                  style={{ top: pos.top, left: pos.left, width: WIDTH }}
                >
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">{label}</p>
                  {body}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

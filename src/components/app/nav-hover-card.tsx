"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";

const WIDTH = 300;

/**
 * Wraps a sidebar row and opens a card beside it while the pointer or focus is on the row.
 * Touch screens never see the card, so the row itself must still make sense on its own.
 */
export function NavHoverCard({
  label,
  headline,
  line,
  href,
  cta,
  children,
}: {
  label: string;
  headline: string;
  line?: string;
  href: string;
  cta: string;
  children: ReactNode;
}) {
  const id = useId();
  const row = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (min-width: 768px)");
    const apply = () => setCanHover(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = row.current?.getBoundingClientRect();
      if (!rect) return;
      const edge = row.current?.closest("aside, nav")?.getBoundingClientRect().right ?? rect.right;
      const right = Math.max(edge, rect.right) + 12;
      const left = right + WIDTH <= window.innerWidth - 8 ? right : Math.max(8, rect.left - 12 - WIDTH);
      setPos({ top: Math.min(Math.max(rect.top + rect.height / 2, 110), window.innerHeight - 110), left });
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

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const later = (value: boolean, ms: number) => {
    if (!canHover) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(value), ms);
  };

  return (
    <div
      ref={row}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => later(true, 120)}
      onMouseLeave={() => later(false, 140)}
      onFocus={() => later(true, 0)}
      onBlur={() => later(false, 140)}
      onClick={() => setOpen(false)}
    >
      {children}
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div className="aq-app">
              <div
                id={id}
                role="tooltip"
                onMouseEnter={() => later(true, 0)}
                onMouseLeave={() => later(false, 140)}
                className="aq-drop aq-float fixed z-[95] -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-white"
                style={{ top: pos.top, left: pos.left, width: WIDTH }}
              >
                <div className="h-1 bg-gradient-to-r from-teal-500 via-blue to-teal-700" aria-hidden />
                <div className="p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">{label}</p>
                  <p className="mt-1.5 text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink">{headline}</p>
                  {line ? <p className="mt-1 text-[15px] leading-relaxed text-mid">{line}</p> : null}
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="group/cta mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-blue no-underline hover:underline"
                  >
                    {cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

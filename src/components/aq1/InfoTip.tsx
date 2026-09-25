import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router";

type Pos = { top: number; left: number; placeAbove: boolean };

/**
 * AQ1 info tip: always-visible (i) affordance.
 * Desktop: portaled popover (escapes sidebar overflow) with title + body.
 * Mobile: bottom sheet with the same content.
 */
export function InfoTip({
  label,
  text,
  learnMore = "/account/user-guide",
}: {
  label: string;
  text: string;
  learnMore?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const placeTip = () => {
    const btn = wrapRef.current?.querySelector("button");
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const tipW = 340;
    const gap = 10;
    const margin = 12;

    let left = r.right + gap;
    if (left + tipW > window.innerWidth - margin) {
      left = Math.max(margin, r.left - tipW - gap);
    }

    // Prefer aligning near the trigger; flip above if near bottom of viewport.
    const estimatedH = 160;
    const placeAbove = r.bottom + estimatedH > window.innerHeight - margin && r.top > estimatedH;
    const top = placeAbove ? r.top : r.bottom + 6;

    setPos({ top, left, placeAbove });
  };

  useLayoutEffect(() => {
    if (!open || isMobile) {
      setPos(null);
      return;
    }
    placeTip();
    const onMove = () => placeTip();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, isMobile]);

  const openNow = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(true);
  };
  const openDelayed = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 120);
  };
  const closeDelayed = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const body = (
    <>
      <p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-200">{text}</p>
      <Link
        to={learnMore}
        className="mt-3 inline-flex text-[13px] font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
        onClick={() => setOpen(false)}
      >
        Learn more →
      </Link>
    </>
  );

  const desktopTip =
    !isMobile && open && pos
      ? createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            id={id}
            onMouseEnter={openNow}
            onMouseLeave={closeDelayed}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: pos.placeAbove ? "translateY(-100%)" : undefined,
              zIndex: 9999,
            }}
            className="w-[min(340px,calc(100vw-24px))] rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-8px_rgb(15_23_42/0.35),0_4px_12px_-4px_rgb(15_23_42/0.18)] ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_12px_40px_-8px_rgb(0_0_0/0.65)] dark:ring-white/10"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-700 dark:text-teal-300">
                {label}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            {body}
          </div>,
          document.body,
        )
      : null;

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={openDelayed}
      onMouseLeave={closeDelayed}
    >
      <button
        type="button"
        aria-label={`About: ${label}`}
        aria-describedby={open && !isMobile ? id : undefined}
        aria-expanded={open}
        onFocus={openNow}
        onBlur={() => {
          // Keep open if focus moved into the portaled tip.
          requestAnimationFrame(() => {
            if (!tipRef.current?.contains(document.activeElement) && document.activeElement !== wrapRef.current?.querySelector("button")) {
              setOpen(false);
            }
          });
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600 ${
          open
            ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        }`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {desktopTip}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="pr-6 text-left">{label}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-8 pt-1">{body}</div>
          </SheetContent>
        </Sheet>
      )}
    </span>
  );
}

export function InfoTipInline(props: { label: string; children: ReactNode }) {
  return <InfoTip label={props.label} text={String(props.children)} />;
}

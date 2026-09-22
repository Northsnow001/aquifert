import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router";

/**
 * AQ1 reusable tooltip (brief Section 5): always-visible (i) affordance,
 * hover after 150ms, instant on keyboard focus, stays open when the pointer
 * moves onto the tooltip, Escape/click-away close, 280–360px wide, 14px body,
 * aria-describedby linkage, mobile bottom sheet with the same content.
 * The only interactive element inside is the "Learn more" link.
 */
export function InfoTip({ label, text, learnMore = "/account/user-guide" }: { label: string; text: string; learnMore?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open, isMobile]);

  const openNow = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setOpen(true); };
  const openDelayed = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(true), 150); };
  const closeDelayed = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(false), 120); };

  const body = (
    <>
      <p className="text-sm leading-relaxed text-foreground">{text}</p>
      <Link to={learnMore} className="mt-2 inline-block text-sm font-medium text-teal-700 underline underline-offset-2 dark:text-teal-300" onClick={() => setOpen(false)}>
        Learn more
      </Link>
    </>
  );

  return (
    <span ref={wrapRef} className="relative inline-flex" onMouseEnter={openDelayed} onMouseLeave={closeDelayed}>
      <button
        type="button"
        aria-label={`About: ${label}`}
        aria-describedby={open && !isMobile ? id : undefined}
        aria-expanded={open}
        onFocus={openNow}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-teal-600"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {!isMobile && open && (
        <span
          role="tooltip"
          id={id}
          onMouseEnter={openNow}
          onMouseLeave={closeDelayed}
          className="absolute left-6 top-1/2 z-50 block w-[320px] min-w-[280px] max-w-[360px] -translate-y-1/2 rounded-lg border border-border bg-popover p-3 text-sm shadow-lg"
        >
          {body}
        </span>
      )}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between pr-6">{label}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{body}</div>
          </SheetContent>
        </Sheet>
      )}
    </span>
  );
}

export function InfoTipInline(props: { label: string; children: ReactNode }) {
  return <InfoTip label={props.label} text={String(props.children)} />;
}

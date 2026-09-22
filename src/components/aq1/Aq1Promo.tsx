import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { X } from "lucide-react";
import { PROMOS } from "@contracts/aq1";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

/**
 * Rotating promotional prompts (brief Section 4). Server enforces 48-hour
 * spacing, strict A→B→C rotation, dismissal/click suppression and AQ0
 * exclusion. Client adds: never during the first session, max one per
 * session, never while the tour or a generation/calculation is running,
 * bottom-right slide-in (no slide under prefers-reduced-motion), X/Escape.
 */
export function Aq1Promo() {
  const { data: cfg } = trpc.aq1.config.useQuery(undefined, { staleTime: 60_000 });
  const { data: tour } = trpc.aq1.tourGet.useQuery(undefined, { staleTime: 10_000 });
  const { data: next } = trpc.aq1.promoNext.useQuery(undefined, { staleTime: 30_000, enabled: cfg?.enabled !== false });
  const record = trpc.aq1.promoRecord.useMutation();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const eligible = (() => {
    if (!next?.promo) return false;
    if (tour && tour.status === "in_progress") return false; // never during the tour
    if (typeof window !== "undefined" && (window as unknown as { __aqBusy?: boolean }).__aqBusy) return false; // report/calculation running
    const sessions = Number(localStorage.getItem("aq_sessions") ?? "0");
    if (sessions <= 1) return false; // never during the first session
    if (sessionStorage.getItem("aq_promo_shown")) return false; // max one per session
    return true;
  })();

  useEffect(() => {
    // count sessions once per browser session
    if (!sessionStorage.getItem("aq_session_counted")) {
      sessionStorage.setItem("aq_session_counted", "1");
      localStorage.setItem("aq_sessions", String(Number(localStorage.getItem("aq_sessions") ?? "0") + 1));
    }
  }, []);

  useEffect(() => {
    if (eligible && !shownRef.current && next?.promo) {
      shownRef.current = true;
      sessionStorage.setItem("aq_promo_shown", "1");
      record.mutate({ promoKey: next.promo, action: "shown" });
      const t = setTimeout(() => setVisible(true), 4000); // let the page settle first
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, next?.promo]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible || !next?.promo) return null;
  const promo = PROMOS[next.promo];
  const dismiss = () => { setVisible(false); record.mutate({ promoKey: next.promo!, action: "dismissed" }); };

  return createPortal(
    <div
      role="complementary"
      aria-label={`Suggestion: ${promo.title}`}
      className={`fixed bottom-6 right-6 z-[60] w-[min(92vw,360px)] rounded-xl border border-border bg-popover p-4 shadow-xl ${reduced ? "" : "aq1-slide-in"}`}
    >
      <button type="button" aria-label="Dismiss" onClick={dismiss}
        className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="pr-8 text-sm font-semibold">{promo.title}</p>
      <p className="mt-1 pr-6 text-sm text-muted-foreground">{promo.body}</p>
      <Button asChild size="sm" className="mt-3">
        <Link to={promo.to} onClick={() => { setVisible(false); record.mutate({ promoKey: next.promo!, action: "clicked" }); }}>
          {promo.cta}
        </Link>
      </Button>
    </div>, document.body);
}

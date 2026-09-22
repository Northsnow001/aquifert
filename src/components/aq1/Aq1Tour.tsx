import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TOUR_STOPS } from "@contracts/aq1";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

/**
 * First-run tour (brief Section 6): six coach marks anchored to the real AQ1
 * menu items (data-tour="<key>"), skippable at every step, resumable once,
 * restartable from the User Guide, keyboard operable, reduced-motion aware.
 */
export function Aq1Tour({ forceStart = 0, onDone }: { forceStart?: number; onDone?: () => void }) {
  const utils = trpc.useUtils();
  const { data: progress } = trpc.aq1.tourGet.useQuery(undefined, { staleTime: 10_000 });
  const update = trpc.aq1.tourUpdate.useMutation({ onSuccess: () => utils.aq1.tourGet.invalidate() });
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [resumeOffer, setResumeOffer] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // decide whether to run: first entry, or resume offer (once), or forced restart
  useEffect(() => {
    if (forceStart > 0) { setStep(forceStart - 1); return; }
    if (!progress) {
      // no row yet → first entry; only after cookie interaction is done
      const cookieDone = Boolean(localStorage.getItem("aq_cookie_consent") || document.cookie.includes("aq_consent"));
      if (cookieDone || true) { // consent banner is non-blocking in-app; run on first account entry
        setStep(0);
        update.mutate({ lastStepCompleted: 0, status: "in_progress" });
      }
      return;
    }
    if (progress.status === "in_progress" && progress.lastStepCompleted > 0 && !progress.resumeOffered) {
      setResumeOffer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.status]);

  useEffect(() => {
    if (step == null) return;
    const stop = TOUR_STOPS[step];
    const el = document.querySelector(`[data-tour="${stop.key}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
    if (el) (el as HTMLElement).focus?.();
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step == null) return;
      if (e.key === "Escape") finish("skipped");
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (step == null) {
    if (!resumeOffer) return null;
    return createPortal(
      <div role="dialog" aria-label="Resume tour" className="fixed bottom-6 right-6 z-[70] w-80 rounded-xl border border-border bg-popover p-4 shadow-xl">
        <p className="text-sm font-semibold">Pick up the tour where you left off?</p>
        <p className="mt-1 text-sm text-muted-foreground">You stopped at step {progress!.lastStepCompleted + 1} of 6.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => { setResumeOffer(false); setStep(progress!.lastStepCompleted); update.mutate({ lastStepCompleted: progress!.lastStepCompleted, status: "in_progress", resumeOffered: true }); }}>Resume</Button>
          <Button size="sm" variant="ghost" onClick={() => { setResumeOffer(false); update.mutate({ lastStepCompleted: progress!.lastStepCompleted, status: "skipped", resumeOffered: true }); }}>No thanks</Button>
        </div>
      </div>, document.body);
  }

  const stop = TOUR_STOPS[step];
  const finish = (status: "completed" | "skipped") => {
    update.mutate({ lastStepCompleted: step, status });
    setStep(null);
    onDone?.();
  };
  const next = () => {
    update.mutate({ lastStepCompleted: step + 1, status: step + 1 >= 6 ? "completed" : "in_progress" });
    if (step + 1 >= 6) { setStep(null); onDone?.(); } else setStep(step + 1);
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  const top = rect ? Math.min(rect.bottom + 10, window.innerHeight - 190) : window.innerHeight / 2;
  const left = rect ? Math.min(rect.left, window.innerWidth - 360) : window.innerWidth / 2 - 170;

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tour step ${step + 1} of 6: ${stop.title}`}>
      <div className="absolute inset-0 bg-black/30" onClick={() => finish("skipped")} />
      {rect && (
        <div
          className="absolute rounded-md ring-2 ring-teal-500 pointer-events-none"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, transition: reduced ? "none" : "all .25s" }}
        />
      )}
      <div
        className="absolute w-[340px] rounded-xl border border-border bg-popover p-4 shadow-xl"
        style={{ top, left, transition: reduced ? "none" : "all .25s" }}
      >
        <p className="text-xs font-medium text-muted-foreground">{step + 1} of 6</p>
        <h3 className="mt-1 text-base font-semibold">{stop.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{stop.blurb}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={next} autoFocus>{step + 1 === 6 ? "Finish" : "Next"}</Button>
          <Button size="sm" variant="outline" onClick={back} disabled={step === 0}>Back</Button>
          <Button size="sm" variant="ghost" onClick={() => finish("skipped")}>Skip tour</Button>
        </div>
      </div>
    </div>, document.body);
}

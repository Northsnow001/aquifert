import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { MEMBERSHIP_PLANS } from "@contracts/constants";
import { X, Check } from "lucide-react";
import { toast } from "sonner";

const SESSIONS_KEY = "aq.sessions";
const SESSION_MARK = "aq.session.counted";
const HUBTIME_KEY = "aq.hubtime";
const CALC_EVENT = "aq:calculation-complete";
const HUBTIME_THRESHOLD_S = 300; // 5 minutes cumulative
const SESSION_THRESHOLD = 3;

/** Bump the session counter once per browser session. */
function bumpSessionCount(): number {
  try {
    const n = Number(localStorage.getItem(SESSIONS_KEY) ?? "0") || 0;
    if (!sessionStorage.getItem(SESSION_MARK)) {
      sessionStorage.setItem(SESSION_MARK, "1");
      const next = n + 1;
      localStorage.setItem(SESSIONS_KEY, String(next));
      return next;
    }
    return n;
  } catch { return 1; }
}

function hubSeconds(): number {
  try { return Number(localStorage.getItem(HUBTIME_KEY) ?? "0") || 0; } catch { return 0; }
}

type Tab = "NEWSLETTER" | "MEMBERSHIP";

/**
 * The single in-account newsletter / membership prompt.
 * Fires on genuine engagement only (third session, a completed calculation
 * event, or five cumulative Hub minutes), never on login. Server-side
 * suppression: paid members, twice-dismissed, shown within 45 days.
 */
export function EngagementPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [triggered, setTriggered] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("NEWSLETTER");
  const state = trpc.engagement.promptState.useQuery(undefined, { enabled: triggered });
  const record = trpc.engagement.recordEvent.useMutation();
  const subscribe = trpc.engagement.subscribeNewsletter.useMutation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Trigger evaluation: session count on mount; cumulative visible time; calc events.
  useEffect(() => {
    if (bumpSessionCount() >= SESSION_THRESHOLD || hubSeconds() >= HUBTIME_THRESHOLD_S) {
      setTriggered(true);
    }
    const onCalc = () => setTriggered(true);
    window.addEventListener(CALC_EVENT, onCalc);
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const n = hubSeconds() + 5;
      try { localStorage.setItem(HUBTIME_KEY, String(n)); } catch { /* ignore */ }
      if (n >= HUBTIME_THRESHOLD_S) setTriggered(true);
    }, 5000);
    return () => { window.removeEventListener(CALC_EVENT, onCalc); clearInterval(t); };
  }, []);

  // Open only when the server says the user may see it.
  useEffect(() => {
    if (triggered && state.data?.eligible && !open) {
      setOpen(true);
      record.mutate({ event: "VIEW" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggered, state.data]);

  const dismiss = useCallback(() => {
    setOpen(false);
    record.mutate({ event: "DISMISS", tab });
  }, [record, tab]);

  // Focus trap + Esc + focus restore
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const dlg = dialogRef.current;
    const focusables = () =>
      Array.from(dlg?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])
        .filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); dismiss(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-900/60 p-4 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Stay ahead of the market, newsletter and membership"
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
      >
        {/* Header with tabs */}
        <div className="flex items-start justify-between border-b border-border px-5 pt-4">
          <div role="tablist" aria-label="Prompt sections" className="flex gap-4">
            {([
              ["NEWSLETTER", "Stay ahead of the market"],
              ["MEMBERSHIP", "Become a member"],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`border-b-2 pb-2 text-sm font-semibold ${
                  tab === key
                    ? "border-teal-600 text-navy-900 dark:text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={dismiss} aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {tab === "NEWSLETTER" ? (
          <NewsletterTab
            defaultEmail={user?.email ?? ""}
            pending={subscribe.isPending}
            onSubmit={(email, frequency) =>
              subscribe.mutate(
                { email, frequency, marketingOptIn: true },
                {
                  onSuccess: () => {
                    toast.success("You're subscribed. First edition lands on the next publish.");
                    setOpen(false);
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          />
        ) : (
          <MembershipTab
            onPrimary={() => { record.mutate({ event: "DISMISS", tab: "MEMBERSHIP" }); setOpen(false); navigate("/buyer/request"); }}
            onSecondary={() => { record.mutate({ event: "DISMISS", tab: "MEMBERSHIP" }); setOpen(false); window.location.href = "mailto:desk@aquifert.com"; }}
          />
        )}
      </div>
    </div>
  );
}

function NewsletterTab({
  defaultEmail, pending, onSubmit,
}: {
  defaultEmail: string;
  pending: boolean;
  onSubmit: (email: string, frequency: "DAILY" | "WEEKLY" | "MAJOR_MOVES") => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MAJOR_MOVES">("WEEKLY");
  const [consent, setConsent] = useState(false); // always unticked, never bundled
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr("Enter a valid work email."); return; }
        if (!consent) { setErr("Please tick the consent box so we can email you."); return; }
        setErr(null);
        onSubmit(email, frequency);
      }}
    >
      <ul className="space-y-2 text-sm text-muted-foreground">
        {["Weekly AQ VIEW, the desk's full market read",
          "Daily market indicator changes (N, P, K gauges)",
          "Corridor anomaly alerts from the freight desk"].map((li) => (
          <li key={li} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" /> {li}
          </li>
        ))}
      </ul>

      <div>
        <label htmlFor="ep-email" className="text-xs font-semibold text-foreground">Work email</label>
        <input
          id="ep-email" type="email" value={email} autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-foreground">How often?</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {([["DAILY", "Daily digest"], ["WEEKLY", "Weekly"], ["MAJOR_MOVES", "Major moves only"]] as const).map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
              frequency === v ? "border-navy-700 bg-navy-700 text-white" : "border-border text-muted-foreground"
            }`}>
              <input
                type="radio" name="ep-freq" value={v} checked={frequency === v}
                onChange={() => setFrequency(v)} className="sr-only"
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <span>
          I agree to receive Aquifert marketing emails at this address. This consent is separate
          from my account terms, is never bundled with any other action, and I can unsubscribe
          at any time.
        </span>
      </label>

      {err && <p role="alert" className="text-xs font-semibold text-red-600">{err}</p>}

      <button
        type="submit" disabled={pending}
        className="w-full rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {pending ? "Subscribing…" : "Subscribe"}
      </button>
    </form>
  );
}

const MEMBER_BENEFITS = [
  "Request a quote directly from the trading desk",
  "Verified supplier pricing with freight and duties passed through",
  "Full freight and landed-cost modelling with saved scenarios",
  "Aquibot AI assistant",
  "Premium research library",
];

function MembershipTab({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  return (
    <div className="space-y-4 px-5 py-5">
      <ul className="space-y-2 text-sm text-muted-foreground">
        {MEMBER_BENEFITS.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" /> {b}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Pricing is supplier cost plus pass-through freight and a stated fee, with the full
        document trail behind every trade.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {MEMBERSHIP_PLANS.map((p) => (
          <div key={p.tier} className="rounded-lg border border-border p-3 text-center">
            <p className="text-sm font-bold text-foreground">{p.name}</p>
            <p className="mt-0.5 font-mono text-sm tabular-nums text-navy-700 dark:text-navy-200">
              £{p.monthly.toLocaleString("en-GB")}<span className="text-[10px] text-muted-foreground">/mo</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{p.tonnage}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button" onClick={onPrimary}
          className="flex-1 rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Request a quote
        </button>
        <button
          type="button" onClick={onSecondary}
          className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Talk to the desk
        </button>
      </div>
    </div>
  );
}

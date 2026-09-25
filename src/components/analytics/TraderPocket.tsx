// AQUIFERT — PLANS PART 3 / 1.11 "Trader in your pocket".
// Floating Aquibot entry point: present on every screen, carries the current
// screen's context into the conversation, surfaces proactive opens when
// something material happens, one-tap call-the-desk. Capability-gated.
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { MessageCircle, Phone, X, ChevronRight, Radio } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const SCREEN_LABELS: Array<[RegExp, string]> = [
  [/^\/aq1\/urea/, "Urea Price Calculator"],
  [/^\/aq1\/dap/, "DAP Price Calculator"],
  [/^\/aq1\/potash/, "MOP Price Calculator"],
  [/^\/aq1\/complex/, "Complex Fertilisers"],
  [/^\/aq1\/nitrogen/, "Nitrogen Solutions"],
  [/^\/aq1\/fertiliser101/, "Fertiliser 101"],
  [/^\/aq1\/sulphuric/, "Acid Calculators"],
  [/^\/aq1\/library/, "Library"],
  [/^\/aq1\/sourcing/, "Sourcing"],
  [/^\/analytics\/telex/, "AQ TELEX"],
  [/^\/analytics\/market-data/, "Licensed Market Data"],
  [/^\/analytics\/signal/, "AQ Signal"],
  [/^\/analytics\/freight/, "Freight Analytics"],
  [/^\/analytics\/supply-demand/, "Supply & Demand"],
  [/^\/analytics\/newsletter/, "The Briefing"],
  [/^\/analytics\/alerts/, "Alerts & Brief"],
  [/^\/aq2\//, "AQ2 Market Intelligence"],
  [/^\/aq2\/routed-calculator/, "Routed Calculator"],
  [/^\/aq2\/aquibot/, "Aquibot"],
];

function screenLabel(pathname: string): string {
  for (const [re, label] of SCREEN_LABELS) if (re.test(pathname)) return label;
  return "Workspace";
}

export function TraderPocket() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

  const config = trpc.analytics.config.useQuery();
  const allowed = !!config.data?.capabilities["push.trader_in_pocket"]?.allowed;

  const proactive = trpc.aquibot.proactive.useQuery(undefined, {
    enabled: allowed,
    refetchInterval: 90_000,
  });

  if (!allowed) return null;

  const label = screenLabel(location.pathname);
  const items = proactive.data?.items ?? [];
  const fresh = items.filter((d) => !seenIds.has(d.id));

  const markSeen = () => setSeenIds(new Set(items.map((d) => d.id)));

  return (
    <>
      {/* Proactive opens — the trader's pocket speaks first when it matters */}
      {fresh.length > 0 && !open && (
        <div className="fixed inset-x-3 bottom-20 z-40 sm:left-auto sm:right-6 sm:w-96" role="status" aria-live="polite">
          <div className="rounded-2xl border border-steel/20 bg-white shadow-pop dark:border-white/10 dark:bg-navy-800">
            <div className="flex items-center justify-between border-b border-steel/10 px-4 py-2 dark:border-white/10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sage">
                <Radio className="h-3.5 w-3.5" aria-hidden /> Aquifer is watching
              </span>
              <button
                onClick={() => {
                  markSeen();
                  setOpen(true);
                }}
                className="text-[11px] font-semibold text-steel hover:underline"
              >
                Open
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto p-2">
              {fresh.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    markSeen();
                    setOpen(true);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-sand-100 dark:hover:bg-white/5"
                >
                  <p className="text-xs font-semibold text-navy-900 dark:text-sand-50">{d.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-navy-900/60 dark:text-sand-200/60">{d.body}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger — every screen, phone-first */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        {open ? (
          <div className="w-[min(92vw,22rem)] rounded-2xl border border-steel/20 bg-white shadow-pop dark:border-white/10 dark:bg-navy-800">
            <div className="flex items-center justify-between border-b border-steel/10 px-4 py-3 dark:border-white/10">
              <div>
                <p className="text-sm font-bold text-navy-900 dark:text-sand-50">Trader in your pocket</p>
                <p className="text-[11px] text-navy-900/50 dark:text-sand-200/50">
                  Context: <span className="font-semibold text-steel">{label}</span>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-navy-900/40 hover:bg-sand-100 dark:text-sand-200/40 dark:hover:bg-white/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 p-4">
              <p className="text-xs leading-relaxed text-navy-900/60 dark:text-sand-200/60">
                Ask anything — your question carries this screen's context with it, so answers start where you are.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Link to={`/aq2/aquibot?context=${encodeURIComponent(label)}`} onClick={() => setOpen(false)}>
                  <Button className="w-full gap-2">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Ask me anything
                    <ChevronRight className="ml-auto h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <a href="tel:+442079460000">
                  <Button variant="outline" className="w-full gap-2">
                    <Phone className="h-4 w-4" aria-hidden />
                    Call the desk
                  </Button>
                </a>
              </div>
              {items.length > 0 && (
                <div className="rounded-xl bg-sand-100 p-3 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-900/40 dark:text-sand-200/40">
                    Latest from your pocket
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-navy-900/70 dark:text-sand-200/70">{items[0]!.title}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full bg-steel text-white shadow-pop",
              "hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2"
            )}
            aria-label="Open Trader in your pocket"
          >
            <MessageCircle className="h-6 w-6" aria-hidden />
          </button>
        )}
      </div>
    </>
  );
}

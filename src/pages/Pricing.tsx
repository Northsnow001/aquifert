/**
 * PLANS PART 4 — public pricing page + in-account plan comparison.
 *
 * Every row is generated from the plans / plan_capabilities / plan_limits
 * tables (trpc.billing.pricingMatrix) — nothing is hard-coded. Real table
 * semantics, monthly/annual toggle, "Current plan" disabled state, and the
 * 3-step plan-change flow (choose → preview → apply) with an honest preview:
 * gains, explicit losses, effective date, and the exact money.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Check, Minus, X, Loader2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Logo } from "@/components/shared/Logo";

type Interval = "monthly" | "annual";

function fmt(minor: number) {
  return `£${(minor / 100).toFixed(2)}`;
}

function tonnageLabel(value: number | "unlimited" | undefined): string | null {
  if (value === undefined) return null;
  return value === "unlimited" ? "Unlimited tonnage" : `Orders up to ${value} MT`;
}

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [interval, setInterval] = useState<Interval>("monthly");
  const utils = trpc.useUtils();
  const matrix = trpc.billing.pricingMatrix.useQuery();
  const { data: summary } = trpc.billing.mySummary.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30_000,
  });
  const currentKey = summary?.plan?.planKey ?? null;

  const plans = matrix.data?.plans ?? [];
  const grouped = matrix.data?.grouped ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Aquifert home"><Logo size={30} /></Link>
          <nav className="flex items-center gap-3" aria-label="Pricing actions">
            {isAuthenticated ? (
              <Button asChild variant="outline"><Link to="/buyer/billing">Billing</Link></Button>
            ) : (
              <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6" id="main-content">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl dark:text-slate-100">
          Plans &amp; pricing
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Market intelligence, analytics and physical trading on one platform. Change plans at any time —
          upgrades apply immediately with a prorated charge, downgrades take effect at the end of your
          current period. Nothing you have saved is ever deleted.
        </p>

        <div className="mt-6 flex items-center gap-3" role="group" aria-label="Billing interval">
          <Button variant={interval === "monthly" ? "default" : "outline"} onClick={() => setInterval("monthly")} aria-pressed={interval === "monthly"}>Monthly</Button>
          <Button variant={interval === "annual" ? "default" : "outline"} onClick={() => setInterval("annual")} aria-pressed={interval === "annual"}>
            Annual <span className="ml-1.5 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-900 dark:text-teal-200">save 20%</span>
          </Button>
        </div>

        {matrix.isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading plans…</div>
        ) : (
          <>
            {/* Desktop: real comparison table */}
            <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-border md:block">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <caption className="sr-only">Plan comparison: capabilities and limits by plan</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-[26%] border-b border-border bg-muted/40 p-4 text-left font-semibold">Feature</th>
                    {plans.map((p) => (
                      <th scope="col" key={p.planId} className="border-b border-border bg-muted/40 p-4 text-left align-top">
                        <div className="font-bold text-navy-900 dark:text-slate-100">{p.displayName}</div>
                        {p.family === "analytics" && (
                          <Badge variant="outline" className="mt-1 border-amber-400 text-amber-700 dark:text-amber-300">No physical trading</Badge>
                        )}
                        <div className="mt-2 text-lg font-extrabold">
                          {p.priceMonthlyMinor == null ? "Free" : interval === "monthly" ? `${fmt(p.priceMonthlyMinor)}/mo` : `${fmt(p.annualMinor ?? 0)}/yr`}
                        </div>
                        {interval === "annual" && p.priceMonthlyMinor != null && p.annualDiscountPct != null && (
                          <div className="text-[12px] text-teal-700 dark:text-teal-300">Save {Math.round(p.annualDiscountPct)}% vs monthly</div>
                        )}
                        {p.family === "aq0" && (
                          <div className="mt-1 text-[12px] font-semibold text-navy-700 dark:text-slate-300">
                            {tonnageLabel(p.limits.find((l) => l.limitKey === "trading.max_tonnage_per_order")?.value)}
                          </div>
                        )}
                        <div className="mt-3">
                          <PlanButton planKey={p.planKey} currentKey={currentKey} isAuthenticated={isAuthenticated} interval={interval} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                {grouped.map((g) => (
                  <tbody key={g.group}>
                    <tr>
                      <th scope="colgroup" colSpan={plans.length + 1} className="border-b border-border bg-muted/60 px-4 py-2 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map((row) => (
                      <tr key={row.capabilityKey} className="border-b border-border/60">
                        <th scope="row" className="p-4 text-left font-medium" title={row.description ?? undefined}>
                          {row.label}
                        </th>
                        {plans.map((p) => {
                          const has = p.capabilities.some((c) => c.capabilityKey === row.capabilityKey);
                          return (
                            <td key={p.planId} className="p-4 text-center" title={row.description ?? undefined}>
                              {has
                                ? <Check className="mx-auto h-4 w-4 text-teal-600" aria-label={`${p.displayName}: included`} />
                                : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label={`${p.displayName}: not included`} />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
                {/* Limits rows, generated from plan_limits */}
                <tbody>
                  <tr>
                    <th scope="colgroup" colSpan={plans.length + 1} className="border-b border-border bg-muted/60 px-4 py-2 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                      Limits
                    </th>
                  </tr>
                  {Array.from(new Set(plans.flatMap((p) => p.limits.map((l) => l.limitKey)))).map((limitKey) => (
                    <tr key={limitKey} className="border-b border-border/60">
                      <th scope="row" className="p-4 text-left font-medium">{limitKey.replace(/^[a-z]+\./, "").replace(/_/g, " ")}</th>
                      {plans.map((p) => {
                        const l = p.limits.find((x) => x.limitKey === limitKey);
                        const text = !l ? "—" : l.value === "unlimited" ? "Unlimited" : String(l.value);
                        return <td key={p.planId} className="p-4 text-center font-medium">{limitKey === "trading.max_tonnage_per_order" ? (l ? (l.value === "unlimited" ? "Unlimited" : `${l.value} MT`) : "—") : text}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked plan cards */}
            <div className="mt-8 space-y-6 md:hidden">
              {plans.map((p) => (
                <section key={p.planId} className="rounded-2xl border border-border p-5" aria-label={p.displayName}>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-navy-900 dark:text-slate-100">{p.displayName}</h2>
                    <span className="text-lg font-extrabold">
                      {p.priceMonthlyMinor == null ? "Free" : interval === "monthly" ? `${fmt(p.priceMonthlyMinor)}/mo` : `${fmt(p.annualMinor ?? 0)}/yr`}
                    </span>
                  </div>
                  {p.family === "analytics" && <Badge variant="outline" className="mt-2 border-amber-400 text-amber-700">No physical trading</Badge>}
                  {p.family === "aq0" && (
                    <p className="mt-1 text-[13px] font-semibold text-navy-700">
                      {tonnageLabel(p.limits.find((l) => l.limitKey === "trading.max_tonnage_per_order")?.value)}
                    </p>
                  )}
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {grouped.flatMap((g) => g.rows).filter((row) => p.capabilities.some((c) => c.capabilityKey === row.capabilityKey)).map((row) => (
                      <li key={row.capabilityKey} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {row.label}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4"><PlanButton planKey={p.planKey} currentKey={currentKey} isAuthenticated={isAuthenticated} interval={interval} /></div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/** Per-plan CTA. Handles the 3-step flow for signed-in users. */
function PlanButton({ planKey, currentKey, isAuthenticated, interval }: { planKey: string; currentKey: string | null; isAuthenticated: boolean; interval: Interval }) {
  const [open, setOpen] = useState(false);
  if (currentKey === planKey) {
    return <Button disabled className="w-full" aria-current="true">Current plan</Button>;
  }
  if (!isAuthenticated) {
    return <Button asChild className="w-full" variant="outline"><Link to={`/login?next=/pricing`}>Sign in to choose</Link></Button>;
  }
  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        {currentKey ? "Change plan" : "Choose plan"} <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
      </Button>
      <PlanChangeDialog open={open} onClose={() => setOpen(false)} targetPlanKey={planKey} interval={interval} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* STEP 2 + 3: honest preview, then one confirm with the exact amount. */
type Preview = {
  changeType: "upgrade" | "downgrade" | "crossgrade" | "cancel";
  current: { planKey: string; displayName: string };
  target: { planKey: string; displayName: string };
  gains: string[];
  losses: string[];
  effective: { when: "immediate" | "period_end"; date: string | null };
  money: { chargeTodayMinor: number; chargeTodayLabel: string | null; nextRenewalMinor: number | null; nextRenewalDate: string | null; nothingChargedNow: boolean };
  interval: Interval;
  seats: { reductionRequired: boolean; currentSeats: number; targetMax: number | "unlimited"; seats: { seatId: string; provider: string; datasetScope: string }[] } | null;
  grandfatheredOrders: { reference: string; quantityMt: number }[];
  vat: { ratePct: number; note: string; vatMinor: number; totalMinor: number };
};

const CHANGE_LABEL: Record<Preview["changeType"], string> = {
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  crossgrade: "Change plan",
  cancel: "Cancel subscription",
};

function niceDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function PlanChangeDialog({ open, onClose, targetPlanKey, interval }: { open: boolean; onClose: () => void; targetPlanKey: string; interval: Interval }) {
  const utils = trpc.useUtils();
  const [seatChoice, setSeatChoice] = useState<Set<string>>(new Set());
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());
  const [failure, setFailure] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);

  const preview = trpc.billing.preview.useQuery(
    { targetPlanKey, interval },
    { enabled: open, retry: false },
  );
  const p = preview.data as Preview | undefined;

  const apply = trpc.billing.applyChange.useMutation({
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(
          r.applied === "immediate"
            ? `Plan changed to ${p?.target.displayName ?? "new plan"}${r.invoiceNumber ? ` — receipt ${r.invoiceNumber}` : ""}.`
            : `Scheduled — your plan changes on ${niceDate(r.effectiveDate) ?? "your period end"}.`,
        );
        setFailure(null);
        setIdemKey(crypto.randomUUID());
        setSeatChoice(new Set());
        utils.billing.mySummary.invalidate();
        onClose();
      } else {
        setFailure(r.failureReason ?? "The payment could not be completed.");
      }
    },
    onError: (e) => setFailure(e.message),
  });

  const processing = apply.isPending;
  const neededSeats = p?.seats?.reductionRequired ? p.seats.currentSeats - (p.seats.targetMax as number) : 0;
  const seatChoiceOk = !p?.seats?.reductionRequired || seatChoice.size === neededSeats;
  const confirmLabel = useMemo(() => {
    if (!p) return "Confirm";
    if (p.changeType === "cancel" || p.effective.when === "period_end") return `Confirm — nothing charged today`;
    if (p.money.nothingChargedNow) return "Confirm — nothing charged today";
    return `Confirm and pay ${p.money.chargeTodayLabel ?? ""} today`;
  }, [p]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !processing) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" aria-describedby="plan-change-desc">
        <DialogHeader>
          <DialogTitle>
            {p ? `${CHANGE_LABEL[p.changeType]}: ${p.current.displayName} → ${p.target.displayName}` : "Review your plan change"}
          </DialogTitle>
          <DialogDescription id="plan-change-desc">
            {p?.effective.when === "immediate"
              ? "Applies immediately."
              : p?.effective.date
                ? `Takes effect on ${niceDate(p.effective.date)} — at the end of your current period. You keep full access until then, and no refund is issued.`
                : "Review the details below."}
          </DialogDescription>
        </DialogHeader>

        {preview.isLoading && <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Preparing your preview…</div>}
        {preview.error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
            {preview.error.message}
          </div>
        )}

        {p && (
          <div className={`space-y-5 ${processing ? "pointer-events-none opacity-60" : ""}`}>
            {/* GAINS */}
            {p.gains.length > 0 && (
              <section aria-label="What you gain">
                <h3 className="text-[13px] font-bold text-teal-700 dark:text-teal-300">You gain</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {p.gains.map((g) => (
                    <li key={g} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {g}</li>
                  ))}
                </ul>
              </section>
            )}
            {/* LOSSES — explicit and complete */}
            {p.losses.length > 0 && (
              <section aria-label="What you lose">
                <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> You lose
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {p.losses.map((l) => (
                    <li key={l} className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden /> {l}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* SEAT CHOICE — explicit, never auto-revoked */}
            {p.seats?.reductionRequired && (
              <section aria-label="Choose seats to release" className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/40">
                <h3 className="text-[13px] font-bold text-amber-800 dark:text-amber-200">
                  Choose {neededSeats} seat{neededSeats === 1 ? "" : "s"} to release
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Seats are never removed automatically. Licensed-data access for released seats ends on the effective date.
                </p>
                <ul className="mt-3 space-y-2">
                  {p.seats.seats.map((seat) => (
                    <li key={seat.seatId}>
                      <label className="flex items-center gap-2.5 text-sm">
                        <Checkbox
                          checked={seatChoice.has(seat.seatId)}
                          disabled={processing}
                          onCheckedChange={(c) => {
                            const next = new Set(seatChoice);
                            if (c) next.add(seat.seatId); else next.delete(seat.seatId);
                            setSeatChoice(next);
                          }}
                        />
                        {seat.provider} — {seat.datasetScope}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* GRANDFATHERED ORDERS */}
            {p.grandfatheredOrders.length > 0 && (
              <section aria-label="In-flight orders">
                <h3 className="text-[13px] font-bold">Your in-flight orders keep their current terms</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {p.grandfatheredOrders.map((o) => (
                    <li key={o.reference}>{o.reference} — {o.quantityMt} MT (completes under the limit it was created with)</li>
                  ))}
                </ul>
              </section>
            )}

            {/* THE MONEY */}
            <section aria-label="Charges" className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              {p.money.nothingChargedNow ? (
                <p><strong>Nothing is charged today.</strong></p>
              ) : (
                <p>Charged today: <strong>{p.money.chargeTodayLabel}</strong> (prorated, includes VAT where applicable)</p>
              )}
              {p.money.nextRenewalMinor != null && (
                <p className="mt-1 text-muted-foreground">
                  Next renewal: {fmt(p.money.nextRenewalMinor)}{p.interval === "annual" ? "/year" : "/month"}
                  {p.money.nextRenewalDate ? ` on ${niceDate(p.money.nextRenewalDate)}` : ""}
                </p>
              )}
              {p.vat.ratePct > 0 && <p className="mt-1 text-[13px] text-muted-foreground">VAT at {p.vat.ratePct}%: {fmt(p.vat.vatMinor)}. {p.vat.note}</p>}
              {p.vat.ratePct === 0 && <p className="mt-1 text-[13px] text-muted-foreground">{p.vat.note}</p>}
            </section>

            {/* FAILURE + RETRY */}
            {failure && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
                <p><strong>Payment failed:</strong> {failure}</p>
                <p className="mt-1 text-[13px]">You have not been charged. Check your payment method or try again.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={processing}>Back</Button>
              <Button
                onClick={() => apply.mutate({ targetPlanKey, interval, idempotencyKey: idemKey, revokeSeatIds: Array.from(seatChoice), simulateFailure })}
                disabled={processing || !seatChoiceOk}
                aria-label={`${confirmLabel}. ${p.money.nothingChargedNow ? "No charge today" : `Charge today ${p.money.chargeTodayLabel}`}`}
              >
                {processing ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Processing…</> : confirmLabel}
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Checkbox checked={simulateFailure} onCheckedChange={(c) => setSimulateFailure(Boolean(c))} /> Simulate card failure (dev only)
              </label>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * PLANS PART 4 — persistent billing state banners.
 *
 * - Pending plan change (scheduled downgrade/cancel): amber banner with the
 *   exact effective date and an Undo action.
 * - Past due (failed payment): red banner, 7-day grace, link to billing.
 * Mounted inside AppLayout so it follows the user everywhere.
 */
import { Link } from "react-router";
import { AlertTriangle, CalendarClock, Undo2, CreditCard } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BillingBanner() {
  const utils = trpc.useUtils();
  const { data: summary } = trpc.billing.mySummary.useQuery(undefined, { staleTime: 30_000 });
  const undo = trpc.billing.undoPending.useMutation({
    onSuccess: () => {
      toast.success("Plan change cancelled — nothing changes.");
      utils.billing.mySummary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!summary) return null;

  if (summary.status === "past_due") {
    const grace = summary.graceEndsAt ? new Date(summary.graceEndsAt) : null;
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          <strong>Payment failed.</strong> Full access is retained until{" "}
          {grace ? new Date(grace.toISOString().slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "the end of the 7-day grace period"}.
          No data will be deleted.
        </span>
        <Button asChild size="sm" variant="outline" className="ml-auto border-red-300">
          <Link to="/buyer/billing">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Update payment method
          </Link>
        </Button>
      </div>
    );
  }

  if (summary.pendingChange) {
    // Format the calendar date only — never a UTC timestamp in local time,
    // which could shift the day the user was promised.
    const when = new Date(summary.pendingChange.effectiveAt.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Your plan changes to <strong>{summary.pendingChange.displayName}</strong> on {when}.
        </span>
        <Button size="sm" variant="outline" className="ml-auto border-amber-300" onClick={() => undo.mutate()} disabled={undo.isPending}>
          <Undo2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Undo
        </Button>
      </div>
    );
  }

  return null;
}

import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";

/** Plan & Usage — every allowance in one consistent format: used / limit / resets-on. */
export default function Aq1PlanUsage() {
  const q = trpc.aq1.usage.useQuery();
  const rows = q.data ? [
    { label: "Nitrogen reports generated", ...q.data.nitrogenReports, unit: "per calendar month" },
    { label: "Urea cost calculations", ...q.data.ureaCalcs, unit: "per calendar month" },
    { label: "Saved reports retained", ...q.data.savedReports, unit: "kept in your account" },
    { label: "TELEX / analysis / AQ Signal", used: 0, limit: Infinity, unit: "unlimited" },
    { label: "Library free reports", used: 0, limit: Infinity, unit: "unlimited" },
    { label: "Community call registration", used: 0, limit: Infinity, unit: "unlimited" },
  ] : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <PageHeader title="Plan & Usage" description={q.data ? `Metered allowances reset on ${q.data.resetsOn}. Reading is always unlimited.` : undefined} />
      {q.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.label}><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {r.limit === Infinity ? "Unlimited" : `${r.used} / ${r.limit} ${r.unit}`}
              </p>
            </div>
            {r.limit !== Infinity && (
              <>
                <Progress value={Math.min(100, (r.used / r.limit) * 100)} className="mt-2" aria-label={`${r.label}: ${r.used} of ${r.limit} used`} />
                {r.limit > 0 && r.used / r.limit >= 0.8 && r.used < r.limit && (
                  <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">Running low — {r.limit - r.used} left. Resets {q.data!.resetsOn}.</p>
                )}
                {r.used >= r.limit && (
                  <p role="status" className="mt-2 text-xs text-muted-foreground">Allowance used up — resets {q.data!.resetsOn}. Upgrade to AQ0 for more.</p>
                )}
              </>
            )}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

/**
 * PLANS PART 4 — admin billing console.
 *
 * Dashboard of active subscriptions by plan with MRR, upgrades/downgrades/
 * churn; per-user subscription view with history; manual plan change with a
 * MANDATORY reason, attributed and logged.
 */
import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function fmt(minor: number) {
  return `£${(minor / 100).toFixed(2)}`;
}

const PLAN_OPTIONS = [
  ["aq1", "AQ1 (free)"], ["aq_analytics", "AQ ANALYTICS"], ["aq0_sprout", "AQ0 SPROUT"],
  ["aq0_harvest", "AQ0 HARVEST"], ["aq0_scale", "AQ0 SCALE"],
] as const;

export default function AdminBilling() {
  const { data: dash } = trpc.billing.adminDashboard.useQuery();
  const [userId, setUserId] = useState("");
  const [lookup, setLookup] = useState<number | null>(null);
  const [target, setTarget] = useState<string>("aq1");
  const [reason, setReason] = useState("");

  const sub = trpc.billing.adminUserSubscription.useQuery(
    { userId: lookup! },
    { enabled: lookup != null, retry: false },
  );
  const manual = trpc.billing.adminManualChange.useMutation({
    onSuccess: () => { toast.success("Plan changed and logged."); setReason(""); sub.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 dark:text-slate-100">Billing &amp; subscriptions</h1>

      {/* DASHBOARD */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>MRR</CardDescription></CardHeader>
          <CardContent><span className="text-2xl font-extrabold">{fmt(dash?.mrrMinor ?? 0)}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Upgrades (30d)</CardDescription></CardHeader>
          <CardContent><span className="text-2xl font-extrabold">{dash?.last30d.upgrades ?? 0}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Downgrades (30d)</CardDescription></CardHeader>
          <CardContent><span className="text-2xl font-extrabold">{dash?.last30d.downgrades ?? 0}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Churned (30d)</CardDescription></CardHeader>
          <CardContent><span className="text-2xl font-extrabold">{dash?.last30d.churned ?? 0}</span></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Active subscriptions by plan</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead className="text-right">Active subscriptions</TableHead></TableRow></TableHeader>
            <TableBody>
              {Object.entries(dash?.activeByPlan ?? {}).map(([k, n]) => (
                <TableRow key={k}><TableCell className="font-medium">{k}</TableCell><TableCell className="text-right">{n}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* USER LOOKUP */}
      <Card>
        <CardHeader>
          <CardTitle>User subscription</CardTitle>
          <CardDescription>View any user&apos;s subscription and history, or apply a manual change. A reason is mandatory and the action is attributed to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setLookup(Number(userId)); }}>
            <Input type="number" min={1} placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="max-w-[160px]" />
            <Button type="submit"><Search className="mr-1.5 h-4 w-4" aria-hidden /> Look up</Button>
          </form>

          {sub.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
          {sub.error && <p role="alert" className="text-sm text-red-600">{sub.error.message}</p>}

          {sub.data && (
            <div className="space-y-4">
              {sub.data.summary ? (
                <div className="rounded-lg border border-border p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold">{sub.data.summary.plan?.displayName ?? "—"}</span>
                    <Badge variant={sub.data.summary.status === "past_due" ? "destructive" : "secondary"}>{sub.data.summary.status}</Badge>
                    <Badge variant="outline">{sub.data.summary.interval}</Badge>
                    {sub.data.summary.pendingChange && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700">
                        Pending → {sub.data.summary.pendingChange.displayName} on{" "}
                        {new Date(sub.data.summary.pendingChange.effectiveAt.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </Badge>
                    )}
                  </div>
                  {sub.data.summary.currentPeriodEnd && (
                    <p className="mt-2 text-muted-foreground">
                      Period ends {new Date(sub.data.summary.currentPeriodEnd.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground">No subscription found.</p>}

              {/* MANUAL CHANGE */}
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-bold">Manual plan change</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label>Target plan</Label>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reason">Reason (mandatory, min 10 characters)</Label>
                    <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goodwill credit after platform outage" />
                  </div>
                  <div className="self-end">
                    <Button
                      onClick={() => manual.mutate({ userId: lookup!, targetPlanKey: target as typeof PLAN_OPTIONS[number][0], reason })}
                      disabled={manual.isPending || reason.trim().length < 10}
                    >
                      {manual.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply change"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* HISTORY */}
              <div>
                <h3 className="text-sm font-bold">History</h3>
                {(sub.data.history?.length ?? 0) === 0 ? <p className="mt-2 text-sm text-muted-foreground">No changes recorded.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>By</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {sub.data.history!.map((h) => (
                        <TableRow key={h.historyId}>
                          <TableCell>{new Date(h.effectiveAt.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                          <TableCell><Badge variant="outline">{h.changeType}</Badge></TableCell>
                          <TableCell>{h.initiatedBy}</TableCell>
                          <TableCell className="max-w-[320px] truncate" title={h.note ?? ""}>{h.note ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

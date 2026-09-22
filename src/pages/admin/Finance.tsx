import { useState } from "react";
import { Crown, Landmark, Receipt, TrendingUp, Wallet } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, gbp } from "@/lib/format";
import { toast } from "sonner";

type InvoiceRow = NonNullable<ReturnType<typeof useInvoices>["data"]>[number];
function useInvoices() {
  return trpc.finance.invoices.useQuery();
}

export default function AdminFinance() {
  const invoices = useInvoices();
  const billing = trpc.finance.billing.useQuery();
  const margins = trpc.finance.margins.useQuery();
  const queue = trpc.financing.queue.useQuery();
  const utils = trpc.useUtils();
  const [reviewing, setReviewing] = useState<{ id: number; amount: number } | null>(null);
  const [decision, setDecision] = useState({ creditLimit: "", interestRate: "4.9" });

  const approve = trpc.financing.approve.useMutation({
    onSuccess: () => {
      toast.success("Financing approved, repayment schedule generated");
      setReviewing(null);
      utils.financing.queue.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.financing.reject.useMutation({
    onSuccess: () => {
      toast.success("Application rejected");
      utils.financing.queue.invalidate();
    },
  });

  const invColumns: Column<InvoiceRow>[] = [
    { key: "num", header: "Invoice", searchValue: (i) => i.invoiceNumber, sortValue: (i) => i.invoiceNumber, render: (i) => <span className="font-data text-xs font-semibold">{i.invoiceNumber}</span> },
    { key: "type", header: "Type", render: (i) => <span className="text-xs">{i.type}</span> },
    { key: "buyer", header: "Buyer", searchValue: (i) => i.order?.quote?.request?.buyer?.organization?.name ?? "", render: (i) => <span className="text-sm">{i.order?.quote?.request?.buyer?.organization?.name ?? i.order?.quote?.request?.buyer?.name}</span> },
    { key: "amount", header: "Amount", sortValue: (i) => i.amount, render: (i) => <span className="font-data">{gbp(i.amount)}</span> },
    { key: "due", header: "Due", sortValue: (i) => i.dueDate, render: (i) => <span className="text-xs text-muted-foreground">{fmtDate(i.dueDate)}</span> },
    { key: "status", header: "Status", render: (i) => i.paidAt ? <StatusPill status="PAID" /> : <StatusPill status="PENDING" /> },
  ];

  const pendingApps = (queue.data ?? []).filter((a) => a.status === "PENDING");

  return (
    <div>
      <PageHeader title="Finance View" description="Invoices, membership billing, financing approvals and margin intelligence. Restricted to Finance & Admin." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="MRR (memberships)" value={billing.data?.mrr ?? 0} format={(n) => gbp(n)} icon={<Crown className="h-5 w-5" />} trend="+1 member" trendUp accent="teal" />
        <StatCard title="Active members" value={billing.data?.activeMembers.length ?? 0} icon={<Wallet className="h-5 w-5" />} hint={`churn ${billing.data?.churn ?? 0}%`} accent="navy" />
        <StatCard title="Margin booked" value={margins.data?.summary.totalMarginBooked ?? 0} format={(n) => gbp(n)} icon={<TrendingUp className="h-5 w-5" />} hint={`avg ${margins.data?.summary.avgMarginPct ?? 0}%`} accent="green" />
        <StatCard title="Pipeline margin" value={margins.data?.summary.pipelineMargin ?? 0} format={(n) => gbp(n)} icon={<Landmark className="h-5 w-5" />} hint="sent + pending quotes" accent="amber" />
      </div>

      {/* Financing queue */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Financing applications queue {pendingApps.length > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{pendingApps.length} pending</span>}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {(queue.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          {(queue.data ?? []).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-semibold">{a.buyer?.organization?.name ?? a.buyer?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.order?.orderNumber} · {gbp(a.amount)} · {a.term} days · {fmtDate(a.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={a.status} />
                {a.status === "PENDING" && (
                  <>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setReviewing({ id: a.id, amount: a.amount }); setDecision({ creditLimit: String(Math.round(a.amount * 1.2)), interestRate: "4.9" }); }}>
                      Review
                    </Button>
                    <Button size="sm" variant="outline" className="text-danger" onClick={() => reject.mutate({ id: a.id })} disabled={reject.isPending}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invoice reconciliation */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4 text-navy-500" /> Invoice reconciliation</h2>
        <DataTable columns={invColumns} rows={invoices.data ?? []} emptyTitle="No invoices" />
      </div>

      {/* Margin report */}
      <Card className="mt-6">
        <CardHeader className="pb-3"><CardTitle className="text-base">Margin report <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-500/15 dark:text-red-300">Confidential</span></CardTitle></CardHeader>
        <CardContent className="aqf-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Request</th><th className="py-2 pr-4">Buyer</th><th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Total</th><th className="py-2 pr-4 text-right">Margin %</th><th className="py-2 text-right">Margin £</th>
              </tr>
            </thead>
            <tbody>
              {(margins.data?.quotes ?? []).slice(0, 15).map((q) => (
                <tr key={q.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 font-data text-xs">{q.request?.requestNumber}</td>
                  <td className="py-2 pr-4">{q.request?.buyer?.organization?.name ?? q.request?.buyer?.name}</td>
                  <td className="py-2 pr-4"><StatusPill status={q.status} /></td>
                  <td className="py-2 pr-4 text-right font-data">{gbp(q.total)}</td>
                  <td className="py-2 pr-4 text-right font-data">{q.marginPercentage}%</td>
                  <td className="py-2 text-right font-data font-semibold text-amber-600">{gbp(q.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Approve dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Approve financing, {reviewing ? gbp(reviewing.amount) : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="f-limit">Credit limit (£)</Label><Input id="f-limit" type="number" value={decision.creditLimit} onChange={(e) => setDecision({ ...decision, creditLimit: e.target.value })} /></div>
            <div><Label htmlFor="f-rate">Interest rate (% p.a.)</Label><Input id="f-rate" type="number" step="0.1" value={decision.interestRate} onChange={(e) => setDecision({ ...decision, interestRate: e.target.value })} /></div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={approve.isPending || !decision.creditLimit}
              onClick={() => reviewing && approve.mutate({ id: reviewing.id, creditLimit: Number(decision.creditLimit), interestRate: Number(decision.interestRate) })}
            >
              Approve & generate repayment schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

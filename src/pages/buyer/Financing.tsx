import { useState } from "react";
import { useNavigate } from "react-router";
import { Crown, Landmark, Lock, PenLine, Wallet } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, gbp } from "@/lib/format";
import { toast } from "sonner";

type App = NonNullable<ReturnType<typeof useMine>["data"]>["applications"][number];
function useMine() {
  return trpc.financing.mine.useQuery();
}

export default function BuyerFinancing() {
  const mine = useMine();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const eligibleOrders = trpc.financing.eligibleOrders.useQuery();
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ orderId: "", amount: "", term: "60" as "30" | "60" | "90", signature: "", agreed: false });

  const apply = trpc.financing.submitApplication.useMutation({
    onSuccess: () => {
      toast.success("Application submitted, finance team reviews within 24h");
      setApplyOpen(false);
      setForm({ orderId: "", amount: "", term: "60", signature: "", agreed: false });
      utils.financing.mine.invalidate();
      utils.financing.eligibleOrders.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (mine.isLoading) {
    return <div className="space-y-4"><div className="h-8 w-48 rounded bg-muted" /><div className="h-40 rounded-xl bg-muted" /></div>;
  }

  const credit = mine.data?.credit;
  if (!credit?.eligible) {
    return (
      <div className="mx-auto max-w-lg py-14">
        <h1 className="sr-only">Financing</h1>
        <EmptyState
          icon={<Lock className="h-7 w-7" />}
          title="Financing unlocks on Harvest & Scale"
          description="Harvest members access up to £50k of invoice financing; Scale members up to £200k, with e-signature and automated repayment schedules."
          action={<Button className="bg-teal-500 hover:bg-teal-600" onClick={() => navigate("/buyer/membership")}><Crown className="mr-1.5 h-4 w-4" /> Upgrade membership</Button>}
        />
      </div>
    );
  }

  const apps = mine.data?.applications ?? [];
  const activeSchedule = (apps.find((a) => a.status === "ACTIVE")?.repaymentSchedule as { due: string; amount: number; paid: boolean }[] | null) ?? null;
  const maxAmount = (() => {
    const o = (eligibleOrders.data ?? []).find((x) => x.id === Number(form.orderId));
    return o ? Math.round(o.total * 0.85) : 0;
  })();

  const columns: Column<App>[] = [
    { key: "id", header: "Application", render: (a) => <span className="font-data text-xs font-semibold">FIN-{String(a.id).padStart(4, "0")}</span> },
    { key: "order", header: "Order", render: (a) => <span className="font-data text-xs">{a.order?.orderNumber}</span> },
    { key: "amount", header: "Amount", sortValue: (a) => a.amount, render: (a) => <span className="font-data">{gbp(a.amount)}</span> },
    { key: "term", header: "Term", render: (a) => `${a.term} days` },
    { key: "rate", header: "Rate", render: (a) => <span className="font-data">{a.interestRate ? `${a.interestRate}%` : "N/A"}</span> },
    { key: "status", header: "Status", render: (a) => <StatusPill status={a.status} /> },
    { key: "date", header: "Applied", sortValue: (a) => a.createdAt, render: (a) => <span className="text-xs text-muted-foreground">{fmtDate(a.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoice Financing"
        description="Free up working capital, finance up to 85% of an invoice, repay as your crop sells."
        actions={
          <Button
            className="bg-teal-500 hover:bg-teal-600 aqf-btn-press"
            disabled={(eligibleOrders.data ?? []).length === 0}
            onClick={() => setApplyOpen(true)}
          >
            <Landmark className="mr-1.5 h-4 w-4" /> Apply for financing
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Approved Limit" value={credit.limit} format={(n) => gbp(n)} icon={<Landmark className="h-5 w-5" />} accent="navy" />
        <StatCard title="Used" value={credit.used} format={(n) => gbp(n)} icon={<Wallet className="h-5 w-5" />} accent="amber" />
        <StatCard title="Available" value={credit.available} format={(n) => gbp(n)} icon={<Wallet className="h-5 w-5" />} accent="green" />
        <StatCard title="Interest Rate" value={credit.interestRate} format={(n) => `${n.toFixed(1)}%`} icon={<Landmark className="h-5 w-5" />} accent="teal" hint="per annum, simple interest" />
      </div>

      {/* Repayment schedule */}
      {activeSchedule && (
        <Card className="mt-6">
          <CardHeader className="pb-3"><CardTitle className="text-base">Repayment schedule, auto-debits</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeSchedule.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>Instalment {i + 1}</span>
                <span className="font-data">{gbp(r.amount)}</span>
                <span className="text-muted-foreground">{fmtDate(r.due)}</span>
                {r.paid ? <StatusPill status="PAID" /> : <StatusPill status="PENDING" />}
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">Auto-debit from account ending •••• 4562 · manage in Settings</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <DataTable columns={columns} rows={apps} emptyTitle="No applications yet" emptyDescription="Finance an eligible order to see it here." />
      </div>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Apply for invoice financing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Order</Label>
              <Select value={form.orderId} onValueChange={(v) => {
                setForm({ ...form, orderId: v });
                const o = (eligibleOrders.data ?? []).find((x) => x.id === Number(v));
                if (o) setForm((f) => ({ ...f, orderId: v, amount: String(Math.round(o.total * 0.85)) }));
              }}>
                <SelectTrigger aria-label="Select order"><SelectValue placeholder="Select an order" /></SelectTrigger>
                <SelectContent>
                  {(eligibleOrders.data ?? []).map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.orderNumber}, {gbp(o.total)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fin-amount">Amount (max 85% of invoice {form.orderId ? `= ${gbp(maxAmount)}` : ""})</Label>
              <Input id="fin-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Term</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["30", "60", "90"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, term: t })}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.term === t ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300" : "border-border text-muted-foreground"}`}
                  >
                    {t} days
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="fin-sig" className="flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> E-signature (type your full name)</Label>
              <Input id="fin-sig" value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} placeholder="James Whitfield" className="font-serif italic" />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-xs text-muted-foreground">
              <Checkbox checked={form.agreed} onCheckedChange={(v) => setForm({ ...form, agreed: v === true })} aria-label="Agree to terms" />
              <span>I agree to the financing terms: simple interest accrues daily from drawdown; instalments auto-debit on scheduled dates; early repayment is free of charge.</span>
            </label>
            <Button
              className="w-full bg-teal-500 hover:bg-teal-600"
              disabled={!form.orderId || !form.amount || !form.signature || !form.agreed || apply.isPending || Number(form.amount) > maxAmount}
              onClick={() =>
                apply.mutate({
                  orderId: Number(form.orderId),
                  amount: Number(form.amount),
                  term: Number(form.term) as 30 | 60 | 90,
                  signature: form.signature,
                })
              }
            >
              Submit application
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

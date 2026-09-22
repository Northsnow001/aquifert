import { useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CircleCheck, FileText, MapPin, Package, Phone, Truck } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { TrackingMap } from "@/components/shared/TrackingMap";
import { MilestoneTimeline, type Milestone } from "@/components/shared/MilestoneTimeline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtDate, gbp, tons } from "@/lib/format";
import { toast } from "sonner";

type OrderRow = NonNullable<ReturnType<typeof useOrders>["data"]>[number];
function useOrders() {
  return trpc.orders.mine.useQuery();
}

function ReleasedDocs({ orderId }: { orderId: number }) {
  const docs = trpc.docgate.buyerDocuments.useQuery({ orderId });
  if (docs.isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Loading documents…</p>;
  if (!docs.data?.length)
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No documents released yet, they appear here once cleared against your shipping file.
      </div>
    );
  return (
    <div className="mt-3 space-y-4">
      {docs.data.map((d) => (
        <div key={d.id} className="rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">{d.name ?? d.type.replace(/_/g, " ")}</p>
            <span className="text-[11px] text-muted-foreground">Cleared {d.clearedAt ? fmtDate(d.clearedAt) : ""}</span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-4 font-data text-[11px] leading-relaxed text-muted-foreground">
            {d.cleanText ?? "(body unavailable)"}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default function BuyerOrders() {
  const orders = useOrders();
  const utils = trpc.useUtils();
  const [tracking, setTracking] = useState<OrderRow | null>(null);
  const [confirming, setConfirming] = useState<OrderRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [docsFor, setDocsFor] = useState<OrderRow | null>(null);

  const confirmReceipt = trpc.orders.confirmReceipt.useMutation({
    onSuccess: () => {
      toast.success("Receipt confirmed, supplier payment released");
      setConfirming(null);
      setTracking(null);
      utils.orders.mine.invalidate();
      utils.tracking.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: Column<OrderRow>[] = [
    { key: "id", header: "Order", searchValue: (o) => o.orderNumber, sortValue: (o) => o.orderNumber, render: (o) => <span className="font-data text-xs font-semibold">{o.orderNumber}</span> },
    { key: "product", header: "Product", render: (o) => <span className="font-medium">{o.quote?.request?.product}</span> },
    { key: "qty", header: "Qty", render: (o) => <span className="font-data">{tons(o.quote?.request?.quantity)}</span> },
    { key: "total", header: "Total", sortValue: (o) => o.total, render: (o) => <span className="font-data font-bold">{gbp(o.total)}</span> },
    { key: "payment", header: "Payment", render: (o) => <StatusPill status={o.paymentStatus} /> },
    { key: "status", header: "Status", render: (o) => <StatusPill status={o.shipment?.status ?? o.shipmentStatus} /> },
    { key: "date", header: "Date", sortValue: (o) => o.createdAt, render: (o) => <span className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span> },
    {
      key: "actions", header: "",
      render: (o) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDocsFor(o); }}>
            <FileText className="mr-1 h-3.5 w-3.5" /> Docs
          </Button>
          {o.shipment && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setTracking(o); }}>
              <Truck className="mr-1 h-3.5 w-3.5" /> Track
            </Button>
          )}
          {(o.shipment?.status === "OUT_FOR_DELIVERY") && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); setConfirming(o); setConfirmed(false); }}>
              Confirm receipt
            </Button>
          )}
        </div>
      ),
    },
  ];

  const ship = tracking?.shipment;
  const etaDays = ship?.eta ? differenceInCalendarDays(new Date(ship.eta), new Date()) : null;

  return (
    <div>
      <PageHeader title="Order History" description="Every order with live tracking, from payment to your farm gate." />

      <DataTable
        columns={columns}
        rows={orders.data ?? []}
        onRowClick={(o) => o.shipment && setTracking(o)}
        emptyTitle="No orders yet"
        emptyDescription="Accept a quote and your orders will appear here."
      />

      {/* Tracking modal */}
      <Dialog open={!!tracking} onOpenChange={(o) => !o && setTracking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {tracking && ship && (
            <>
              <DialogHeader>
                <DialogTitle className="font-data">{ship.containerNumber}</DialogTitle>
                <p className="text-xs text-muted-foreground">{ship.vesselName} · {ship.carrier}</p>
              </DialogHeader>

              {ship.delayed && ship.status !== "DELIVERED" && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  Delivery exception, revised ETA +{ship.delayDays} days ({fmtDate(ship.eta)})
                </div>
              )}

              {/* ETA countdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-navy-600 p-3 text-white">
                  <p className="font-data text-2xl font-bold">{etaDays != null && etaDays > 0 ? etaDays : 0}</p>
                  <p className="text-[11px] text-white/70">days to ETA</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="truncate font-data text-sm font-bold">{fmtDate(ship.eta)}</p>
                  <p className="text-[11px] text-muted-foreground">estimated arrival</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="truncate text-sm font-bold">{ship.currentLocation}</p>
                  <p className="text-[11px] text-muted-foreground">current position</p>
                </div>
              </div>

              <TrackingMap shipments={[ship]} height={240} focusId={ship.id} />

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</p>
                <MilestoneTimeline milestones={(ship.milestones as Milestone[]) ?? []} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3.5 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {ship.departurePort} → {ship.destinationPort}
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {ship.carrier} ops desk · +44 20 7946 0000
                </span>
              </div>

              {ship.status === "OUT_FOR_DELIVERY" && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 aqf-btn-press"
                  onClick={() => { setConfirming(tracking); setConfirmed(false); }}
                >
                  <CircleCheck className="mr-1.5 h-4 w-4" /> Confirm receipt
                </Button>
              )}
            </>
          )}
          {tracking && !ship && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              Shipment is being booked, tracking activates once the supplier confirms the container.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Released shipping documents, default-deny: buyers only ever see
          documents that passed the firewall scan AND human clearance. */}
      <Dialog open={!!docsFor} onOpenChange={(o) => !o && setDocsFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract, invoices & documents, <span className="font-data">{docsFor?.orderNumber}</span></DialogTitle>
          </DialogHeader>

          {/* Invoices: deposit 70% on order approval, balance 30% with document release */}
          {docsFor && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoices</p>
              {docsFor.invoices.length === 0 && (
                <p className="text-xs text-muted-foreground">No invoices issued yet.</p>
              )}
              <div className="space-y-2">
                {docsFor.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
                    <span className="font-data text-xs font-semibold">{inv.invoiceNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {inv.installment === "DEPOSIT" ? "Deposit, 70%" : inv.installment === "BALANCE" ? "Balance, 30%" : inv.type}
                    </span>
                    <span className="font-data font-semibold">{gbp(inv.amount)}</span>
                    <StatusPill status={inv.paidAt ? "PAID" : "PENDING"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Every document here has been regenerated or verified on Aquifert's paper and cleared for release.
          </p>
          {docsFor && <ReleasedDocs orderId={docsFor.id} />}
        </DialogContent>
      </Dialog>

      {/* Confirm receipt dialog */}
      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Have you received your delivery?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirming receipt completes order <span className="font-data font-semibold text-foreground">{confirming?.orderNumber}</span> and
            releases payment to the supplier. This can't be undone.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} aria-label="Confirm goods received in good order" />
            <span>I confirm the goods arrived in good order and match the delivery note.</span>
          </label>
          <Button
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!confirmed || confirmReceipt.isPending}
            onClick={() => confirming && confirmReceipt.mutate({ orderId: confirming.id })}
          >
            Confirm & complete order
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

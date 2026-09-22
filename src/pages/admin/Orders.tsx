import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft, CircleCheck, CreditCard, FileText, PackageCheck, Receipt, Truck,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { MilestoneTimeline, type Milestone } from "@/components/shared/MilestoneTimeline";
import { InvoiceDownloadButton } from "@/components/shared/InvoiceButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, fmtDateTime, gbp, tons } from "@/lib/format";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

type OrderRow = NonNullable<ReturnType<typeof useOrders>["data"]>[number];
function useOrders() {
  return trpc.orders.list.useQuery();
}

export default function AdminOrders() {
  const { id } = useParams();
  if (id) return <OrderDetail id={Number(id)} />;
  return <OrdersList />;
}

function OrdersList() {
  const orders = useOrders();
  const navigate = useNavigate();

  const columns: Column<OrderRow>[] = [
    { key: "id", header: "Order", searchValue: (o) => o.orderNumber, sortValue: (o) => o.orderNumber, render: (o) => <span className="font-data text-xs font-semibold">{o.orderNumber}</span> },
    {
      key: "buyer", header: "Buyer", searchValue: (o) => `${o.quote?.request?.buyer?.name} ${o.quote?.request?.buyer?.organization?.name ?? ""}`,
      render: (o) => (
        <div>
          <p className="text-sm font-medium">{o.quote?.request?.buyer?.organization?.name ?? o.quote?.request?.buyer?.name}</p>
          <p className="text-[11px] text-muted-foreground">{o.quote?.request?.buyer?.name}</p>
        </div>
      ),
    },
    { key: "product", header: "Product", render: (o) => o.quote?.request?.product },
    { key: "qty", header: "Qty", render: (o) => <span className="font-data">{tons(o.quote?.request?.quantity)}</span> },
    { key: "total", header: "Total", sortValue: (o) => o.total, render: (o) => <span className="font-data font-semibold">{gbp(o.total)}</span> },
    { key: "payment", header: "Payment", render: (o) => <StatusPill status={o.paymentStatus} /> },
    { key: "shipment", header: "Shipment", render: (o) => <StatusPill status={o.shipment?.status ?? o.shipmentStatus} /> },
    { key: "created", header: "Created", sortValue: (o) => o.createdAt, render: (o) => <span className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Order Management" description="Full lifecycle, quote acceptance through payment, shipment and completion." />
      <DataTable
        columns={columns}
        rows={orders.data ?? []}
        onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
        emptyTitle="No orders yet"
        emptyDescription="Orders are created when a buyer accepts a quote."
      />
    </div>
  );
}

function OrderDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { portalRole } = useProfile();
  const detail = trpc.orders.detail.useQuery({ id });
  const generateInvoice = trpc.orders.generateInvoice.useMutation({
    onSuccess: (r) => {
      toast.success(`Invoice ${r.invoiceNumber} generated`);
      utils.orders.detail.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });
  const markPaid = trpc.orders.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Payment confirmed");
      utils.orders.detail.invalidate({ id });
      utils.orders.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const issueContract = trpc.orders.issueContract.useMutation({
    onSuccess: () => {
      toast.success("Sales contract issued to the buyer's account");
      utils.orders.detail.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  if (detail.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  }
  const o = detail.data;
  if (!o) return <p>Order not found.</p>;

  const req = o.quote?.request;
  const canSeeMargins = ["ADMIN", "FINANCE", "OPERATIONS"].includes(portalRole ?? "");
  const milestones = (o.shipment?.milestones as Milestone[]) ?? [];
  const latestInvoice = o.invoices[0];
  const hasContract = o.documents?.some((d) => d.type === "CONTRACT");
  const hasDeposit = o.invoices.some((i) => i.installment === "DEPOSIT");
  const hasBalance = o.invoices.some((i) => i.installment === "BALANCE");
  const depositInv = o.invoices.find((i) => i.installment === "DEPOSIT");
  const balanceInv = o.invoices.find((i) => i.installment === "BALANCE");
  const paymentSteps = [
    { label: "Contract + deposit invoice (70%) issued", done: !!hasContract && !!hasDeposit, at: depositInv?.createdAt },
    { label: "Deposit received", done: !!depositInv?.paidAt, at: depositInv?.paidAt },
    { label: "Balance invoice (30%) issued", done: !!hasBalance, at: balanceInv?.createdAt },
    { label: "Balance received, payment complete", done: o.paymentStatus === "PAID", at: o.paidAt },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/admin/orders")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to orders
      </Button>

      <PageHeader
        title={<span className="font-data">{o.orderNumber}</span>}
        description={`${tons(req?.quantity)} ${req?.product} → ${req?.destination} · created ${fmtDate(o.createdAt)}`}
        actions={
          <div className="flex gap-2">
            {["ADMIN", "FINANCE", "OPERATIONS"].includes(portalRole ?? "") && !hasContract && (
              <Button variant="outline" onClick={() => issueContract.mutate({ orderId: o.id })} disabled={issueContract.isPending}>
                <FileText className="mr-1.5 h-4 w-4" /> Issue contract
              </Button>
            )}
            {["ADMIN", "FINANCE"].includes(portalRole ?? "") && (
              <>
                {!hasDeposit && (
                  <Button variant="outline" onClick={() => generateInvoice.mutate({ orderId: o.id, type: "PROFORMA", installment: "DEPOSIT" })} disabled={generateInvoice.isPending}>
                    <Receipt className="mr-1.5 h-4 w-4" /> Deposit invoice (70%)
                  </Button>
                )}
                {hasDeposit && !hasBalance && (
                  <Button variant="outline" onClick={() => generateInvoice.mutate({ orderId: o.id, type: "COMMERCIAL", installment: "BALANCE" })} disabled={generateInvoice.isPending}>
                    <Receipt className="mr-1.5 h-4 w-4" /> Balance invoice (30%)
                  </Button>
                )}
                {o.invoices.length === 0 && (
                  <Button variant="ghost" size="sm" onClick={() => generateInvoice.mutate({ orderId: o.id, type: "PROFORMA", installment: "FULL" })} disabled={generateInvoice.isPending}>
                    Full invoice instead
                  </Button>
                )}
              </>
            )}
            {latestInvoice && req && (
              <InvoiceDownloadButton
                data={{
                  invoiceNumber: latestInvoice.invoiceNumber,
                  type: latestInvoice.type,
                  date: latestInvoice.createdAt,
                  dueDate: latestInvoice.dueDate,
                  buyerName: req.buyer?.name ?? "Buyer",
                  buyerOrg: req.buyer?.organization?.name,
                  buyerAddress: req.buyer?.organization?.address,
                  orderNumber: o.orderNumber,
                  product: req.product,
                  quantity: Number(req.quantity),
                  productCost: o.quote?.productCost ?? 0,
                  shippingCost: o.quote?.shippingCost ?? 0,
                  clearingCost: o.quote?.clearingCost ?? 0,
                  total: o.total,
                  showBreakdown: true,
                }}
              />
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary + quote breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4 text-navy-500" /> Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span className="font-medium text-right">{req?.buyer?.organization?.name ?? req?.buyer?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-medium text-right">{o.quote?.supplier?.organization?.name ?? "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Incoterms</span><span>{req?.incoterms}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><StatusPill status={o.paymentStatus} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipment</span><StatusPill status={o.shipment?.status ?? o.shipmentStatus} /></div>
            <div className="mt-2 border-t border-border pt-2.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quote breakdown</p>
              <div className="flex justify-between"><span>Product</span><span className="font-data">{gbp(o.quote?.productCost)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span className="font-data">{gbp(o.quote?.shippingCost)}</span></div>
              <div className="flex justify-between"><span>Clearing</span><span className="font-data">{gbp(o.quote?.clearingCost)}</span></div>
              {canSeeMargins && (
                <div className="flex justify-between text-amber-600"><span>Margin ({o.quote?.marginPercentage}%)</span><span className="font-data">{gbp(o.quote?.margin)}</span></div>
              )}
              <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold"><span>Total</span><span className="font-data">{gbp(o.total)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Payment tracker */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-teal-600" /> Payment tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentSteps.map((s, i) => (
                <div key={s.label} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${s.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {s.done ? <CircleCheck className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${s.done ? "" : "text-muted-foreground"}`}>{s.label}</p>
                    {s.at && <p className="text-[11px] text-muted-foreground">{fmtDateTime(s.at)}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoices</p>
              {o.invoices.length === 0 && <p className="text-xs text-muted-foreground">No invoices yet.</p>}
              {o.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs">
                  <span className="font-data font-semibold">{inv.invoiceNumber}</span>
                  <span className="text-muted-foreground">{inv.installment === "DEPOSIT" ? "Deposit 70%" : inv.installment === "BALANCE" ? "Balance 30%" : inv.type}</span>
                  <span className="font-data">{gbp(inv.amount)}</span>
                  {inv.paidAt ? (
                    <StatusPill status="PAID" />
                  ) : (
                    <>
                      <StatusPill status="PENDING" />
                      {["ADMIN", "FINANCE"].includes(portalRole ?? "") && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => markPaid.mutate({ orderId: o.id, invoiceId: inv.id })} disabled={markPaid.isPending}>
                          Mark paid
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-navy-500" /> Document repository</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {o.documents.length === 0 && <p className="text-xs text-muted-foreground">No documents uploaded.</p>}
            {o.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{d.name}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info("Demo file, download simulated")}>View</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Shipment tracker */}
      {o.shipment && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-teal-600" /> Shipment tracker
              <span className="font-data text-xs text-muted-foreground">{o.shipment.containerNumber} · {o.shipment.vesselName}</span>
              {o.shipment.delayed && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                  DELAYED, revised ETA +{o.shipment.delayDays} days
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MilestoneTimeline milestones={milestones} />
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <span className="text-muted-foreground">Current: <strong className="text-foreground">{o.shipment.currentLocation}</strong></span>
              <span className="text-muted-foreground">ETA: <strong className="text-foreground">{fmtDate(o.shipment.eta)}</strong></span>
              <Link to="/admin/tracking" className="font-semibold text-teal-600 hover:underline">Open in Logistics Tracker →</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

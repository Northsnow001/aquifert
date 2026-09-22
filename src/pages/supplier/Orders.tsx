import { useRef, useState } from "react";
import { FileUp, Ship, UploadCloud } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useSupplierText } from "./lang";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import { MilestoneTimeline, type Milestone } from "@/components/shared/MilestoneTimeline";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_META } from "@contracts/constants";
import { fmtDate, gbp, tons } from "@/lib/format";
import { toast } from "sonner";

type OrderRow = NonNullable<ReturnType<typeof useOrders>["data"]>[number];
function useOrders() {
  return trpc.supplier.orders.useQuery();
}

export default function SupplierOrders() {
  const t = useSupplierText();
  const orders = useOrders();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ containerNumber: "", vesselName: "", carrier: "", bolNumber: "", bolFileName: "" });

  const manage = trpc.tracking.manage.useMutation({
    onSuccess: () => {
      toast.success(t("Shipment details saved, buyer can now track the container", "装运信息已保存, 买家现在可以跟踪集装箱"));
      utils.supplier.orders.invalidate();
      setSelected(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openManage = (o: OrderRow) => {
    const sh = o.order?.shipment;
    setSelected(o);
    setForm({
      containerNumber: sh?.containerNumber ?? "",
      vesselName: sh?.vesselName ?? "",
      carrier: sh?.carrier ?? "",
      bolNumber: sh?.bolNumber ?? "",
      bolFileName: "",
    });
  };

  const columns: Column<OrderRow>[] = [
    { key: "order", header: t("Order", "订单号"), render: (o) => <span className="font-data text-xs font-semibold">{o.order?.orderNumber}</span> },
    {
      key: "product", header: t("Product", "产品"),
      render: (o) => (
        <div>
          <p className="text-sm font-semibold">{o.request ? PRODUCT_META[o.request.product].label : "N/A"}</p>
          <p className="font-data text-[11px] text-muted-foreground">{o.request ? tons(Number(o.request.quantity)) : ""}</p>
        </div>
      ),
    },
    { key: "buyer", header: t("Buyer", "买家"), render: (o) => <span className="text-sm">{o.request?.buyer?.organization?.name ?? o.request?.buyer?.name}</span> },
    { key: "dest", header: t("Destination", "目的地"), render: (o) => o.request?.destination },
    { key: "payout", header: t("Your payout", "您的收入"), sortValue: (o) => o.productCost, render: (o) => <span className="font-data font-semibold">{gbp(o.productCost)}</span> },
    {
      key: "shipment", header: t("Shipment", "装运状态"),
      render: (o) => o.order?.shipment ? <StatusPill status={o.order.shipment.status} /> : <StatusPill status="BOOKED" />,
    },
    { key: "eta", header: "ETA", sortValue: (o) => o.order?.shipment?.eta ?? null, render: (o) => <span className="text-xs text-muted-foreground">{o.order?.shipment?.eta ? fmtDate(o.order.shipment.eta) : "N/A"}</span> },
    {
      key: "action", header: "", render: (o) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openManage(o); }}>
          <Ship className="mr-1.5 h-3.5 w-3.5" /> {t("Manage shipment", "管理装运")}
        </Button>
      ),
    },
  ];

  const shipment = selected?.order?.shipment;

  return (
    <div>
      <PageHeader
        title={t("Active Orders", "进行中订单")}
        description={t("Orders where your quote was accepted. Upload shipping documents to release buyer tracking.", "您的报价已被接受的订单。上传装运文件以开启买家跟踪。")}
      />
      <DataTable
        columns={columns}
        rows={orders.data ?? []}
        onRowClick={openManage}
        emptyTitle={t("No active orders", "暂无进行中订单")}
        emptyDescription={t("Win quotes in the request inbox to see orders here.", "在询价收件箱中赢得报价后，订单将显示在这里。")}
      />

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-data">
              {selected?.order?.orderNumber}
              {shipment && <StatusPill status={shipment.status} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {Array.isArray(shipment?.milestones) && (
                <div className="overflow-x-auto rounded-xl border border-border p-3">
                  <MilestoneTimeline milestones={shipment.milestones as unknown as Milestone[]} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ms-container">{t("Container number", "集装箱号")}</Label>
                  <Input id="ms-container" value={form.containerNumber} onChange={(e) => setForm({ ...form, containerNumber: e.target.value.toUpperCase() })} placeholder="MSKU1234567" className="font-data" />
                </div>
                <div>
                  <Label htmlFor="ms-bol">{t("B/L number", "提单号")}</Label>
                  <Input id="ms-bol" value={form.bolNumber} onChange={(e) => setForm({ ...form, bolNumber: e.target.value.toUpperCase() })} placeholder="MAEU9123456" className="font-data" />
                </div>
                <div>
                  <Label htmlFor="ms-vessel">{t("Vessel name", "船名")}</Label>
                  <Input id="ms-vessel" value={form.vesselName} onChange={(e) => setForm({ ...form, vesselName: e.target.value })} placeholder="OOCL Hong Kong" />
                </div>
                <div>
                  <Label htmlFor="ms-carrier">{t("Carrier", "承运人")}</Label>
                  <Input id="ms-carrier" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="Maersk" />
                </div>
              </div>

              {/* BOL upload (simulated) */}
              <div>
                <Label>{t("Bill of Lading (PDF)", "提单文件（PDF）")}</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setForm({ ...form, bolFileName: f.name });
                  }}
                  className={`mt-1 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-sm transition-colors ${dragOver ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10" : "border-border text-muted-foreground hover:border-teal-400"}`}
                >
                  {form.bolFileName ? (
                    <>
                      <FileUp className="h-6 w-6 text-teal-600" />
                      <span className="font-data font-semibold text-foreground">{form.bolFileName}</span>
                      <span className="text-xs">{t("Click to replace", "点击更换文件")}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-6 w-6" />
                      <span>{t("Drag & drop the B/L here, or click to browse", "将提单拖放到此处，或点击浏览")}</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setForm({ ...form, bolFileName: f.name });
                  }}
                />
              </div>

              <Button
                className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press"
                disabled={!shipment || !form.containerNumber || !form.vesselName || !form.carrier || !form.bolNumber || manage.isPending}
                onClick={() => shipment && manage.mutate({
                  shipmentId: shipment.id,
                  containerNumber: form.containerNumber,
                  vesselName: form.vesselName,
                  carrier: form.carrier,
                  bolNumber: form.bolNumber,
                  bolFileName: form.bolFileName || undefined,
                })}
              >
                {manage.isPending ? t("Saving…", "保存中…") : t("Save & notify buyer", "保存并通知买家")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

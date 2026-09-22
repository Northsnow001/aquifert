import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Ship } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrackingMap } from "@/components/shared/TrackingMap";
import { MilestoneTimeline, type Milestone } from "@/components/shared/MilestoneTimeline";
import { StatusPill } from "@/components/shared/StatusPill";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MILESTONES } from "@contracts/constants";
import { fmtDate, statusLabel } from "@/lib/format";
import { toast } from "sonner";

type ShipmentRow = NonNullable<ReturnType<typeof useShipments>["data"]>[number];
function useShipments() {
  return trpc.tracking.list.useQuery(undefined, { refetchInterval: 60_000 });
}

export default function AdminTracking() {
  const shipments = useShipments();
  const [selected, setSelected] = useState<ShipmentRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    const all = shipments.data ?? [];
    return statusFilter === "ALL" ? all : all.filter((s) => s.status === statusFilter);
  }, [shipments.data, statusFilter]);

  const delayed = (shipments.data ?? []).filter((s) => s.delayed && s.status !== "DELIVERED");

  const columns: Column<ShipmentRow>[] = [
    { key: "container", header: "Container", searchValue: (s) => s.containerNumber ?? "", render: (s) => <span className="font-data text-xs font-semibold">{s.containerNumber}</span> },
    { key: "vessel", header: "Vessel", render: (s) => <span className="text-sm">{s.vesselName}<span className="block text-[11px] text-muted-foreground">{s.carrier}</span></span> },
    { key: "buyer", header: "Buyer", searchValue: (s) => s.order?.quote?.request?.buyer?.name ?? "", render: (s) => <span className="text-sm">{s.order?.quote?.request?.buyer?.name}</span> },
    { key: "location", header: "Current location", render: (s) => <span className="text-sm">{s.currentLocation}</span> },
    { key: "status", header: "Status", render: (s) => <StatusPill status={s.status} /> },
    { key: "eta", header: "ETA", sortValue: (s) => s.eta, render: (s) => <span className={`text-xs ${s.delayed ? "font-semibold text-red-600" : "text-muted-foreground"}`}>{fmtDate(s.eta)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Logistics Tracker"
        description="Live container positions and milestone progress across all active shipments."
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-teal-500 hover:bg-teal-600 aqf-btn-press">
            <Plus className="mr-1.5 h-4 w-4" /> Add shipment
          </Button>
        }
      />

      {delayed.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {delayed.length} shipment{delayed.length > 1 ? "s" : ""} delayed
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-300/70">
              {delayed.map((s) => `${s.containerNumber} (revised ETA +${s.delayDays} days)`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {shipments.isLoading ? (
        <Skeleton className="h-[380px] rounded-xl" />
      ) : (shipments.data ?? []).length === 0 ? (
        <EmptyState icon={<Ship className="h-7 w-7" />} title="No shipments yet" description="Add a shipment to start tracking containers on the map." />
      ) : (
        <TrackingMap shipments={shipments.data ?? []} height={380} />
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={setSelected}
          searchPlaceholder="Search container or buyer…"
          toolbar={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-44" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {MILESTONES.map((m) => (
                  <SelectItem key={m} value={m}>{statusLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="font-data">{selected.containerNumber}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {selected.vesselName} · {selected.carrier} · BOL {selected.bolNumber}
                </p>
              </SheetHeader>
              {selected.delayed && selected.status !== "DELIVERED" && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  Exception: delay detected, revised ETA +{selected.delayDays} days ({fmtDate(selected.eta)})
                </div>
              )}
              <TrackingMap shipments={[selected]} height={240} focusId={selected.id} />
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</p>
                <MilestoneTimeline milestones={(selected.milestones as Milestone[]) ?? []} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Route</p><p className="mt-1 font-medium">{selected.departurePort} → {selected.destinationPort}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">ETA</p><p className="mt-1 font-medium">{fmtDate(selected.eta)}</p></div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {addOpen && <AddShipmentDialog onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); shipments.refetch(); }} />}
    </div>
  );
}

function AddShipmentDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const orders = trpc.orders.list.useQuery();
  const [form, setForm] = useState({
    orderId: "", containerNumber: "", bolNumber: "", vesselName: "", carrier: "",
    departurePort: "Shanghai, CN", destinationPort: "Felixstowe, UK", eta: "",
  });
  const add = trpc.tracking.add.useMutation({
    onSuccess: () => {
      toast.success("Shipment added, tracking simulation started");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const eligible = (orders.data ?? []).filter((o) => !o.shipment);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const valid = form.orderId && form.containerNumber.length >= 4 && form.bolNumber && form.vesselName && form.carrier && form.eta;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add shipment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Order</Label>
            <Select value={form.orderId} onValueChange={(v) => setForm({ ...form, orderId: v })}>
              <SelectTrigger aria-label="Select order"><SelectValue placeholder="Select order without shipment" /></SelectTrigger>
              <SelectContent>
                {eligible.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.orderNumber}, {o.quote?.request?.buyer?.name} ({o.quote?.request?.product})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="s-cn">Container number</Label><Input id="s-cn" value={form.containerNumber} onChange={set("containerNumber")} placeholder="MSKU4821103" /></div>
            <div><Label htmlFor="s-bol">BOL number</Label><Input id="s-bol" value={form.bolNumber} onChange={set("bolNumber")} placeholder="BOL-558201" /></div>
            <div><Label htmlFor="s-vessel">Vessel name</Label><Input id="s-vessel" value={form.vesselName} onChange={set("vesselName")} placeholder="MV Pacific Grain" /></div>
            <div><Label htmlFor="s-carrier">Carrier</Label><Input id="s-carrier" value={form.carrier} onChange={set("carrier")} placeholder="Maersk" /></div>
            <div><Label htmlFor="s-dep">Departure port</Label><Input id="s-dep" value={form.departurePort} onChange={set("departurePort")} /></div>
            <div><Label htmlFor="s-dest">Destination port</Label><Input id="s-dest" value={form.destinationPort} onChange={set("destinationPort")} /></div>
          </div>
          <div><Label htmlFor="s-eta">ETA</Label><Input id="s-eta" type="date" value={form.eta} onChange={set("eta")} /></div>
          <Button
            className="w-full bg-teal-500 hover:bg-teal-600"
            disabled={!valid || add.isPending}
            onClick={() =>
              add.mutate({
                orderId: Number(form.orderId),
                containerNumber: form.containerNumber,
                bolNumber: form.bolNumber,
                vesselName: form.vesselName,
                carrier: form.carrier,
                departurePort: form.departurePort,
                destinationPort: form.destinationPort,
                eta: new Date(form.eta),
              })
            }
          >
            Add shipment & start tracking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

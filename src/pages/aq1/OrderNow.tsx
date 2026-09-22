import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { useProfile } from "@/hooks/useProfile";
import { AQ1_PRODUCTS, PACKING_STYLES, INCOTERMS, PORTS, MEMBERSHIP_PLANS_TEASER } from "@contracts/aq1";
import { toast } from "sonner";

/** Order Fertilizer Now — two-step AQ0 upgrade funnel.
 *  Step 1 captures the requirement (saved even if Step 2 is abandoned);
 *  Step 2 hands off to the existing AQ0 membership checkout. */
export default function Aq1OrderNow() {
  const tips = useAq1Tips();
  const { isMember } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [reqId, setReqId] = useState<number | null>(null);
  const [f, setF] = useState({
    product: "", grade: "", quantityMt: "", packingStyle: "", portOfEntry: "", destinationPort: "",
    finalDeliveryLocation: "", deliveryWindowFrom: "", deliveryWindowTo: "",
    targetPrice: "", currency: "USD", incoterm: "", notes: "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const create = trpc.aq1.requirementCreate.useMutation({
    onSuccess: (r) => { setReqId(r.id); setStep(2); toast.success("Requirement captured — the desk has it even if you stop here"); },
    onError: (e) => toast.error(e.message),
  });
  const status = trpc.aq1.requirementStatus.useMutation();

  const valid1 = f.product && f.quantityMt && f.packingStyle && f.portOfEntry && f.destinationPort && f.deliveryWindowFrom && f.deliveryWindowTo;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Order Fertilizer Now <InfoTip label="Order Fertilizer Now" text={tips.orderNow} /></span>}
        description="Tell the desk what you need — we source it, price it and ship it."
      />
      <ol className="flex gap-2 text-sm" aria-label="Progress">
        <li className={`rounded-full px-3 py-1 ${step === 1 ? "bg-navy-700 text-white dark:bg-navy-300 dark:text-navy-900" : "bg-secondary"}`}>1 · What do you need?</li>
        <li className={`rounded-full px-3 py-1 ${step === 2 ? "bg-navy-700 text-white dark:bg-navy-300 dark:text-navy-900" : "bg-secondary"}`}>2 · Unlock ordering with AQ0</li>
      </ol>

      {step === 1 && (
        <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <Label htmlFor="product">Product *</Label>
            <Select value={f.product} onValueChange={set("product")}>
              <SelectTrigger id="product" className="mt-1"><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{AQ1_PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="grade">Grade or specification (optional)</Label>
            <Input id="grade" className="mt-1" value={f.grade} onChange={(e) => set("grade")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="qty">Quantity in MT *</Label>
            <Input id="qty" type="number" min={1} className="mt-1 tabular-nums" value={f.quantityMt} onChange={(e) => set("quantityMt")(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="packing">Packing style *</Label>
            <Select value={f.packingStyle} onValueChange={set("packingStyle")}>
              <SelectTrigger id="packing" className="mt-1"><SelectValue placeholder="Select packing" /></SelectTrigger>
              <SelectContent>{PACKING_STYLES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {([["portOfEntry", "Port of entry * — the first port the cargo enters the destination country"],
             ["destinationPort", "Port of destination / final discharge port *"]] as const).map(([k, label]) => (
            <div key={k}>
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} className="mt-1" list={`${k}-list`} value={f[k]} onChange={(e) => set(k)(e.target.value)} />
              <datalist id={`${k}-list`}>{PORTS.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
          ))}
          <div>
            <Label htmlFor="fdl">Final delivery location (optional) — warehouse, depot or farm</Label>
            <Input id="fdl" className="mt-1" value={f.finalDeliveryLocation} onChange={(e) => set("finalDeliveryLocation")(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dwf">Delivery window from *</Label>
              <Input id="dwf" type="date" className="mt-1" value={f.deliveryWindowFrom} onChange={(e) => set("deliveryWindowFrom")(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dwt">Delivery window to *</Label>
              <Input id="dwt" type="date" className="mt-1" value={f.deliveryWindowTo} onChange={(e) => set("deliveryWindowTo")(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="tp">Target price (optional)</Label>
              <Input id="tp" type="number" min={0} className="mt-1 tabular-nums" value={f.targetPrice} onChange={(e) => set("targetPrice")(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cur">Currency</Label>
              <Select value={f.currency} onValueChange={set("currency")}>
                <SelectTrigger id="cur" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="incoterm">Incoterm preference (optional)</Label>
            <Select value={f.incoterm} onValueChange={set("incoterm")}>
              <SelectTrigger id="incoterm" className="mt-1"><SelectValue placeholder="No preference" /></SelectTrigger>
              <SelectContent>{INCOTERMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" className="mt-1" value={f.notes} onChange={(e) => set("notes")(e.target.value)} maxLength={2000} />
          </div>
          <div className="md:col-span-2">
            <Button disabled={!valid1 || create.isPending} onClick={() => create.mutate({
              product: f.product, grade: f.grade, quantityMt: Number(f.quantityMt), packingStyle: f.packingStyle,
              portOfEntry: f.portOfEntry, destinationPort: f.destinationPort, finalDeliveryLocation: f.finalDeliveryLocation,
              deliveryWindowFrom: f.deliveryWindowFrom, deliveryWindowTo: f.deliveryWindowTo,
              targetPrice: f.targetPrice ? Number(f.targetPrice) : undefined, currency: f.currency,
              incoterm: f.incoterm || undefined, notes: f.notes,
            })}>{create.isPending ? "Saving…" : "Continue"}</Button>
            <p className="mt-2 text-xs text-muted-foreground">Your requirement is saved when you continue, even if you don't finish step 2 — the desk can pick it up either way.</p>
          </div>
        </CardContent></Card>
      )}

      {step === 2 && (
        <Card><CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Unlock ordering with AQ0</h2>
          {isMember ? (
            <p className="text-sm">You're already on AQ0 — your requirement is with the desk and you can raise it as a live order enquiry now.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">AQ0 unlocks: AI-assisted quotes, firm orders, supplier sourcing, contracts and invoices, shipment tracking, and direct desk access. {MEMBERSHIP_PLANS_TEASER}</p>
            </>
          )}
          <div className="flex flex-wrap gap-3">
            {isMember ? (
              <Button onClick={() => { if (reqId) status.mutate({ id: reqId, status: "upgraded" }); navigate("/buyer/request"); }}>Raise it as an order enquiry</Button>
            ) : (
              <Button onClick={() => { if (reqId) status.mutate({ id: reqId, status: "upgrade_started" }); navigate("/buyer/membership"); }}>Upgrade to AQ0</Button>
            )}
            <Button variant="outline" onClick={() => { if (reqId) status.mutate({ id: reqId, status: "callback_requested" }); toast.success("The desk will call you"); }}>
              Have the desk call me instead
            </Button>
            <Button variant="ghost" asChild><Link to="/account/telex">Maybe later</Link></Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

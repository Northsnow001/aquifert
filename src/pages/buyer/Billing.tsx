/**
 * PLANS PART 4 — Billing section.
 *
 * Current plan, next renewal date + amount, pending change with undo,
 * payment-method update (hosted by the processor — card data never touches
 * this app), sequential invoice history, VAT/billing details, and cancel.
 */
import { useState } from "react";
import { Link } from "react-router";
import { CreditCard, FileText, Loader2, RefreshCw, Undo2, Download } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

function fmt(minor: number) {
  return `£${(minor / 100).toFixed(2)}`;
}

export default function BuyerBilling() {
  const utils = trpc.useUtils();
  const { data: summary, refetch } = trpc.billing.mySummary.useQuery(undefined, { staleTime: 15_000 });
  const { data: invoices } = trpc.billing.invoices.useQuery();
  const { data: profile } = trpc.billing.profile.useQuery();

  const refresh = trpc.billing.refreshStatus.useMutation({
    onSuccess: () => { toast.success("Billing status refreshed."); utils.billing.mySummary.invalidate(); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const undo = trpc.billing.undoPending.useMutation({
    onSuccess: () => { toast.success("Plan change cancelled."); utils.billing.mySummary.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCard = trpc.billing.updatePaymentMethod.useMutation({
    onSuccess: (r) => {
      if (r.url.startsWith("http")) window.open(r.url, "_blank", "noopener");
      else toast.success("Demo mode: a card-update link would open here. No card data ever touches Aquifert.");
    },
    onError: (e) => toast.error(e.message),
  });
  const cancel = trpc.billing.cancel.useMutation({
    onSuccess: (r) => {
      toast.success(r.applied === "immediate" ? "Subscription cancelled." : "Cancellation scheduled for the end of your period.");
      utils.billing.mySummary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [vatForm, setVatForm] = useState({ billingName: "", billingEmail: "", country: "", vatNumber: "", addressLine: "" });
  const [vatLoaded, setVatLoaded] = useState(false);
  if (profile && !vatLoaded) { setVatForm({
    billingName: profile.billingName ?? "", billingEmail: profile.billingEmail ?? "",
    country: profile.country ?? "", vatNumber: profile.vatNumber ?? "", addressLine: profile.addressLine ?? "",
  }); setVatLoaded(true); }
  const saveProfile = trpc.billing.updateProfile.useMutation({
    onSuccess: () => toast.success("Billing details saved."),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 dark:text-slate-100">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your plan, payments and invoices. Card details are handled by our payment processor — Aquifert never sees or stores them.</p>
        </div>
        <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />}
          Refresh billing status
        </Button>
      </div>

      {/* CURRENT PLAN */}
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {summary?.plan?.family === "analytics" ? "Analytics & licensed data only — no physical trading." : "Trading and market intelligence."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl font-bold text-navy-900 dark:text-slate-100">{summary?.plan?.displayName ?? "—"}</span>
            <Badge variant={summary?.status === "past_due" ? "destructive" : "secondary"}>{summary?.status ?? "…"}</Badge>
            <Badge variant="outline">{summary?.interval === "annual" ? "Annual billing" : "Monthly billing"}</Badge>
          </div>
          {summary?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Next renewal: {new Date(summary.currentPeriodEnd.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          {summary?.pendingChange && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <span>Pending change to <strong>{summary.pendingChange.displayName}</strong> on{" "}
                {new Date(summary.pendingChange.effectiveAt.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</span>
              <Button size="sm" variant="outline" className="border-amber-400" onClick={() => undo.mutate()} disabled={undo.isPending}>
                <Undo2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Undo
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/pricing">Compare plans</Link></Button>
            <Button onClick={() => updateCard.mutate()} disabled={updateCard.isPending}>
              <CreditCard className="mr-1.5 h-4 w-4" aria-hidden />
              {summary?.hasCardOnFile ? "Update payment method" : "Add payment method"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground">Cancel subscription</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your plan moves to AQ1 (free) at the end of the current period — no refund is issued.
                    Everything you have saved stays accessible: over-limit saved items become read-only and
                    are never deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate()} disabled={cancel.isPending}>Cancel at period end</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* VAT / BILLING DETAILS */}
      <Card>
        <CardHeader>
          <CardTitle>Billing details &amp; VAT</CardTitle>
          <CardDescription>Used on every invoice. EU businesses with a valid VAT number are reverse-charged.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(vatForm); }}>
            <div className="space-y-1.5"><Label htmlFor="bname">Billing name</Label><Input id="bname" value={vatForm.billingName} onChange={(e) => setVatForm({ ...vatForm, billingName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bemail">Billing email</Label><Input id="bemail" type="email" value={vatForm.billingEmail} onChange={(e) => setVatForm({ ...vatForm, billingEmail: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bcountry">Country (ISO, e.g. GB)</Label><Input id="bcountry" maxLength={2} value={vatForm.country} onChange={(e) => setVatForm({ ...vatForm, country: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bvat">VAT number (optional)</Label><Input id="bvat" value={vatForm.vatNumber} onChange={(e) => setVatForm({ ...vatForm, vatNumber: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="baddr">Address</Label><Input id="baddr" value={vatForm.addressLine} onChange={(e) => setVatForm({ ...vatForm, addressLine: e.target.value })} /></div>
            <div><Button type="submit" disabled={saveProfile.isPending}>Save billing details</Button></div>
          </form>
        </CardContent>
      </Card>

      {/* INVOICES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" aria-hidden /> Invoices</CardTitle>
          <CardDescription>Sequential and gapless. Every invoice is emailed to your billing address.</CardDescription>
        </CardHeader>
        <CardContent>
          {(invoices?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Download</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices!.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-[13px]">{inv.invoiceNumber}</TableCell>
                    <TableCell>{new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={inv.description}>{inv.description}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(inv.totalMinor)}</TableCell>
                    <TableCell><Badge variant={inv.status === "paid" ? "secondary" : "destructive"}>{inv.status}</Badge></TableCell>
                    <TableCell>
                      {inv.emailedAt && <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground" title={`Emailed ${new Date(inv.emailedAt).toLocaleDateString("en-GB")}`}><Download className="h-3.5 w-3.5" aria-hidden /> Emailed</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

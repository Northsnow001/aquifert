import { useEffect, useState } from "react";
import { Check, Crown, CreditCard, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEMBERSHIP_PLANS } from "@contracts/constants";
import { gbp } from "@/lib/format";
import { toast } from "sonner";

/** Tiny CSS confetti burst */
function Confetti() {
  const pieces = Array.from({ length: 40 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute block h-2 w-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-8px",
            background: ["#4F7F72", "#254F76", "#FF8C00", "#4CAF50", "#31648F"][i % 5],
            animation: `aqf-confetti ${1.4 + Math.random()}s ease-in ${Math.random() * 0.4}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes aqf-confetti { to { transform: translateY(420px) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}

export default function BuyerMembership() {
  const { membership } = useProfile();
  const utils = trpc.useUtils();
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [checkout, setCheckout] = useState<{ tier: "SPROUT" | "HARVEST" | "SCALE" } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  const subscribe = trpc.membership.subscribe.useMutation({
    onSuccess: (r) => {
      setCheckout(null);
      setSuccess(r.tier);
      utils.profile.me.invalidate();
      utils.membership.current.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const cancel = trpc.membership.cancel.useMutation({
    onSuccess: () => {
      toast.success("Membership cancelled, benefits remain until period end");
      utils.profile.me.invalidate();
    },
  });

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4500);
      return () => clearTimeout(t);
    }
  }, [success]);

  const selectedPlan = checkout ? MEMBERSHIP_PLANS.find((p) => p.tier === checkout.tier)! : null;
  const price = (p: (typeof MEMBERSHIP_PLANS)[number]) => (cycle === "ANNUAL" ? p.annual : p.monthly);

  return (
    <div className="relative">
      {success && <Confetti />}

      <PageHeader
        title="Membership"
        description="One flat fee replaces the margin on every quote. Upgrade, downgrade or cancel any time."
        actions={
          <div className="flex items-center rounded-full border border-border bg-card p-1 text-sm font-medium">
            {(["MONTHLY", "ANNUAL"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`rounded-full px-4 py-1.5 transition-colors ${cycle === c ? "bg-navy-600 text-white" : "text-muted-foreground"}`}
                aria-label={`${c.toLowerCase()} billing`}
              >
                {c === "ANNUAL" ? "Annual −10%" : "Monthly"}
              </button>
            ))}
          </div>
        }
      />

      {success && (
        <div className="aqf-pop mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="font-bold text-emerald-700 dark:text-emerald-300">
            Welcome to {MEMBERSHIP_PLANS.find((p) => p.tier === success)?.name}! Your membership is active, cost-to-cost pricing unlocked.
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {MEMBERSHIP_PLANS.map((plan, i) => {
          const current = membership?.tier === plan.tier;
          return (
            <Card key={plan.tier} className={`aqf-card-hover relative ${i === 1 ? "border-2 border-teal-500 shadow-lg" : ""} ${current ? "ring-2 ring-emerald-500" : ""}`}>
              {i === 1 && !current && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-3 py-1 text-[11px] font-bold text-white">MOST POPULAR</span>
              )}
              {current && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white">YOUR CURRENT PLAN</span>
              )}
              <CardContent className="p-6">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.tonnage}</p>
                <p className="mt-4">
                  <span className="font-data text-3xl font-extrabold">{gbp(price(plan))}</span>
                  <span className="text-sm text-muted-foreground">/{cycle === "ANNUAL" ? "yr" : "mo"}</span>
                </p>
                {cycle === "ANNUAL" && (
                  <p className="text-xs font-medium text-emerald-600">Save {gbp(plan.monthly * 12 - plan.annual)} vs monthly</p>
                )}
                <ul className="mt-5 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground/60">
                      <X className="mt-0.5 h-4 w-4 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-6 w-full aqf-btn-press ${current ? "bg-muted text-muted-foreground hover:bg-muted" : i === 1 ? "bg-teal-500 hover:bg-teal-600" : "bg-navy-600 hover:bg-navy-700"}`}
                  disabled={current}
                  onClick={() => setCheckout({ tier: plan.tier })}
                >
                  {current ? "Current plan" : membership ? `Switch to ${plan.name}` : `Select ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {membership && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm">
            <p className="font-semibold">
              {MEMBERSHIP_PLANS.find((p) => p.tier === membership.tier)?.name} · {membership.billingCycle.toLowerCase()} billing · auto-renew {membership.autoRenew ? "on" : "off"}
            </p>
            <p className="text-xs text-muted-foreground">
              {membership.currentMonthTonnage}t of {membership.monthlyTonnageLimit}t used this month
            </p>
          </div>
          <Button variant="outline" className="text-danger hover:text-danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            Cancel membership
          </Button>
        </div>
      )}

      {/* Simulated Stripe Checkout */}
      <Dialog open={!!checkout} onOpenChange={(o) => !o && setCheckout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-navy-600" /> Checkout, {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl bg-muted p-3.5 text-sm">
            <div className="flex justify-between font-bold">
              <span>{selectedPlan?.name} ({cycle.toLowerCase()})</span>
              <span className="font-data">{selectedPlan ? gbp(price(selectedPlan)) : ""}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Secured by Stripe · cancel any time</p>
          </div>
          <div className="space-y-3">
            <div><Label htmlFor="cc-name">Name on card</Label><Input id="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="J Whitfield" /></div>
            <div><Label htmlFor="cc-num">Card number</Label><Input id="cc-num" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="cc-exp">Expiry</Label><Input id="cc-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="12/28" /></div>
              <div><Label htmlFor="cc-cvc">CVC</Label><Input id="cc-cvc" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" /></div>
            </div>
            <Button
              className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press"
              disabled={subscribe.isPending || !card.number || !card.name}
              onClick={() => checkout && subscribe.mutate({ tier: checkout.tier, billingCycle: cycle })}
            >
              <Crown className="mr-1.5 h-4 w-4" />
              {subscribe.isPending ? "Processing…" : `Pay ${selectedPlan ? gbp(price(selectedPlan)) : ""} & activate`}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">Demo checkout, no real payment is processed.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

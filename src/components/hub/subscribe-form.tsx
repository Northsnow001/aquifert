import { openBillingPortal, startCheckout } from "@/app/hub/billing/actions";
import type { BillingOffer } from "@/lib/billing/catalog";

/** Starts Stripe Checkout. The label is the button the member already sees on the plan. */
export function SubscribeForm({ offer, className, children }: { offer: BillingOffer; className: string; children: React.ReactNode }) {
  if (typeof children === "string" && !children.trim()) return null;
  return (
    <form action={startCheckout}>
      <input type="hidden" name="offer" value={offer} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

export function ManageBillingForm({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <form action={openBillingPortal}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

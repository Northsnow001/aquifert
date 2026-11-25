const COPY: Record<string, string> = {
  missing_key: "Card checkout is not connected on this server yet. Add the Stripe secret key, then try again.",
  missing_price: "This plan does not have a Stripe price yet. Add its price id, then try again.",
  stripe: "Stripe could not start the payment. Try again in a moment.",
  forbidden: "That payment belongs to a different account.",
  incomplete: "The payment is not complete yet.",
  portal: "The billing portal could not be opened. Enable the Stripe customer portal, then try again.",
  invalid: "Choose AQ Analytics or an AQ Zero tier.",
};

export function BillingNotice({ code }: { code?: string }) {
  if (!code) return null;
  return <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14.5px] leading-relaxed text-amber-950">{COPY[code] ?? COPY.stripe}</p>;
}

import { startMockSubscription } from "@/app/hub/onboarding-actions";
import { PLAN_LABEL } from "@/lib/aq-modules/types";

/** Admin-only stand-in for Stripe. Members keep the normal request path. */
export function MockSubscribe({
  plan,
  subscribed,
}: {
  plan: "growth" | "enterprise";
  subscribed: boolean;
}) {
  const name = PLAN_LABEL[plan];
  return (
    <form action={startMockSubscription} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-amber-800">Admin mock checkout</p>
        <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-amber-950">
          Stripe will take payment here later. This mock opens {name} for your admin account only. The dashboard stays closed until you answer the onboarding questions.
        </p>
      </div>
      <input type="hidden" name="plan" value={plan} />
      <button type="submit" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#0C1C2E] px-4 text-[13.5px] font-semibold text-white">
        {subscribed ? "Open dashboard" : `Mock subscribe to ${name}`}
      </button>
    </form>
  );
}

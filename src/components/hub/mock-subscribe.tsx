import { startMockSubscription } from "@/app/hub/onboarding-actions";

/** Admin-only stand-in for Stripe. Members do not see this. */
export function MockSubscribe({ subscribed }: { subscribed: boolean }) {
  return (
    <form action={startMockSubscription} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-amber-800">Admin demo</p>
        <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-amber-950">
          This opens AQ Analytics on your admin account only. Members cannot subscribe until Stripe is connected. The questions come first, then the dashboard.
        </p>
      </div>
      <input type="hidden" name="plan" value="growth" />
      <button type="submit" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#0C1C2E] px-4 text-[13.5px] font-semibold text-white">
        {subscribed ? "Open AQ Analytics" : "Demo subscribe to AQ Analytics"}
      </button>
    </form>
  );
}

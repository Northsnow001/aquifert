import { subscription } from "@/data/sample";

export default function SubscriptionsPage() {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h1 className="text-lg font-black">Subscriptions</h1>
      <p className="mt-3 text-sm">{subscription.plan} · {subscription.status}</p>
      <p className="text-sm text-mid">Renews {subscription.renews}</p>
    </section>
  );
}

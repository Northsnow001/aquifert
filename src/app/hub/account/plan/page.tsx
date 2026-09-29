const plans = [
  { name: "Core", price: "$99", detail: "Hub, library, and limited calculator runs." },
  { name: "Growth", price: "$249", detail: "Full calculator access and Aquibot history." },
  { name: "Enterprise", price: "Talk to us", detail: "Desk coverage and custom limits." },
];

export default function PlanPage() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {plans.map((plan) => (
        <article key={plan.name} className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-black">{plan.name}</h2>
          <p className="mt-1 font-mono text-blue">{plan.price}</p>
          <p className="mt-2 text-sm text-mid">{plan.detail}</p>
          <p className="mt-4 text-xs text-dim">Checkout is not connected in this build.</p>
        </article>
      ))}
    </section>
  );
}

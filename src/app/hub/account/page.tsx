import Link from "next/link";
import { getSession } from "@/lib/session";
import { subscription } from "@/data/sample";

export default async function AccountPage() {
  const user = await getSession();
  return (
    <section className="max-w-2xl rounded-xl border border-border bg-surface p-5">
      <h1 className="text-lg font-black">Account</h1>
      <p className="mt-2 text-sm text-mid">{user?.name} · {user?.email}</p>
      <p className="mt-1 text-sm">Plan {subscription.plan} · {subscription.status} · renews {subscription.renews}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {[
          ["/hub/account/profile", "Profile"],
          ["/hub/account/plan", "Plan"],
          ["/hub/account/subscriptions", "Subscriptions"],
          ["/hub/account/payments", "Payments"],
          ["/hub/account/password", "Password"],
          ["/hub/account/legal", "Legal"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border border-border px-3 py-1.5 text-blue">
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

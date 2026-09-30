import Link from "next/link";
import { OrderDeskBoard } from "@/components/hub/order-desk-board";
import { ZeroPanel } from "@/components/hub/zero-panel";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { getSession } from "@/lib/session";
import { findZeroRegistration } from "@/lib/zero-interest";

export default async function OrderDeskPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, user] = await Promise.all([searchParams, getSession()]);
  const settings = await getDeskSettings();
  const showZero = settings.zero.showOnHub;
  const zero = showZero && tab === "zero";
  const registration = zero && user ? await findZeroRegistration(user) : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Order Desk</h1>
        <p className="mt-1 text-sm text-mid">
          {zero ? "Supplier-cost buying with a fixed operations fee. Register now for the pilot." : "Your enquiry goes directly to the Aquifert trading desk."}
        </p>
      </div>

      {showZero ? (
        <nav className="flex gap-1 rounded-xl border border-border bg-surface p-1" aria-label="Order Desk sections">
          {[
            { href: "/hub/order-desk", label: "Trading Desk", active: !zero },
            { href: "/hub/order-desk?tab=zero", label: "Aquifert Zero", active: zero, badge: "Coming soon" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold no-underline transition ${
                item.active ? "bg-blue text-white shadow-sm" : "text-mid hover:bg-s2 hover:text-ink"
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className={`rounded-full px-1.5 py-px font-mono text-[10px] uppercase tracking-wide ${item.active ? "bg-white/20 text-white" : "bg-[#fff4de] text-[#9a5b00]"}`}>{item.badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      ) : null}

      {zero ? (
        <ZeroPanel
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          success={settings.zero.success}
          registered={registration ? { at: registration.at, product: registration.product, annualVolume: registration.annualVolume, company: registration.company } : null}
        />
      ) : (
        <OrderDeskBoard name={user?.name ?? ""} email={user?.email ?? ""} success={settings.orderDesk.success} />
      )}
    </div>
  );
}

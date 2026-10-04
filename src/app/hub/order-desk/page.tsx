import Link from "next/link";
import { OrderDeskBoard } from "@/components/hub/order-desk-board";
import { ComparePlans } from "@/components/hub/plans/compare-plans";
import { planAllowances } from "@/components/hub/plans/load";
import { ZeroPanel } from "@/components/hub/zero-panel";
import { isAdminUser } from "@/lib/admin-access";
import { getAqModules } from "@/lib/aq-modules/store";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { activePorts, getFreightDesk } from "@/lib/freight-desk/store";
import { resolvePort } from "@/lib/ports";
import { getSession } from "@/lib/session";
import { findZeroRegistration } from "@/lib/zero-interest";
import { intentOf } from "@/lib/zero-types";

export default async function OrderDeskPage({ searchParams }: { searchParams: Promise<{ tab?: string; product?: string; destination?: string }> }) {
  const [{ tab, product, destination }, user] = await Promise.all([searchParams, getSession()]);
  const [settings, freight] = await Promise.all([getDeskSettings(), getFreightDesk()]);
  const ports = activePorts(freight);
  const showZero = settings.zero.showOnHub;
  const prefilled = Boolean(product || destination);
  const zero = showZero && (tab === "zero" || (tab !== "desk" && !prefilled));
  const [registration, modules] = zero ? await Promise.all([user ? findZeroRegistration(user) : null, getAqModules()]) : [null, null];
  const allowances = modules ? await planAllowances(modules) : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink md:text-[30px]">Buy Fertilizer</h1>
        <p className="mt-1 text-[15.5px] text-mid">
          {zero ? "Supplier-cost buying with a fixed operations fee. Register now for the pilot." : "Your enquiry goes directly to the Aquifert trading desk."}
        </p>
      </div>

      {showZero ? (
        <nav className="flex gap-1 rounded-full bg-black/[.05] p-1" aria-label="Order Desk sections">
          {[
            { href: "/hub/order-desk?tab=zero", label: "Aquifert Zero", active: zero, badge: "Soon" },
            { href: "/hub/order-desk?tab=desk", label: "Trading Desk", active: !zero },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-[15px] font-semibold no-underline transition ${
                item.active ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid hover:text-ink"
              }`}
            >
              {item.label}
              {item.badge ? <span className="rounded-full bg-[#fff4de] px-1.5 py-px font-mono text-[11px] uppercase tracking-wide text-[#9a5b00]">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}

      {zero ? (
        <ZeroPanel
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          plan={user?.plan ?? "core"}
          admin={isAdminUser(user)}
          success={settings.zero.success}
          registered={
            registration
              ? {
                  at: registration.at,
                  programme: registration.programme ?? null,
                  intent: intentOf(registration),
                  callDate: registration.callDate ?? "",
                  callWindow: registration.callWindow ?? "",
                  phone: registration.phone ?? "",
                  product: registration.product,
                  annualVolume: registration.annualVolume,
                  company: registration.company,
                }
              : null
          }
          compare={modules && allowances ? <ComparePlans plan={user?.plan ?? null} allowances={allowances} access={modules.access} /> : null}
        />
      ) : (
        <OrderDeskBoard
          name={user?.name ?? ""}
          email={user?.email ?? ""}
          success={settings.orderDesk.success}
          ports={ports}
          initial={{ product: typeof product === "string" ? product : undefined, destination: typeof destination === "string" ? resolvePort(destination, ports) : undefined }}
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { getDeskSettings } from "@/lib/desk-settings/store";

export type OrderSection = "zero" | "desk";

export async function OrderSectionNav({ current }: { current: OrderSection }) {
  const settings = await getDeskSettings();
  const items: { id: OrderSection; href: string; label: string; badge?: string }[] = [
    ...(settings.zero.showOnHub ? [{ id: "zero" as const, href: "/hub/order-desk?tab=zero", label: "Aquifert Zero", badge: "Soon" }] : []),
    { id: "desk", href: "/hub/order-desk?tab=desk", label: "Trading Desk" },
  ];
  return (
    <nav className="flex flex-wrap gap-1 rounded-full bg-black/[.05] p-1" aria-label="Buy Fertiliser">
      {items.map((item) => {
        const on = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[14.5px] font-semibold no-underline transition ${
              on ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid hover:text-ink"
            }`}
          >
            {item.label}
            {item.badge ? <span className="rounded-full bg-[#fff4de] px-1.5 py-px font-mono text-[11px] uppercase tracking-wide text-[#9a5b00]">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

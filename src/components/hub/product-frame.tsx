"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, LayoutDashboard, ShoppingCart, type LucideIcon } from "lucide-react";
import { HUB_NAV, isActive } from "@/components/hub/nav";

const ZERO: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/hub/zero", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hub/order-desk?tab=desk", label: "Buy fertiliser", icon: ShoppingCart },
  { href: "/hub/account/profile", label: "Preferences", icon: CircleUser },
];

function current(pathname: string, href: string) {
  if (href.includes("?")) return false;
  if (href === "/hub/tools/analytics") return pathname === href;
  return isActive(pathname, href);
}

/** Left menu for a paid product. The Aquifert ONE header stays above it. */
export function ProductRail({ product }: { product: "analytics" | "zero" }) {
  const pathname = usePathname();
  const title = product === "analytics" ? "AQ Analytics" : "AQ Zero";
  const links =
    product === "analytics"
      ? [
          { href: "/hub/tools/analytics/home", label: "Dashboard", icon: LayoutDashboard as LucideIcon },
          ...HUB_NAV.filter((item) => item.analyticsTool).map((item) => ({
            href: item.href,
            label: item.label,
            icon: (item.icon === "aquibot" ? LayoutDashboard : item.icon) as LucideIcon,
          })),
          { href: "/hub/account/profile", label: "Preferences", icon: CircleUser },
        ]
      : ZERO;

  const menu = (row: boolean) => (
    <nav className={row ? "flex gap-1 overflow-x-auto px-2 pb-3" : "flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4"} aria-label={title}>
      {links.map((item) => {
        const on = current(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium no-underline ${
              row ? "whitespace-nowrap" : ""
            } ${on ? "bg-white text-ink shadow-sm" : "text-mid hover:bg-white/70 hover:text-ink"}`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="aq-rail hidden w-[232px] shrink-0 flex-col border-r border-black/[.06] lg:flex">
        <p className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{title}</p>
        {menu(false)}
      </aside>
      <div className="aq-rail shrink-0 border-b border-black/[.06] pt-2 lg:hidden">{menu(true)}</div>
    </>
  );
}

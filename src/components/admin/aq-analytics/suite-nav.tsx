"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/aq-analytics", label: "Map" },
  { href: "/admin/aq-analytics/board", label: "Freight Analytics" },
  { href: "/admin/aq-analytics/market", label: "My market" },
  { href: "/admin/aq-analytics/producers", label: "Producers" },
  { href: "/admin/aq-analytics/enquiries", label: "Freight enquiries" },
  { href: "/admin/aq-analytics/calculator", label: "Calculator" },
  { href: "/admin/aq-analytics/reports", label: "Reports" },
  { href: "/admin/aq-analytics/alerts", label: "Alerts" },
  { href: "/admin/aq-analytics/plans", label: "Plans" },
];

export function SuiteNav({ dataNow, sample }: { dataNow: string; sample?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex flex-col gap-2">
      <nav className="flex flex-wrap gap-1.5">
        {ITEMS.map((item) => {
          const active = item.href === "/admin/aq-analytics" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold no-underline ${
                active ? "bg-blue text-white" : "bg-s2 text-mid hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="text-[12px] text-dim">
        BL data to {dataNow}
        {sample ? <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">Sample data</span> : null}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS: { href: string; label: string; id: string }[] = [
  { href: "/hub/tools", label: "World Map", id: "world" },
  { href: "/hub/tools?view=calc", label: "Cost Calculator", id: "calc" },
  { href: "/hub/tools?view=how", label: "How It's Made", id: "how" },
  { href: "/hub/tools?view=glossary", label: "Glossary", id: "glossary" },
  { href: "/hub/tools/analytics", label: "Intelligence map", id: "map" },
  { href: "/hub/tools/analytics/board", label: "Freight board", id: "board" },
  { href: "/hub/tools/analytics/market", label: "My market", id: "market" },
  { href: "/hub/tools/analytics/producers", label: "Producers", id: "producers" },
  { href: "/hub/tools/analytics/enquiries", label: "Freight enquiries", id: "enquiries" },
  { href: "/hub/tools/analytics/calculator", label: "Lane calculator", id: "lane" },
  { href: "/hub/tools/analytics/reports", label: "Reports", id: "reports" },
  { href: "/hub/tools/analytics/alerts", label: "Alerts", id: "alerts" },
  { href: "/hub/tools/analytics/plans", label: "Plans", id: "plans" },
];

function activeId(pathname: string, view: string | null) {
  if (pathname.startsWith("/hub/tools/analytics/board")) return "board";
  if (pathname.startsWith("/hub/tools/analytics/market")) return "market";
  if (pathname.startsWith("/hub/tools/analytics/producers")) return "producers";
  if (pathname.startsWith("/hub/tools/analytics/enquiries")) return "enquiries";
  if (pathname.startsWith("/hub/tools/analytics/calculator")) return "lane";
  if (pathname.startsWith("/hub/tools/analytics/reports")) return "reports";
  if (pathname.startsWith("/hub/tools/analytics/alerts")) return "alerts";
  if (pathname.startsWith("/hub/tools/analytics/plans")) return "plans";
  if (pathname.startsWith("/hub/tools/analytics")) return "map";
  if (view === "calc" || view === "how" || view === "glossary") return view;
  return "world";
}

export function ToolsTabs() {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  const current = activeId(pathname, view);
  return (
    <div className="flex items-end gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item, index) => {
        const on = item.id === current;
        const divider = index === 4;
        return (
          <span key={item.id} className="flex shrink-0 items-end">
            {divider ? <span className="mx-1 mb-2 h-4 w-px bg-border" aria-hidden /> : null}
            <Link
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium no-underline ${
                on ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

export function ToolsHeading() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">AQ Trader Tools</h1>
      <span className="rounded-full border border-border bg-s2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-mid">Beta</span>
    </div>
  );
}

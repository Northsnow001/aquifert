"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TOOLS: { href: string; label: string; id: string }[] = [
  { href: "/hub/tools", label: "World Map", id: "world" },
  { href: "/hub/tools?view=calc", label: "Cost Calculator", id: "calc" },
  { href: "/hub/tools?view=how", label: "How It's Made", id: "how" },
  { href: "/hub/tools?view=glossary", label: "Glossary", id: "glossary" },
];

const ANALYTICS: { href: string; label: string; id: string }[] = [
  { href: "/hub/tools/analytics", label: "Intelligent Map", id: "map" },
  { href: "/hub/tools/analytics/board", label: "Freight Board", id: "board" },
  { href: "/hub/tools/analytics/market", label: "My Market", id: "market" },
  { href: "/hub/tools/analytics/producers", label: "Producers", id: "producers" },
  { href: "/hub/tools/analytics/enquiries", label: "Freight Enquiries", id: "enquiries" },
  { href: "/hub/tools/analytics/reports", label: "Reports", id: "reports" },
  { href: "/hub/tools/analytics/alerts", label: "Alerts", id: "alerts" },
  { href: "/hub/tools/analytics/plans", label: "Plans", id: "plans" },
];

function analyticsId(pathname: string) {
  if (pathname.startsWith("/hub/tools/analytics/board")) return "board";
  if (pathname.startsWith("/hub/tools/analytics/market")) return "market";
  if (pathname.startsWith("/hub/tools/analytics/producers")) return "producers";
  if (pathname.startsWith("/hub/tools/analytics/enquiries")) return "enquiries";
  if (pathname.startsWith("/hub/tools/analytics/reports")) return "reports";
  if (pathname.startsWith("/hub/tools/analytics/alerts")) return "alerts";
  if (pathname.startsWith("/hub/tools/analytics/plans")) return "plans";
  return "map";
}

function TabRow({ items, current }: { items: { href: string; label: string; id: string }[]; current: string }) {
  return (
    <div className="flex items-end gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const on = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium no-underline ${
              on ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ToolsTabs() {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  const current = view === "calc" || view === "how" || view === "glossary" ? view : "world";
  return <TabRow items={TOOLS} current={pathname.startsWith("/hub/tools/analytics") ? "" : current} />;
}

/** Intelligence map, freight board and the rest of the AQ Analytics desk. */
export function AnalyticsTabs() {
  const pathname = usePathname();
  return <TabRow items={ANALYTICS} current={analyticsId(pathname)} />;
}

export function ToolsHeading() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">AQ Trader Tools</h1>
      <span className="rounded-full border border-border bg-s2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-mid">Beta</span>
    </div>
  );
}

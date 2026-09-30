"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  BookOpen,
  Bot,
  Calculator,
  CircleHelp,
  FolderTree,
  Gauge,
  Import,
  Inbox,
  LayoutDashboard,
  Library,
  Radio,
  Scale,
  Settings,
  ShieldBan,
  Ship,
  Table2,
  Zap,
} from "lucide-react";

const ICONS = {
  zero: Zap,
  banned: ShieldBan,
  settings: Settings,
  guide: CircleHelp,
  anchor: Anchor,
  calculator: Calculator,
  scale: Scale,
  aquibot: Bot,
  import: Import,
  dashboard: LayoutDashboard,
  telex: Radio,
  indicators: Gauge,
  hedge: Table2,
  freight: Ship,
  tools: BookOpen,
  library: Library,
  collections: FolderTree,
  inbox: Inbox,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: string | number };
export type NavGroup = { title: string; items: NavItem[] };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
      {groups.map((group) => (
        <div key={group.title} className="flex shrink-0 gap-1 lg:flex-col">
          <p className="hidden px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-dim lg:block">{group.title}</p>
          {group.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium no-underline transition ${
                  active ? "bg-blue text-white shadow-sm" : "text-mid hover:bg-s2 hover:text-ink"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-dim group-hover:text-blue"}`} />
                <span className="flex-1 whitespace-nowrap">{item.label}</span>
                {item.badge !== undefined && item.badge !== 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-px font-mono text-[10.5px] font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-s2 text-mid group-hover:bg-blue-light group-hover:text-blue"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

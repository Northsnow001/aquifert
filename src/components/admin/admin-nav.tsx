"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  BookOpen,
  Bot,
  CalendarClock,
  Calculator,
  ChartColumn,
  ChartLine,
  CircleHelp,
  FlaskConical,
  FolderTree,
  Gauge,
  Import,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Library,
  Newspaper,
  NotebookPen,
  Radio,
  Scale,
  Settings,
  ShieldBan,
  Ship,
  Table2,
  UserPlus,
  Zap,
} from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";

export const ADMIN_ICONS = {
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
  access: KeyRound,
  analysis: NotebookPen,
  marketData: ChartLine,
  calls: CalendarClock,
  supplyDemand: ChartColumn,
  briefing: Newspaper,
  requests: UserPlus,
  nitrogen: FlaskConical,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ADMIN_ICONS; badge?: string | number };
export type NavGroup = { title: string; items: NavItem[] };

const GROUP_TONE: Record<string, string> = {
  Overview: "aq-chip-blue",
  "AQ Modules": "aq-chip-blue",
  Calculators: "aq-chip-blue",
  Desk: "aq-chip-amber",
  Members: "aq-chip-rose",
};

export function isAdminActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavIcon({ item, tone = "", size = 26 }: { item: NavItem; tone?: string; size?: number }) {
  if (item.icon === "aquibot") return <AquibotAvatar size={size} />;
  const Icon = ADMIN_ICONS[item.icon];
  return (
    <span className={`aq-chip ${tone} inline-flex shrink-0 items-center justify-center rounded-[8px] text-white`} style={{ width: size, height: size }}>
      <Icon className="h-[13px] w-[13px]" strokeWidth={2.2} />
    </span>
  );
}

export function AdminNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-4 px-3 pb-4 pt-1">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">{group.title}</p>
          {group.items.map((item) => {
            const active = isAdminActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`aq-nav-link flex items-center gap-2.5 rounded-xl px-2.5 py-[6px] text-[13.5px] no-underline transition-colors ${
                  active ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(16_38_59/0.08),0_4px_12px_-6px_rgb(16_38_59/0.12)]" : "font-medium text-mid hover:bg-white/70 hover:text-ink"
                }`}
              >
                <AdminNavIcon item={item} tone={GROUP_TONE[group.title]} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge !== 0 ? (
                  <span className={`shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums ${active ? "bg-blue-light text-blue" : "bg-black/[.05] text-mid"}`}>
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

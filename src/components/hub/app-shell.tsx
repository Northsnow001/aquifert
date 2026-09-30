"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  ArrowLeftRight,
  BookOpen,
  Bot,
  Calculator,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  UserCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { initials, type SessionUser } from "@/lib/session-shared";

const NAV = [
  { href: "/hub", label: "Home", icon: LayoutDashboard },
  { href: "/hub/freight-calculator", label: "Freight Calculator", icon: Calculator },
  { href: "/hub/netback", label: "Netback", icon: ArrowLeftRight },
  { href: "/hub/library", label: "Library", icon: Archive },
  { href: "/hub/tools", label: "Tools", icon: BookOpen },
  { href: "/hub/contact", label: "Contact Us", icon: Mail },
  { href: "/hub/order-desk", label: "Order Desk", icon: FileText },
  { href: "/hub/aquibot", label: "Aquibot", icon: Bot },
  { href: "/hub/account", label: "Account", icon: UserCircle },
];

function Logo() {
  return (
    <Link href="/hub" className="flex items-center gap-2.5 no-underline">
      <img src="/brand/logo.png" alt="Aquifert" className="h-9 w-auto select-none" draggable={false} />
    </Link>
  );
}

export function AppShell({ user, admin = false, children }: { user: SessionUser; admin?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const planLabel = user.plan.toUpperCase();

  return (
    <div className={`one-grid no-panel relative ${collapsed ? "collapsed" : ""}`}>
      <header className="area-topbar sticky top-0 z-50 flex items-center gap-4 border-b border-border bg-surface px-5">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-mid lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Logo />
        <div className="flex-1" />
        <span className="hidden items-center rounded-full border border-border bg-s2 px-3 py-1 font-mono text-[11px] font-semibold tracking-wide text-mid md:inline-flex">
          {planLabel}
        </span>
        <Link
          href="/hub/account"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-s3 text-[11px] font-bold uppercase text-blue"
        >
          {initials(user.name)}
        </Link>
      </header>

      <aside className={`area-sidebar flex h-full min-h-0 flex-col overflow-y-auto border-r border-border bg-surface py-4 ${mobileOpen ? "open" : ""}`}>
        <div className="mb-3 flex items-center justify-between px-4">
          {collapsed ? null : <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mid">Navigation</p>}
          <button
            type="button"
            className="hidden rounded-md p-1 text-mid lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
        {(admin ? [...NAV, { href: "/admin", label: "Admin", icon: LayoutDashboard }] : NAV).map((item) => {
          const active = item.href === "/hub" ? pathname === "/hub" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={() => setMobileOpen(false)}
              className={`nav-item flex items-center gap-2.5 px-5 py-2 text-[13px] text-mid no-underline ${active ? "active" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              {collapsed ? null : <span>{item.label}</span>}
            </Link>
          );
        })}
        <a
          href="https://aquifert.com"
          target="_blank"
          rel="noreferrer"
          className="nav-item flex items-center gap-2.5 px-5 py-2 text-[13px] text-mid no-underline"
          title="User Guide"
        >
          <BookOpen className="h-4 w-4 shrink-0 opacity-70" />
          {collapsed ? null : <span>User Guide</span>}
        </a>
        <div className="mx-4 mt-auto flex border-t border-border pt-4">
          <form action="/api/logout" method="post">
            <button type="submit" className="flex items-center gap-2 text-xs text-danger" title="Log out">
              <LogOut className="h-3.5 w-3.5" />
              {collapsed ? null : "Log out"}
            </button>
          </form>
        </div>
      </aside>

      <main className="area-main flex min-h-0 min-w-0 flex-col overflow-auto p-6">{children}</main>
    </div>
  );
}

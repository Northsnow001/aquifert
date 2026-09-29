"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  ArrowLeftRight,
  BarChart2,
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
  Send,
  UserCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { initials, type SessionUser } from "@/lib/session-shared";

const NAV = [
  { href: "/hub", label: "Home", icon: LayoutDashboard },
  { href: "/hub/voyage", label: "Voyage", icon: BarChart2 },
  { href: "/hub/freight-calculator", label: "Freight Calculator", icon: Calculator },
  { href: "/hub/netback", label: "Netback", icon: ArrowLeftRight },
  { href: "/hub/library", label: "Library", icon: Archive },
  { href: "/hub/tools", label: "Tools", icon: BookOpen },
  { href: "/hub/contact", label: "Contact Us", icon: Mail },
  { href: "/hub/order-desk", label: "Order Desk", icon: FileText },
  { href: "/hub/aquibot", label: "Aquibot", icon: Bot },
  { href: "/hub/account", label: "Account", icon: UserCircle },
];

const NO_PANEL = new Set(["/hub/freight-calculator", "/hub/netback"]);

function Logo() {
  return (
    <Link href="/hub" className="flex items-center gap-2 no-underline">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <path d="M16 3c6 7 10 11 10 16a10 10 0 1 1-20 0c0-5 4-9 10-16z" fill="#2e6da4" />
        <path d="M16 8c3.2 4 5.5 6.6 5.5 9.2a5.5 5.5 0 1 1-11 0C10.5 14.6 12.8 12 16 8z" fill="#7ec8e3" />
      </svg>
      <span className="text-[22px] font-semibold lowercase tracking-tight text-[#1a6b8a]">aquifert</span>
      <span className="h-6 w-px bg-border" />
      <span className="text-xl font-black uppercase tracking-wider text-ink">One</span>
    </Link>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const noPanel = NO_PANEL.has(pathname) || pathname.startsWith("/hub/account");
  const planLabel = user.plan.toUpperCase();

  return (
    <div className={`one-grid relative ${noPanel ? "no-panel" : ""} ${collapsed ? "collapsed" : ""}`}>
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

      <aside className={`area-sidebar flex flex-col border-r border-border bg-surface py-4 ${mobileOpen ? "open" : ""}`}>
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
        {NAV.map((item) => {
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

      <main className="area-main min-h-0 overflow-auto p-6">{children}</main>

      {noPanel ? null : (
        <aside className="area-panel hidden h-full min-h-0 flex-col border-l border-border bg-surface lg:flex">
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            <span className="rounded-full bg-[#e8f7ee] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#178a4c]">
              LIVE
            </span>
            <button type="button" className="ml-auto rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-mid">
              New chat
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
            <div className="flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl bg-s2 px-3 py-2 text-[13px] leading-relaxed text-ink">
                <p>I&apos;m Aquibot, your Aquifert market assistant. Ask me about fertiliser markets, trade flows, freight, pricing, technical production and manufacturing processes, or anything across your ONE Hub intelligence.</p>
                <p className="mt-2 text-mid">Aquibot can make mistakes. Always verify before acting on anything market-critical.</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-dim">Aquifert version 1.0.8</p>
              </div>
            </div>
          </div>
          <form className="border-t border-border p-3" action="/hub/aquibot">
            <div className="flex items-center gap-2 rounded-full border border-border bg-s2 px-3 py-2">
              <input
                name="q"
                placeholder="Ask anything about the market..."
                className="w-full bg-transparent text-sm outline-none"
              />
              <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-full bg-blue text-white" aria-label="Send">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </aside>
      )}
    </div>
  );
}

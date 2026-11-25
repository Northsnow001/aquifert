"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { HUB_NAV, isActive, type HubNavItem } from "@/components/hub/nav";
import { initials, type SessionUser } from "@/lib/session-shared";

const ZERO: { href: string; label: string }[] = [
  { href: "/hub/zero", label: "Dashboard" },
  { href: "/hub/order-desk?tab=desk", label: "Buy fertiliser" },
  { href: "/hub/account/profile", label: "Preferences" },
];

function NavIcon({ item }: { item: HubNavItem }) {
  if (item.icon === "aquibot") return null;
  const Icon = item.icon;
  return <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />;
}

export function ProductFrame({ product, user, children }: { product: "analytics" | "zero"; user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const analytics = HUB_NAV.filter((item) => item.analyticsTool);
  const home = product === "analytics" ? "/hub/tools/analytics/home" : "/hub/zero";
  const title = product === "analytics" ? "AQ Analytics" : "AQ Zero";

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const rail = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <Image src="/brand/logo.png" alt="Aquifert" width={784} height={209} className="h-7 w-auto" />
      </div>
      <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{title}</p>
      <nav className="flex-1 overflow-y-auto px-2" aria-label={title}>
        <Link
          href={home}
          className={`mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium no-underline ${isActive(pathname, home) ? "bg-white text-ink shadow-sm" : "text-mid hover:bg-white/70 hover:text-ink"}`}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          Dashboard
        </Link>
        {product === "analytics"
          ? analytics.map((item) => {
              const on = isActive(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium no-underline ${on ? "bg-white text-ink shadow-sm" : "text-mid hover:bg-white/70 hover:text-ink"}`}
                >
                  <NavIcon item={item} />
                  {item.label}
                </Link>
              );
            })
          : ZERO.slice(1).map((item) => (
              <Link key={item.href} href={item.href} className="mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-mid no-underline hover:bg-white/70 hover:text-ink">
                {item.label}
              </Link>
            ))}
        {product === "analytics" ? (
          <Link href="/hub/account/profile" className="mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-mid no-underline hover:bg-white/70 hover:text-ink">
            Preferences
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-black/[.06] p-3">
        <Link href="/hub" className="mb-3 flex items-center gap-1.5 px-1 text-[12.5px] font-semibold text-blue no-underline">
          AQ ONE <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e405f] text-[11px] font-bold text-white">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-dim">{user.email}</p>
          </div>
          <form action="/api/logout" method="post">
            <button type="submit" aria-label="Log out" className="flex h-8 w-8 items-center justify-center rounded-full text-dim hover:bg-red-50 hover:text-danger">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="aq-app aq-frame h-dvh overflow-hidden lg:p-2.5">
      <div className="aq-canvas flex h-full overflow-hidden lg:rounded-[22px]">
        <aside className="aq-rail hidden w-[256px] shrink-0 flex-col border-r border-black/[.06] lg:flex">{rail}</aside>
        {drawer ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <aside className="aq-rail absolute inset-y-0 left-0 w-[280px]">{rail}</aside>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-black/[.06] px-4 py-3 lg:hidden">
            <button type="button" aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/[.05]" onClick={() => setDrawer(true)}>
              {drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-[14px] font-semibold">{title}</span>
          </header>
          <main id="main-content" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

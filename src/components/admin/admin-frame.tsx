"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, LogOut, Menu, Search, X } from "lucide-react";
import { AdminNav, AdminNavIcon, isAdminActive, type NavGroup } from "@/components/admin/admin-nav";
import { CommandPalette, openPalette, type PaletteItem } from "@/components/app/command-palette";
import { IdleTimeout } from "@/components/app/idle-timeout";
import { initials, type SessionUser } from "@/lib/session-shared";

function Brand() {
  return (
    <Link href="/admin" aria-label="Admin dashboard" className="flex items-center gap-2 no-underline transition-opacity hover:opacity-80">
      <Image src="/brand/logo.png" alt="Aquifert" width={784} height={209} className="h-7 w-auto" priority />
      <span className="rounded-md bg-ink px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white">Admin</span>
    </Link>
  );
}

function UserCard({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5789b0] to-[#1e405f] text-[12px] font-bold text-white">
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
        <p className="truncate text-[11.5px] text-dim">{user.email}</p>
      </div>
      <form action="/api/logout" method="post">
        <button type="submit" aria-label="Log out" title="Log out" className="flex h-8 w-8 items-center justify-center rounded-full text-dim transition hover:bg-red-50 hover:text-danger">
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function AdminFrame({ user, groups, children }: { user: SessionUser; groups: NavGroup[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  const items = groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));
  const current = items.filter((item) => isAdminActive(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0];

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const palette = useMemo<PaletteItem[]>(
    () => [
      ...groups.flatMap((group) =>
        group.items.map((item) => ({ href: item.href, label: item.label, group: group.title, icon: <AdminNavIcon item={item} size={20} /> })),
      ),
      { href: "/hub", label: "Open the hub", group: "Switch", hint: "Member view" },
    ],
    [groups],
  );

  return (
    <div className="aq-app aq-frame h-dvh overflow-hidden lg:p-2.5">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="aq-canvas flex h-full overflow-hidden lg:rounded-[22px] lg:shadow-[0_24px_64px_-24px_rgb(0_0_0/0.55)]">
        <aside className="aq-rail hidden w-[256px] shrink-0 flex-col border-r border-black/[.06] lg:flex">
          <div className="flex h-16 shrink-0 items-center px-5">
            <Brand />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminNav groups={groups} />
          </div>
          <div className="shrink-0 space-y-3 border-t border-black/[.06] p-3">
            <Link
              href="/hub"
              className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-[12.5px] font-semibold text-ink no-underline shadow-[0_1px_2px_rgb(16_38_59/0.06)] transition hover:bg-white hover:text-blue"
            >
              Open the hub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <div className="px-1">
              <UserCard user={user} />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/[.06] bg-white/80 px-3 sm:px-5 lg:h-16">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-black/[.05] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden min-w-0 items-center gap-2 text-[14px] lg:flex" aria-label="Current page">
              <span className="text-dim">{current?.group ?? "Admin"}</span>
              <span className="text-[#c5cfd9]">/</span>
              <span className="truncate font-semibold text-ink">{current?.label ?? "Dashboard"}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={openPalette}
                aria-label="Search admin"
                className="hidden h-9 w-56 items-center gap-2 rounded-full border border-black/[.08] bg-black/[.03] px-3.5 text-[13px] text-dim transition hover:bg-black/[.05] md:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Jump to…</span>
                <kbd className="rounded border border-black/10 px-1 font-mono text-[10px] font-semibold">Ctrl K</kbd>
              </button>
              <button type="button" onClick={openPalette} aria-label="Search admin" className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-black/[.05] md:hidden">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <Link
                href="/hub"
                className="hidden h-9 items-center gap-1 rounded-full border border-black/[.08] bg-white px-3.5 text-[12.5px] font-semibold text-ink no-underline transition hover:text-blue sm:inline-flex"
              >
                Hub <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </header>

          <div id="aq-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <main id="main-content" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
              <div key={pathname} className="aq-page mx-auto w-full max-w-[1440px]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="aq-backdrop absolute inset-0 cursor-default bg-[#0b1e2d]/45" onClick={() => setDrawer(false)} />
          <div className="aq-drawer aq-rail absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between px-4">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AdminNav groups={groups} onNavigate={() => setDrawer(false)} />
            </div>
            <div className="aq-safe-bottom shrink-0 space-y-3 border-t border-black/[.06] px-4 pt-3">
              <Link href="/hub" onClick={() => setDrawer(false)} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2.5 text-[13px] font-semibold text-ink no-underline">
                Open the hub
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <UserCard user={user} />
            </div>
          </div>
        </div>
      ) : null}

      <CommandPalette items={palette} askHref={null} />
      <IdleTimeout email={user.email} />
    </div>
  );
}

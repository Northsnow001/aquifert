"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PERSONAL = [
  { href: "/hub/account/profile", label: "Profile" },
  { href: "/hub/account/password", label: "Password" },
  { href: "/hub/account/legal", label: "Legal" },
];

const PLAN = [
  { href: "/hub/account/usage", label: "Plan & Usage" },
  { href: "/hub/account/membership", label: "Membership" },
  { href: "/hub/account/billing", label: "Billing" },
];

const isCurrent = (pathname: string, href: string) =>
  href.endsWith("/profile") ? pathname === "/hub/account" || pathname.startsWith(href) : pathname.startsWith(href);

function titleFor(pathname: string) {
  return [...PERSONAL, ...PLAN].find((link) => isCurrent(pathname, link.href))?.label ?? "Profile";
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-2 py-2 text-center text-[14px] font-semibold no-underline transition sm:px-4 sm:py-1.5 sm:text-[14.5px] ${
        active ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

export function AccountFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="max-w-6xl">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-dim">Account</p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[30px]">{titleFor(pathname)}</h1>
      <nav aria-label="Account navigation" className="mt-5 sm:overflow-x-auto">
        <div className="grid gap-2 sm:inline-flex sm:items-center sm:gap-1 sm:rounded-full sm:bg-black/[.05] sm:p-1">
          {[PERSONAL, PLAN].map((group, index) => (
            <div key={index} className="contents sm:flex sm:items-center sm:gap-1">
              {index > 0 ? <span className="mx-1 hidden h-4 w-px shrink-0 bg-black/10 sm:block" aria-hidden /> : null}
              <div className="grid grid-cols-3 gap-1 rounded-full bg-black/[.05] p-1 sm:flex sm:bg-transparent sm:p-0">
                {group.map((link) => (
                  <Tab key={link.href} {...link} active={isCurrent(pathname, link.href)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}

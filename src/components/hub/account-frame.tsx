"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/hub/account/profile", label: "Profile" },
  { href: "/hub/account/plan", label: "Plan" },
  { href: "/hub/account/subscriptions", label: "Subscriptions" },
  { href: "/hub/account/payments", label: "Payments" },
  { href: "/hub/account/password", label: "Password" },
  { href: "/hub/account/legal", label: "Legal" },
];

function titleFor(pathname: string) {
  if (pathname.startsWith("/hub/account/plan")) return "Change your plan";
  if (pathname.startsWith("/hub/account/subscriptions")) return "Subscriptions";
  if (pathname.startsWith("/hub/account/payments")) return "Payments";
  if (pathname.startsWith("/hub/account/password")) return "Password";
  if (pathname.startsWith("/hub/account/legal")) return "Legal";
  return "Profile";
}

export function AccountFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="max-w-6xl">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-dim">Account</p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[30px]">{titleFor(pathname)}</h1>
      <nav aria-label="Account navigation" className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full bg-black/[.05] p-1">
          {LINKS.map((link) => {
            const active = link.href.endsWith("/profile")
              ? pathname === "/hub/account" || pathname.startsWith("/hub/account/profile")
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold no-underline transition ${
                  active ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}

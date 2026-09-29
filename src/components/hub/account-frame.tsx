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
  if (pathname.startsWith("/hub/account/plan")) return "Change Your Plan";
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
      <h1 className="mb-6 text-2xl font-bold leading-none tracking-tight text-ink md:text-4xl">{titleFor(pathname)}</h1>
      <nav aria-label="Account navigation">
        <div className="flex w-full flex-wrap gap-6 border-b border-border">
          {LINKS.map((link) => {
            const active =
              link.href.endsWith("/profile")
                ? pathname === "/hub/account" || pathname.startsWith("/hub/account/profile")
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center border-b-2 pb-3 text-sm font-semibold no-underline transition-colors ${
                  active ? "border-teal text-ink" : "border-transparent text-mid hover:border-border hover:text-ink"
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

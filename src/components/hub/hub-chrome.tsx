"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/hub/app-shell";
import { ProductFrame } from "@/components/hub/product-frame";
import type { SessionUser } from "@/lib/session-shared";
import type { Theme } from "@/lib/theme";

/** AQ ONE keeps AppShell. AQ Analytics and AQ Zero use the left-menu portal. */
export function HubChrome({
  user,
  admin,
  unlocked,
  theme,
  ticker,
  children,
}: {
  user: SessionUser;
  admin: boolean;
  unlocked: string[];
  theme: Theme;
  ticker: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/hub/tools/analytics")) return <ProductFrame product="analytics" user={user}>{children}</ProductFrame>;
  if (pathname.startsWith("/hub/zero")) return <ProductFrame product="zero" user={user}>{children}</ProductFrame>;
  return (
    <AppShell user={user} admin={admin} unlocked={unlocked} theme={theme} ticker={ticker}>
      {children}
    </AppShell>
  );
}

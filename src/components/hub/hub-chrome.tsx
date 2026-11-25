"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/hub/app-shell";
import { ProductRail } from "@/components/hub/product-frame";
import type { ProductAccess } from "@/components/hub/nav";
import type { SessionUser } from "@/lib/session-shared";
import type { Theme } from "@/lib/theme";

/** AQ ONE keeps the header alone. A paid AQ Analytics or AQ Zero page adds a left menu under that same header. */
export function HubChrome({
  user,
  admin,
  unlocked,
  theme,
  ticker,
  access,
  children,
}: {
  user: SessionUser;
  admin: boolean;
  unlocked: string[];
  theme: Theme;
  ticker: React.ReactNode;
  access: ProductAccess;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const product = pathname.startsWith("/hub/tools/analytics") ? "analytics" : pathname.startsWith("/hub/zero") ? "zero" : null;
  return (
    <AppShell user={user} admin={admin} unlocked={unlocked} theme={theme} ticker={ticker} access={access} rail={product ? <ProductRail product={product} /> : null}>
      {children}
    </AppShell>
  );
}

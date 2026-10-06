import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { I18nProvider } from "@/components/app/i18n";
import { AppShell } from "@/components/hub/app-shell";
import { MarketTicker, stanceOf, type TickerItem } from "@/components/hub/market-ticker";
import { SuspendedNotice } from "@/components/hub/suspended-notice";
import { isAdminUser } from "@/lib/admin-access";
import { getAqModules } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { unlockedModules } from "@/lib/aq-modules/types";
import { getHubContent } from "@/lib/hub-content";
import { isLang, LANG_COOKIE } from "@/lib/i18n/locales";
import { getSessionAccess } from "@/lib/session";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Aquifert ONE",
  robots: { index: false, follow: false },
};

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { user, ban } = await getSessionAccess();
  if (!user) redirect("/login");
  if (ban) return <SuspendedNotice email={user.email} />;
  const admin = isAdminUser(user);
  const [modules, content] = await Promise.all([getAqModules(), getHubContent()]);
  const unlocked = unlockedModules(modules.access, { plan: user.plan, admin });
  const jar = await cookies();
  const saved = jar.get(LANG_COOKIE)?.value;
  const ticker: TickerItem[] = [
    ...content.indicators.map((item) => ({ kind: "gauge" as const, key: `g-${item.name}`, name: item.name, tone: stanceOf(item.value), blurb: item.summary.trim() || item.note.trim() })),
    ...publishedTelex(content.telex, admin ? "all" : user.plan)
      .filter((item) => item.readable)
      .slice(0, 6)
      .map((item) => ({ kind: "telex" as const, key: `t-${item.id}`, product: item.product, headline: item.headline, href: `/hub/telex/${item.id}` })),
  ];
  return (
    <I18nProvider initial={isLang(saved) ? saved : "en"}>
      <AppShell user={user} admin={admin} unlocked={unlocked} theme={parseTheme(jar.get(THEME_COOKIE)?.value)} ticker={<MarketTicker items={ticker} />}>
        {children}
      </AppShell>
    </I18nProvider>
  );
}

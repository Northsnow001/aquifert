import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminNav, type NavGroup } from "@/components/admin/admin-nav";
import { auditPorts } from "@/lib/freight-desk/port-quality";
import { getFreightDesk } from "@/lib/freight-desk/store";
import { ageInDays } from "@/lib/freight-desk/types";
import { getHubContent } from "@/lib/hub-content";
import { listInbox } from "@/lib/inbox";
import { listBans } from "@/lib/member-access";
import { getNetbackDesk } from "@/lib/netback-desk/store";
import { liveOrigins } from "@/lib/netback-desk/types";
import { initials, type SessionUser } from "@/lib/session-shared";
import { listZeroRegistrations } from "@/lib/zero-interest";

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const content = getHubContent();
  const inbox = listInbox();
  const drafts = content.telex.filter((item) => item.status === "draft").length;
  const desk = getFreightDesk();
  const portIssues = auditPorts(desk.ports).size;
  const marketIssue = desk.bunker.lastError || desk.bdi.lastError ? "check" : desk.bdi.source === "default" ? "no BDI" : undefined;
  const netback = getNetbackDesk();
  const netbackAge = ageInDays(netback.date);
  const netbackBadge = !liveOrigins(netback.benchmarks).length ? "no prices" : netbackAge === null || netbackAge > 14 ? "stale" : netback.week ? `wk ${netback.week}` : undefined;
  const zero = listZeroRegistrations();
  const zeroNew = zero.filter((row) => row.status === "new").length;
  const bans = listBans().length;

  const groups: NavGroup[] = [
    { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }] },
    {
      title: "Publishing",
      items: [
        { href: "/admin/telex", label: "Telex", icon: "telex", badge: drafts ? `${drafts} draft` : content.telex.length },
        { href: "/admin/indicators", label: "Market Indicators", icon: "indicators" },
        { href: "/admin/hedge", label: "Hedge Tables", icon: "hedge", badge: content.hedgeReports.length },
        {
          href: "/admin/freight",
          label: "Freight Routes",
          icon: "freight",
          badge: content.freight.showOnHome ? content.freight.fixtures.filter((row) => row.visible).length : "off",
        },
        { href: "/admin/tools", label: "Tools Commentary", icon: "tools" },
      ],
    },
    {
      title: "Library",
      items: [
        { href: "/admin/library", label: "Files", icon: "library", badge: content.libraryDocuments.length },
        { href: "/admin/collections", label: "Collections", icon: "collections", badge: content.collections.length },
      ],
    },
    {
      title: "Calculators",
      items: [
        { href: "/admin/freight-calculator", label: "Freight Calculator", icon: "calculator", badge: marketIssue },
        { href: "/admin/netback", label: "Netback", icon: "scale", badge: netbackBadge },
        { href: "/admin/ports", label: "Ports", icon: "anchor", badge: portIssues ? `${portIssues} review` : desk.ports.filter((port) => port.active).length },
      ],
    },
    {
      title: "Desk",
      items: [
        { href: "/admin/enquiries", label: "Enquiries", icon: "inbox", badge: inbox.length },
        { href: "/admin/zero", label: "Aquifert Zero", icon: "zero", badge: zeroNew ? `${zeroNew} new` : zero.length },
      ],
    },
    {
      title: "Assistant",
      items: [{ href: "/admin/aquibot", label: "Aquibot", icon: "aquibot", badge: content.aquibot.prompt.published ? "custom" : undefined }],
    },
    {
      title: "Members",
      items: [
        { href: "/admin/banned", label: "Banned users", icon: "banned", badge: bans },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
      ],
    },
    {
      title: "Move",
      items: [
        { href: "/admin/import", label: "Import from WordPress", icon: "import" },
        { href: "/admin/guide", label: "Admin guide", icon: "guide" },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="relative z-30 border-b border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2.5 no-underline">
            <img src="/brand/logo.png" alt="Aquifert" className="h-7 w-auto" draggable={false} />
            <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-white">Admin</span>
          </Link>
          <Link href="/hub" className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue no-underline lg:hidden">
            Hub <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto lg:pt-2">
          <AdminNav groups={groups} />
        </div>
        <div className="hidden border-t border-border p-3 lg:block">
          <Link
            href="/hub"
            className="mb-2 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[12.5px] font-semibold text-ink no-underline transition hover:border-blue/40 hover:text-blue"
          >
            Open the hub
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center gap-2.5 px-1 py-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-light text-[12px] font-bold text-blue">{initials(user.name)}</span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[11.5px] text-dim">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}

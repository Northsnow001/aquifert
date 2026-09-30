import { AdminFrame } from "@/components/admin/admin-frame";
import type { NavGroup } from "@/components/admin/admin-nav";
import { auditPorts } from "@/lib/freight-desk/port-quality";
import { getFreightDesk } from "@/lib/freight-desk/store";
import { ageInDays } from "@/lib/freight-desk/types";
import { getHubContent } from "@/lib/hub-content";
import { listInbox } from "@/lib/inbox";
import { listBans } from "@/lib/member-access";
import { getNetbackDesk } from "@/lib/netback-desk/store";
import { liveOrigins } from "@/lib/netback-desk/types";
import type { SessionUser } from "@/lib/session-shared";
import { listZeroRegistrations } from "@/lib/zero-interest";

export async function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [content, inbox, desk, netback, zero, banList] = await Promise.all([getHubContent(), listInbox(), getFreightDesk(), getNetbackDesk(), listZeroRegistrations(), listBans()]);
  const drafts = content.telex.filter((item) => item.status === "draft").length;
  const portIssues = auditPorts(desk.ports).size;
  const marketIssue = desk.bunker.lastError || desk.bdi.lastError ? "check" : desk.bdi.source === "default" ? "no BDI" : undefined;
  const netbackAge = ageInDays(netback.date);
  const netbackBadge = !liveOrigins(netback.benchmarks).length ? "no prices" : netbackAge === null || netbackAge > 14 ? "stale" : netback.week ? `wk ${netback.week}` : undefined;
  const zeroNew = zero.filter((row) => row.status === "new").length;
  const bans = banList.length;

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
    <AdminFrame user={user} groups={groups}>
      {children}
    </AdminFrame>
  );
}

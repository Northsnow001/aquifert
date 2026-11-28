import { AdminFrame } from "@/components/admin/admin-frame";
import { marketFreshness } from "@/components/admin/aq-data/freshness";
import type { NavGroup } from "@/components/admin/admin-nav";
import { listRegistrations, membershipRequestCounts } from "@/lib/aq-modules/members";
import { getAqModules, upcomingCalls } from "@/lib/aq-modules/store";
import { countRecords } from "@/lib/data/records";
import { BANS, NITROGEN_REPORTS } from "@/lib/data/tables";
import { deskNavCounts } from "@/lib/desk-hitl/store";
import { auditPorts } from "@/lib/freight-desk/port-quality";
import { getFreightDesk } from "@/lib/freight-desk/store";
import { ageInDays } from "@/lib/freight-desk/types";
import { getHubContent } from "@/lib/hub-content";
import { inboxSnapshot } from "@/lib/inbox";
import { getNetbackDesk } from "@/lib/netback-desk/store";
import { liveOrigins } from "@/lib/netback-desk/types";
import type { SessionUser } from "@/lib/session-shared";
import type { Theme } from "@/lib/theme";
import { tradeCounts } from "@/lib/trade/store";
import { zeroRegistrationCounts } from "@/lib/zero-interest";

export async function AdminShell({ user, theme = "light", children }: { user: SessionUser; theme?: Theme; children: React.ReactNode }) {
  const [content, inbox, desk, netback, zero, bans, aq, requests, registrations, nitrogenReports, deskNav, trade] = await Promise.all([
    getHubContent(),
    inboxSnapshot().catch(() => ({ total: 0, orders: 0, latestAt: null })),
    getFreightDesk(),
    getNetbackDesk(),
    zeroRegistrationCounts().catch(() => ({ total: 0, fresh: 0 })),
    countRecords(BANS).catch(() => 0),
    getAqModules(),
    membershipRequestCounts().catch(() => ({ total: 0, fresh: 0 })),
    listRegistrations().catch(() => []),
    countRecords(NITROGEN_REPORTS).catch(() => 0),
    deskNavCounts().catch(() => ({ total: 0, waiting: 0, negotiating: 0 })),
    tradeCounts().catch(() => null),
  ]);
  const drafts = content.telex.filter((item) => item.status === "draft").length;
  const portIssues = auditPorts(desk.ports).size;
  const marketIssue = desk.bunker.lastError || desk.bdi.lastError ? "check" : desk.bdi.source === "default" ? "no BDI" : undefined;
  const netbackAge = ageInDays(netback.date);
  const netbackBadge = !liveOrigins(netback.benchmarks).length ? "no prices" : netbackAge === null || netbackAge > 14 ? "stale" : netback.week ? `wk ${netback.week}` : undefined;
  const analysisDrafts = aq.analysis.filter((note) => note.status === "draft").length;
  const nextCall = upcomingCalls(aq).next;
  const nextCallRegistered = nextCall ? registrations.filter((row) => row.callId === nextCall.id && row.status === "registered").length : 0;
  const requestsNew = requests.fresh;
  const deskWaiting = deskNav.waiting;
  const negotiating = deskNav.negotiating;

  const groups: NavGroup[] = [
    { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }] },
    { title: "Content", items: [{ href: "/admin/site-content", label: "Website & hub pages", icon: "website" }] },
    {
      title: "Publishing",
      items: [
        { href: "/admin/telex", label: "Telex", icon: "telex", badge: drafts ? `${drafts} draft` : content.telex.length },
        { href: "/admin/analysis", label: "AQ View notes", icon: "analysis", badge: analysisDrafts ? `${analysisDrafts} draft` : aq.analysis.length },
        { href: "/admin/indicators", label: "Market Indicators", icon: "indicators" },
        { href: "/admin/hedge", label: "Hedge Tables", icon: "hedge", badge: content.hedgeReports.length },
        {
          href: "/admin/freight",
          label: "Freight Routes",
          icon: "freight",
          badge: content.freight.showOnHome ? content.freight.fixtures.filter((row) => row.visible).length : "off",
        },
        { href: "/admin/tools", label: "AQ Trader Tools commentary", icon: "tools" },
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
      title: "AQ Modules",
      items: [
        { href: "/admin/aq-access", label: "Access & allowances", icon: "access" },
        { href: "/admin/market-data", label: "Market data", icon: "marketData", badge: marketFreshness(aq.series).badge },
        { href: "/admin/community-calls", label: "Weekly Market Calls", icon: "calls", badge: nextCallRegistered },
        { href: "/admin/supply-demand", label: "Supply & demand", icon: "supplyDemand" },
        { href: "/admin/briefing", label: "The Briefing", icon: "briefing", badge: aq.briefings.length },
        { href: "/admin/membership-requests", label: "Membership requests", icon: "requests", badge: requestsNew ? `${requestsNew} new` : requests.total },
        { href: "/admin/nitrogen-reports", label: "Nitrogen reports", icon: "nitrogen", badge: nitrogenReports },
        { href: "/admin/nitrogen-reports/template", label: "Nitrogen report template", icon: "nitrogen" },
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
        {
          href: "/admin/desk/inquiries",
          label: "Enquiries",
          icon: "inbox",
          badge: inbox.total + (trade?.openRfqs ?? 0) || undefined,
        },
        { href: "/admin/zero", label: "Aquifert Zero", icon: "zero", badge: zero.fresh ? `${zero.fresh} new` : zero.total },
      ],
    },
    {
      title: "Trade book",
      items: [
        { href: "/admin/desk", label: "Desk shortlists", icon: "desk", badge: deskWaiting ? `${deskWaiting} wait` : deskNav.total },
        { href: "/admin/desk/matching", label: "Needs matching", icon: "inbox" },
        { href: "/admin/desk/negotiation", label: "Shortlist Negotiation", icon: "desk", badge: negotiating || undefined },
        { href: "/admin/trade", label: "Overview", icon: "trade", badge: trade?.toInvite ? `${trade.toInvite} invite` : trade?.suppliers || undefined },
      ],
    },
    {
      title: "Aquifert Repository",
      items: [
        { href: "/admin/trade/suppliers", label: "Suppliers", icon: "trade", badge: trade?.toInvite || undefined },
        { href: "/admin/trade/buyers", label: "Buyers", icon: "trade" },
        { href: "/admin/trade/products", label: "Products", icon: "trade" },
        { href: "/admin/trade/forwarders", label: "Forwarders", icon: "trade" },
        { href: "/admin/trade/rfqs", label: "Buyer requests", icon: "trade", badge: trade?.openRfqs || undefined },
        { href: "/admin/trade/quotes", label: "Supplier quotes", icon: "trade" },
        { href: "/admin/trade/freight", label: "Freight quotes", icon: "trade" },
        { href: "/admin/trade/offers", label: "Offers to buyers", icon: "trade" },
        { href: "/admin/trade/pricing", label: "Deal pricing", icon: "trade" },
        { href: "/admin/trade/shipments", label: "Trades", icon: "trade" },
        { href: "/admin/trade/leads", label: "Leads", icon: "trade" },
        { href: "/admin/trade/documents", label: "Documents", icon: "trade" },
        { href: "/admin/trade/lists", label: "Lists", icon: "trade" },
        { href: "/admin/trade/settings", label: "Book settings", icon: "trade" },
        { href: "/admin/trade/agents", label: "Desk agents", icon: "trade" },
      ],
    },
    {
      title: "Assistant",
      items: [{ href: "/admin/aquibot", label: "Aquibot Trader AI", icon: "aquibot", badge: content.aquibot.prompt.published ? "custom" : undefined }],
    },
    {
      title: "Members",
      items: [
        { href: "/admin/members", label: "All members", icon: "members" },
        { href: "/admin/onboarding", label: "Onboarding questions", icon: "analysis" },
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
    <AdminFrame user={user} groups={groups} theme={theme}>
      {children}
    </AdminFrame>
  );
}

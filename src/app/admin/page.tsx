import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Calculator,
  CircleHelp,
  ClipboardPaste,
  FilePlus2,
  FolderPlus,
  FolderTree,
  Gauge,
  Inbox,
  Library,
  MapPin,
  PenLine,
  Radio,
  Scale,
  Settings,
  ShieldBan,
  Ship,
  Table2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { excerpt, formatDay, formatStamp, hedgeRowCount, telexHeadline } from "@/lib/content-types";
import { getHubContent, sortHedge, sortTelex } from "@/lib/hub-content";
import { listInbox } from "@/lib/inbox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Module = { title: string; body: string; icon: LucideIcon; href?: string };

const MODULES: Module[] = [
  { title: "Telex", body: "Intel feed messages, access by plan, tags and drafts.", icon: Radio, href: "/admin/telex" },
  { title: "Market Indicators", body: "Nitrogen, phosphate and potassium dials with commentary.", icon: Gauge, href: "/admin/indicators" },
  { title: "Hedge Tables", body: "Direct hedge reports, pasted or built by commodity.", icon: Table2, href: "/admin/hedge" },
  { title: "Library", body: "Member documents and the collections they sit in.", icon: Library, href: "/admin/library" },
  { title: "Collections", body: "Nested groups for library files, public or private.", icon: FolderTree, href: "/admin/collections" },
  { title: "Order Desk Enquiries", body: "Buyer enquiries and contact messages from the hub.", icon: Inbox, href: "/admin/enquiries" },
  { title: "Freight Routes", body: "Open freight enquiries and their visibility on the hub.", icon: Ship, href: "/admin/freight" },
  { title: "AQ Trader Tools", body: "The AQ Trader Tools commentary shown inside the hub.", icon: BookOpen, href: "/admin/tools" },
  { title: "Aquibot Trader AI", body: "Prompt lifecycle, limits, retrieval, vocabulary and extraction rules.", icon: Bot, href: "/admin/aquibot" },
  { title: "Freight Calculator", body: "Market data, verified fixtures, pricing rules and calculation logs.", icon: Calculator, href: "/admin/freight-calculator" },
  { title: "Ports", body: "The port registry used by freight and netback.", icon: MapPin, href: "/admin/ports" },
  { title: "Netback", body: "Weekly FOB benchmarks, import duties, trade costs and calculation logs.", icon: Scale, href: "/admin/netback" },
  { title: "Aquifert Zero", body: "Pilot registrations from the hub, moved from new to slot offered.", icon: Zap, href: "/admin/zero" },
  { title: "Banned users", body: "Suspend a member's access, reinstate it, and keep the history.", icon: ShieldBan, href: "/admin/banned" },
  { title: "Settings", body: "Order Desk and Zero emails, sign-up rules and email delivery.", icon: Settings, href: "/admin/settings" },
];

function stance(value: number) {
  if (value > 66) return { label: "Bullish", color: "#1f9d60" };
  if (value >= 34) return { label: "Neutral", color: "#c98712" };
  return { label: "Bearish", color: "#d14b3f" };
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AdminHomePage() {
  const user = await getSession();
  const content = await getHubContent();
  const inbox = await listInbox();
  const telex = sortTelex(content.telex);
  const published = telex.filter((item) => item.status === "published");
  const drafts = telex.filter((item) => item.status === "draft");
  const latestHedge = sortHedge(content.hedgeReports)[0];
  const privateCollections = content.collections.filter((item) => item.private).length;

  const stats = [
    {
      href: "/admin/telex",
      icon: Radio,
      label: "Telex",
      value: published.length,
      unit: "live",
      detail: drafts.length ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} waiting` : published[0] ? `Last ${formatStamp(published[0].publishedAt)}` : "No posts yet",
    },
    {
      href: "/admin/hedge",
      icon: Table2,
      label: "Hedge tables",
      value: content.hedgeReports.length,
      unit: "reports",
      detail: latestHedge
        ? `Latest ${formatDay(latestHedge.date)} · ${latestHedge.sections.reduce((n, s) => n + hedgeRowCount(s), 0)} prices`
        : "No reports yet",
    },
    {
      href: "/admin/library",
      icon: Library,
      label: "Library",
      value: content.libraryDocuments.length,
      unit: "files",
      detail: `${content.collections.length} collections${privateCollections ? ` · ${privateCollections} private` : ""}`,
    },
    {
      href: "/admin/enquiries",
      icon: Inbox,
      label: "Enquiries",
      value: inbox.length,
      unit: "received",
      detail: inbox[0] ? `Latest ${inbox[0].at.slice(0, 16).replace("T", " ")}` : "Order Desk and Contact",
    },
  ];

  const actions = [
    { href: "/admin/telex/new", icon: PenLine, title: "Write a Telex", body: "Post intel to the feed" },
    { href: "/admin/hedge?new=1&paste=1", icon: ClipboardPaste, title: "Paste a hedge report", body: "Parse it into tables" },
    { href: "/admin/indicators", icon: Gauge, title: "Move the dials", body: "Readings and commentary" },
    { href: "/admin/library?new=1", icon: FilePlus2, title: "Add a library file", body: "List it for members" },
    { href: "/admin/collections", icon: FolderPlus, title: "New collection", body: "Group library files" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`${greeting()}, ${user?.firstName || user?.name.split(" ")[0] || "there"}`}
        description="Everything members see in the hub is published from here. Changes go live the moment you save."
        actions={
          <>
            <Link href="/admin/guide" className={btnSecondary}>
              <CircleHelp className="h-4 w-4" />
              Admin guide
            </Link>
            <Link href="/hub" className={btnSecondary}>
              View hub
            </Link>
            <Link href="/admin/telex/new" className={btnPrimary}>
              <PenLine className="h-4 w-4" />
              New Telex
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="aq-card aq-lift group min-w-0 p-3.5 no-underline sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-semibold leading-tight text-mid">
                <span className="aq-chip aq-chip-blue flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-white">
                  <stat.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                {stat.label}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-dim transition group-hover:translate-x-0.5 group-hover:text-blue" />
            </div>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{stat.value}</span>
              <span className="text-[13px] text-mid">{stat.unit}</span>
            </p>
            <p className="mt-2 text-[12.5px] text-dim sm:truncate">{stat.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Latest Telex"
            meta={`${telex.length} messages in the feed`}
            actions={
              <Link href="/admin/telex" className="text-[12.5px] font-semibold text-blue no-underline">
                Manage all
              </Link>
            }
          />
          <ul>
            {telex.slice(0, 5).map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <Link href={`/admin/telex/${item.id}`} className="flex flex-col gap-2 px-5 py-3.5 no-underline transition hover:bg-s2/60 sm:flex-row sm:items-start sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13.5px] font-semibold text-ink sm:line-clamp-1">{telexHeadline(item)}</p>
                    <p className="mt-0.5 line-clamp-1 text-[12.5px] text-mid">{excerpt(item.paragraphs, 18)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                    <StatusBadge status={item.status} />
                    <span className="font-mono text-[11px] text-dim">{formatStamp(item.publishedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Market dials"
            meta="As members see them now"
            actions={
              <Link href="/admin/indicators" className="text-[12.5px] font-semibold text-blue no-underline">
                Edit
              </Link>
            }
          />
          <div className="space-y-4 px-5 py-4">
            {content.indicators.map((item) => {
              const { label, color } = stance(item.value);
              return (
                <div key={item.name}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-ink">{item.name}</span>
                    <span className="font-mono text-[12px]" style={{ color }}>
                      {item.value} · {label}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-s2">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: color }} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-mid">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="aq-card aq-lift group flex flex-col gap-2 p-4 no-underline"
          >
            <span className="aq-chip flex h-9 w-9 items-center justify-center rounded-[11px] text-white">
              <action.icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-[13.5px] font-semibold text-ink">{action.title}</span>
            <span className="text-[12px] text-mid">{action.body}</span>
          </Link>
        ))}
      </div>

      <div className="mb-3 mt-8 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Desk modules</h2>
        <p className="font-mono text-[11px] text-dim">
          {MODULES.filter((item) => item.href).length} of {MODULES.length} live
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((item) => {
          const body = (
            <>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.href ? "bg-blue-light text-blue transition-colors group-hover:bg-blue group-hover:text-white" : "bg-s2 text-dim"
                }`}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`text-[13.5px] font-semibold ${item.href ? "text-ink" : "text-mid"}`}>{item.title}</span>
                  <span
                    className={`rounded-full px-1.5 py-px font-mono text-[9.5px] font-semibold uppercase tracking-wider ${
                      item.href ? "bg-[#eaf5f0] text-teal" : "bg-s2 text-dim"
                    }`}
                  >
                    {item.href ? "Live" : "Next"}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-mid">{item.body}</span>
              </span>
            </>
          );
          return item.href ? (
            <Link
              key={item.title}
              href={item.href}
              className="aq-card aq-lift group flex items-start gap-3 p-4 no-underline"
            >
              {body}
            </Link>
          ) : (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-surface/50 p-4">
              {body}
            </div>
          );
        })}
      </div>

      <p className="mt-8 font-mono text-[11px] uppercase tracking-wide text-dim">
        {content.updatedAt ? `Last change saved ${content.updatedAt.slice(0, 16).replace("T", " ")} UTC` : "Showing the built-in desk copy until the first save"}
      </p>
    </div>
  );
}

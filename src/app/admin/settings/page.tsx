import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DeliveryPanel } from "@/components/admin/settings/delivery-panel";
import { FormEmailsPanel } from "@/components/admin/settings/form-emails-panel";
import { MembersPanel } from "@/components/admin/settings/members-panel";
import { StoragePanel } from "@/components/admin/settings/storage-panel";
import { PageHeader } from "@/components/admin/ui";
import { storageStatus } from "@/lib/data/status";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { DEFAULT_DESK_SETTINGS } from "@/lib/desk-settings/types";
import { listInbox } from "@/lib/inbox";
import { deliveryStatus, listOutbox } from "@/lib/mailer";
import { listBans } from "@/lib/member-access";
import { getSession } from "@/lib/session";
import { listZeroRegistrations } from "@/lib/zero-interest";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "order", label: "Order Desk emails" },
  { key: "zero", label: "Aquifert Zero emails" },
  { key: "members", label: "Sign-up rules" },
  { key: "delivery", label: "Email delivery" },
  { key: "storage", label: "Data storage" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const LIMITS = [
  { href: "/admin/freight-calculator?tab=pricing", label: "Freight Calculator", detail: "Daily limits, premiums and seasonal uplift" },
  { href: "/admin/netback?tab=settings", label: "Netback Calculator", detail: "Trade costs and daily limits" },
  { href: "/admin/aquibot?tab=settings", label: "Aquibot Trader AI", detail: "Question limits by plan" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab: Tab = TABS.some((item) => item.key === params.tab) ? (params.tab as Tab) : "order";
  const [user, settings, outbox, inbox, registrations, bans, storage] = await Promise.all([
    getSession(),
    getDeskSettings(),
    listOutbox(),
    listInbox(),
    listZeroRegistrations(),
    listBans(),
    storageStatus(),
  ]);
  const status = deliveryStatus();
  const orders = inbox.filter((item) => item.table === "order_enquiries").length;
  const storageFailing = storage.backend === "local" ? storage.hosted : storage.checks.some((check) => !check.ok);
  const failed = outbox.filter((entry) => entry.status === "failed").length;
  const { orderDesk, zero, members } = settings;
  const describe = (form: typeof orderDesk) =>
    form.sendApplicant && form.sendAdmin ? `Member + ${form.recipient}` : form.sendAdmin ? `Desk only · ${form.recipient}` : form.sendApplicant ? "Member confirmation only" : "No emails";

  const stats = [
    {
      label: "Email delivery",
      value: status.connected ? `Live via ${status.provider}` : "Held in outbox",
      meta: status.connected ? `From ${status.from}` : "Connect a provider to send",
      href: "?tab=delivery",
      tone: status.connected ? "text-[#1f7a45]" : "text-[#9a5b00]",
    },
    { label: "Order Desk", value: `${orders.toLocaleString()} enquiries`, meta: describe(orderDesk), href: "?tab=order", tone: "text-ink" },
    {
      label: "Aquifert Zero",
      value: zero.showOnHub ? "On the hub" : "Hidden",
      meta: `${registrations.length} ${registrations.length === 1 ? "registration" : "registrations"} · ${describe(zero)}`,
      href: "?tab=zero",
      tone: zero.showOnHub ? "text-ink" : "text-dim",
    },
    {
      label: "Sign-up",
      value: members.requireWorkEmail ? "Work email only" : "Any address",
      meta: `${members.blocked.length} blocked · ${members.allowed.length} allowed · ${bans.length} banned`,
      href: "?tab=members",
      tone: "text-ink",
    },
  ];

  const badge: Partial<Record<Tab, string>> = {
    delivery: failed ? String(failed) : !status.connected ? "off" : undefined,
    storage: storageFailing ? "!" : storage.backend === "local" ? "local" : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Settings" description="The emails the Order Desk and Aquifert Zero send, who may register, how email leaves the platform, and where data is stored." />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-border bg-surface px-4 py-3.5 no-underline shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition hover:border-blue/40"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-mid sm:truncate" title={stat.meta}>
              {stat.meta}
            </p>
          </Link>
        ))}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Settings sections">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Link
              key={item.key}
              href={`?tab=${item.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold no-underline transition ${
                active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
              }`}
            >
              {item.label}
              {badge[item.key] ? (
                <span
                  className={`rounded-full px-1.5 py-px font-mono text-[10.5px] ${(failed && item.key === "delivery") || (storageFailing && item.key === "storage") ? "bg-[#fdecec] text-[#b42318]" : "bg-[#fff6e5] text-[#9a5b00]"}`}
                >
                  {badge[item.key]}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "order" || tab === "zero" ? (
        <FormEmailsPanel
          key={`${tab}-${settings.updatedAt ?? "seed"}`}
          kind={tab}
          initial={tab === "order" ? orderDesk : zero}
          defaults={tab === "order" ? DEFAULT_DESK_SETTINGS.orderDesk : DEFAULT_DESK_SETTINGS.zero}
          savedAt={settings.updatedAt}
          adminEmail={user?.email ?? ""}
          connected={status.connected}
          count={tab === "order" ? orders : registrations.length}
        />
      ) : null}
      {tab === "members" ? <MembersPanel key={settings.updatedAt ?? "seed"} initial={members} savedAt={settings.updatedAt} banned={bans.map((ban) => ban.email)} /> : null}
      {tab === "delivery" ? (
        <DeliveryPanel
          key={settings.updatedAt ?? "seed"}
          initial={settings.delivery}
          savedAt={settings.updatedAt}
          status={status}
          outbox={outbox.map((entry) => ({ id: entry.id, at: entry.at, kind: entry.kind, to: entry.to, subject: entry.subject, status: entry.status, error: entry.error }))}
        />
      ) : null}
      {tab === "storage" ? <StoragePanel status={storage} /> : null}

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">Limits live with each tool</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {LIMITS.map((item) => (
            <Link key={item.href} href={item.href} className="group flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3 no-underline transition hover:border-blue/40">
              <span>
                <span className="block text-[13.5px] font-semibold text-ink">{item.label}</span>
                <span className="mt-0.5 block text-[12px] text-mid">{item.detail}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-dim transition group-hover:text-blue" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

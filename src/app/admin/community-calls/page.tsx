import Link from "next/link";
import { Download } from "lucide-react";
import { CallsPanel } from "@/components/admin/aq-data/calls-panel";
import { MissingTableNotice } from "@/components/admin/aq-data/table-notice";
import { utcLabel } from "@/components/admin/aq-data/zones";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import type { CallRegistration } from "@/lib/aq-modules/member-types";
import { listRegistrations } from "@/lib/aq-modules/members";
import { getAqModules } from "@/lib/aq-modules/store";
import type { CommunityCall } from "@/lib/aq-modules/types";

export const dynamic = "force-dynamic";

function splitCalls(calls: CommunityCall[], now = Date.now()) {
  const ends = (call: CommunityCall) => Date.parse(call.startsAt) + call.durationMinutes * 60_000;
  return {
    upcoming: calls.filter((call) => ends(call) > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    past: calls.filter((call) => ends(call) <= now).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  };
}

export default async function CommunityCallsAdminPage() {
  const [modules, registrations] = await Promise.all([getAqModules(), listRegistrations()]);
  const { upcoming, past } = splitCalls(modules.calls);
  const byCall: Record<string, CallRegistration[]> = {};
  for (const row of registrations) (byCall[row.callId] ??= []).push(row);
  const known = new Set(modules.calls.map((call) => call.id));
  const orphans = registrations.filter((row) => !known.has(row.callId)).length;
  const next = upcoming.find((call) => call.status === "scheduled") ?? null;
  const active = (id: string) => (byCall[id] ?? []).filter((row) => row.status === "registered");
  const nextRegistered = next ? active(next.id) : [];

  const stats = [
    { label: "Next call", value: next ? utcLabel(next.startsAt).replace(" UTC", "") : "None scheduled", meta: next ? `${next.topic} · UTC` : "Schedule one below", tone: next ? "text-ink" : "text-[#9a5b00]" },
    {
      label: "Registered for the next call",
      value: nextRegistered.length.toLocaleString(),
      meta: next ? `${nextRegistered.filter((row) => row.reminders).length} want reminders` : "No call to register for",
      tone: "text-ink",
    },
    { label: "Calls", value: modules.calls.length.toLocaleString(), meta: `${upcoming.length} upcoming · ${past.length} past`, tone: "text-ink" },
    {
      label: "Registrations",
      value: registrations.filter((row) => row.status === "registered").length.toLocaleString(),
      meta: orphans ? `${orphans} for calls that were deleted` : "Across every call",
      tone: "text-ink",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Community calls"
        description="Schedule the desk's live calls, add join and recording links, and see who registered. Times are saved in UTC."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/hub/community-call" className="text-[12.5px] font-semibold text-blue no-underline">
              Open on the hub
            </Link>
            {registrations.length ? (
              <a href="/admin/community-calls/export" className={btnSecondary}>
                <Download className="h-3.5 w-3.5" />
                All registrations
              </a>
            ) : null}
          </div>
        }
      />

      <MissingTableNotice table="community_call_registrations" what="registrations" />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 truncate text-[12px] text-mid" title={stat.meta}>
              {stat.meta}
            </p>
          </div>
        ))}
      </div>

      <CallsPanel upcoming={upcoming} past={past} registrations={byCall} />
    </div>
  );
}

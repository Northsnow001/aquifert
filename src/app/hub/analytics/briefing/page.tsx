import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, ScrollText } from "lucide-react";
import { btnPrimary } from "@/components/app/form";
import { BriefEmailToggle } from "@/components/hub/analytics/switch";
import { EmptyPanel, HubPageHeader, Panel, Tag } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedBriefings } from "@/lib/aq-modules/store";
import { formatDay } from "@/lib/content-types";

export const metadata: Metadata = { title: "The Briefing" };
export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const { user, modules, can } = await getHubAccess();
  if (!can("briefing")) return <LockedScreen module="briefing" required={modules.access.briefing} plan={user.plan} />;

  const issues = publishedBriefings(modules);
  const prefs = await getPrefs(user).catch(() => null);
  const [latest, ...older] = issues;

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="The Briefing"
        description="The desk's weekly written briefing: what happened, why it matters and what to watch, with plain-language takeaways for buyers."
        tip="A new issue lands each week. Open any issue to read it in full, print it or save it as a PDF, and step through the back catalogue with the previous and next links."
      />

      {!latest ? (
        <EmptyPanel title="The first issue is on its way" body="The desk publishes The Briefing weekly. Each issue appears here the moment it goes out, with the full back catalogue below." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Link
            href={`/hub/analytics/briefing/${encodeURIComponent(latest.id)}`}
            className="aq-card aq-lift aq-rise relative flex flex-col overflow-hidden p-6 no-underline lg:col-span-2 sm:p-7"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(90%_120%_at_0%_0%,rgb(47_111_179/0.10),transparent_60%),radial-gradient(70%_120%_at_100%_0%,rgb(95_168_138/0.12),transparent_60%)]" />
            <div className="relative flex flex-wrap items-center gap-2">
              <Tag tone="blue">Latest issue</Tag>
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wide text-dim">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDay(latest.date)}
              </span>
            </div>
            <h2 className="relative mt-3 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[26px]">{latest.title}</h2>
            {latest.summary ? <p className="relative mt-2 max-w-2xl text-[16px] leading-relaxed text-mid">{latest.summary}</p> : null}
            <span className={`${btnPrimary} relative mt-6 self-start`}>
              Read the issue <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>

          <section className="aq-card flex flex-col gap-4 p-5">
            <BriefEmailToggle initial={prefs?.briefByEmail ?? false} email={user.email} />
            <div className="border-t border-border pt-4 text-[13.5px] leading-relaxed text-mid">
              <p className="font-semibold text-ink">{issues.length} {issues.length === 1 ? "issue" : "issues"} in the archive</p>
              <p className="mt-0.5">Every issue stays here, so you can look back at what the desk said before a move.</p>
            </div>
          </section>
        </div>
      )}

      {older.length ? (
        <Panel title="Back catalogue" sub="Every earlier issue, newest first" icon={ScrollText}>
          <ul className="divide-y divide-border">
            {older.map((issue) => (
              <li key={issue.id}>
                <Link href={`/hub/analytics/briefing/${encodeURIComponent(issue.id)}`} className="group flex flex-col gap-1 px-5 py-4 no-underline transition-colors hover:bg-s2/60 sm:flex-row sm:gap-5">
                  <span className="w-28 shrink-0 font-mono text-[12.5px] uppercase tracking-wide text-dim sm:pt-0.5">{formatDay(issue.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold leading-snug text-ink group-hover:text-blue">{issue.title}</span>
                    {issue.summary ? <span className="mt-0.5 block line-clamp-2 text-[14.5px] leading-relaxed text-mid">{issue.summary}</span> : null}
                  </span>
                  <ArrowRight className="mt-1 hidden h-4 w-4 shrink-0 text-dim transition group-hover:translate-x-0.5 group-hover:text-blue sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : latest ? (
        <p className="px-1 text-[14.5px] text-mid">Earlier issues build up here as the desk publishes each week.</p>
      ) : null}
    </div>
  );
}

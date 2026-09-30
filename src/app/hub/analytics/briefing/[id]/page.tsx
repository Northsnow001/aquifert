import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { PrintButton } from "@/components/hub/analytics/print-button";
import { BriefEmailToggle } from "@/components/hub/analytics/switch";
import { Disclaimer } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { Markdown } from "@/components/hub/markdown";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedBriefings } from "@/lib/aq-modules/store";
import { formatDay } from "@/lib/content-types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function matches(id: string) {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {}
  return (item: { id: string }) => item.id === id || item.id === decoded;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { modules, can } = await getHubAccess();
  const issue = can("briefing") ? publishedBriefings(modules).find(matches(id)) : null;
  return { title: issue ? `${issue.title} · The Briefing` : "The Briefing" };
}

export default async function BriefingIssuePage({ params }: Props) {
  const { user, modules, can } = await getHubAccess();
  if (!can("briefing")) return <LockedScreen module="briefing" required={modules.access.briefing} plan={user.plan} />;

  const { id } = await params;
  const issues = publishedBriefings(modules);
  const index = issues.findIndex(matches(id));
  if (index < 0) notFound();
  const issue = issues[index];
  const newer = issues[index - 1] ?? null;
  const older = issues[index + 1] ?? null;
  const prefs = await getPrefs(user).catch(() => null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/hub/analytics/briefing" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue no-underline hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All issues
        </Link>
        <PrintButton label="Print or save as PDF" />
      </div>

      <article className="aq-card aq-rise px-5 py-6 sm:px-9 sm:py-8 print:border-0 print:shadow-none">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">The Briefing · AQ Analytics</p>
        <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">{issue.title}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-wide text-dim">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDay(issue.date)}
        </p>
        {issue.summary ? <p className="mt-5 border-l-2 border-teal-400 pl-4 text-[15.5px] leading-relaxed text-ink">{issue.summary}</p> : null}
        <div className="mt-6 border-t border-border pt-6">
          {issue.body.trim() ? <Markdown text={issue.body} className="text-[15px] text-ink" images /> : <p className="text-[14px] text-mid">This issue is a summary only.</p>}
        </div>
        <div className="mt-8 border-t border-border pt-4">
          <Disclaimer />
        </div>
      </article>

      <nav aria-label="More issues" className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        {older ? (
          <Link href={`/hub/analytics/briefing/${encodeURIComponent(older.id)}`} className="aq-card aq-lift flex flex-col p-4 no-underline">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Previous issue
            </span>
            <span className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink">{older.title}</span>
            <span className="mt-0.5 text-[12px] text-dim">{formatDay(older.date)}</span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}
        {newer ? (
          <Link href={`/hub/analytics/briefing/${encodeURIComponent(newer.id)}`} className="aq-card aq-lift flex flex-col p-4 text-right no-underline">
            <span className="inline-flex items-center justify-end gap-1 text-[12px] font-semibold text-blue">
              Next issue <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink">{newer.title}</span>
            <span className="mt-0.5 text-[12px] text-dim">{formatDay(newer.date)}</span>
          </Link>
        ) : (
          <p className="flex items-center justify-center rounded-2xl border border-dashed border-border px-4 py-4 text-center text-[12.5px] text-mid">This is the latest issue. The next one lands with the weekly update.</p>
        )}
      </nav>

      <section className="aq-card p-5 print:hidden">
        <BriefEmailToggle initial={prefs?.briefByEmail ?? false} email={user.email} />
      </section>
    </div>
  );
}

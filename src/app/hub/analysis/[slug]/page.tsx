import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, Radio } from "lucide-react";
import { AquibotAvatar } from "@/components/app/aquibot-avatar";
import { btnPrimary } from "@/components/app/form";
import { Disclaimer, FeedThumb, Tag, ToneBadge } from "@/components/hub/kit";
import { Markdown } from "@/components/hub/markdown";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getAqModules, publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { productOf, toneOf } from "@/lib/aq-modules/types";
import { formatDay, formatTelexDay, plainText } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = publishedAnalysis(await getAqModules()).find((item) => item.slug === slug);
  return { title: note ? note.title : "Analysis note" };
}

export default async function AnalysisNotePage({ params }: Props) {
  const { slug } = await params;
  const { user, admin, modules } = await getHubAccess();
  const notes = publishedAnalysis(modules);
  const index = notes.findIndex((item) => item.slug === slug);
  if (index < 0) notFound();
  const note = notes[index];
  const newer = index > 0 ? notes[index - 1] : null;
  const older = index < notes.length - 1 ? notes[index + 1] : null;

  const content = await getHubContent();
  const telexById = new Map(publishedTelex(content.telex, admin ? "all" : user.plan).map((item) => [item.id, item]));
  const related = note.relatedTelexIds.map((id) => telexById.get(id)).filter((item) => item !== undefined);

  const product = productOf(`${note.products.join(" ")} ${note.title}`);
  const tone = toneOf(`${note.title} ${plainText(note.body)}`);
  const question = `What does the desk note "${note.title}" mean for my buying, and what should I watch next?`.slice(0, 500);

  return (
    <article className="mx-auto max-w-3xl pb-2">
      <Link href="/hub/analysis" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-blue no-underline hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> All analysis
      </Link>

      <header className="aq-rise mt-4 flex items-start gap-4">
        <FeedThumb product={product} size={64} className="hidden sm:block" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToneBadge tone={tone} />
            {note.products.map((item) => (
              <Tag key={item} tone="teal">
                {item}
              </Tag>
            ))}
            {note.regions.map((region) => (
              <span key={region} className="rounded-full border border-border px-2 py-0.5 text-[11.5px] font-medium text-mid">
                {region}
              </span>
            ))}
          </div>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[32px]">{note.title}</h1>
          <p className="mt-2 text-[14.5px] text-dim">
            {note.author || "Aquifert Desk"} · {formatDay(note.publishedAt)}
            {note.publishedAt.length >= 16 ? `, ${note.publishedAt.slice(11, 16)} desk time` : ""}
          </p>
        </div>
      </header>

      <div className="aq-card mt-6 p-5 sm:p-7">
        <Markdown text={note.body} images className="text-[16.5px] text-ink" />
      </div>

      {related.length ? (
        <section className="aq-card mt-4 overflow-hidden" aria-labelledby="related-title">
          <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
            <span className="aq-chip aq-chip-blue flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white">
              <Radio className="h-4 w-4" />
            </span>
            <div>
              <h2 id="related-title" className="text-[16.5px] font-semibold text-ink">
                TELEX items this note interprets
              </h2>
              <p className="text-[13px] text-dim">The flashes behind the analysis, from the Market TELEX Feed</p>
            </div>
          </header>
          <ul className="divide-y divide-border">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.readable ? `/hub/telex?p=all&q=${encodeURIComponent(item.headline.slice(0, 80))}` : "/hub/account/membership"}
                  className="flex items-start gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-s2/60"
                >
                  <FeedThumb product={item.product} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[12px] text-dim">{formatTelexDay(item.publishedAt)}</span>
                      <ToneBadge tone={item.tone} />
                      {!item.readable ? (
                        <Tag tone="blue">
                          <Lock className="h-3 w-3" aria-hidden /> Upgrade to read
                        </Tag>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[15.5px] font-semibold leading-snug text-ink">{item.headline}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-dim" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-teal-50 to-white p-5 sm:flex-row sm:items-center">
        <AquibotAvatar size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-semibold text-ink">Ask Aquibot about this</h2>
          <p className="mt-0.5 text-[14.5px] leading-relaxed text-mid">Aquibot answers from the desk&apos;s own notes and Telex, so you can ask what this means for your product, region or timing.</p>
        </div>
        <Link href={`/hub/aquibot?q=${encodeURIComponent(question)}`} className={`${btnPrimary} shrink-0`}>
          Ask Aquibot <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {newer || older ? (
        <nav className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="More analysis">
          {older ? (
            <Link href={`/hub/analysis/${older.slug}`} className="aq-card aq-lift flex flex-col p-4 no-underline">
              <span className="inline-flex items-center gap-1 text-[12.5px] font-bold uppercase tracking-[0.08em] text-dim">
                <ArrowLeft className="h-3.5 w-3.5" /> Previous note
              </span>
              <span className="mt-1 text-[15.5px] font-semibold leading-snug text-ink">{older.title}</span>
              <span className="mt-1 text-[13px] text-dim">{formatDay(older.publishedAt)}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {newer ? (
            <Link href={`/hub/analysis/${newer.slug}`} className="aq-card aq-lift flex flex-col p-4 text-right no-underline">
              <span className="inline-flex items-center justify-end gap-1 text-[12.5px] font-bold uppercase tracking-[0.08em] text-dim">
                Next note <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <span className="mt-1 text-[15.5px] font-semibold leading-snug text-ink">{newer.title}</span>
              <span className="mt-1 text-[13px] text-dim">{formatDay(newer.publishedAt)}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}

      <div className="mt-6">
        <Disclaimer />
      </div>
    </article>
  );
}

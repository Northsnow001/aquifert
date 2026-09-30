import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, ExternalLink, FileText, Hourglass } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { Disclaimer, FeedThumb } from "@/components/hub/kit";
import { AccessBadge } from "@/components/hub/library/access-badge";
import { loadLibrary } from "@/components/hub/library/load";
import { fileFacts, fileProduct, hasValue, isPdf, sortFiles } from "@/components/hub/library/model";
import { ReadingActions } from "@/components/hub/library/reading-actions";
import { UnlockBox } from "@/components/hub/library/unlock-box";
import { FILE_ACCESS_LABEL, formatDay } from "@/lib/content-types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const DISCLAIMER =
  "Library files are provided for information only. They are not an offer, a price assessment or trading advice. Prices are indicative and may be delayed. Verify independently before trading.";

const navLink = "block rounded-lg px-3 py-2 text-[13px] font-medium text-mid no-underline transition hover:bg-s2 hover:text-ink";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { find } = await loadLibrary();
  const file = find(id);
  return { title: file ? `${file.title} · Library` : "Library" };
}

export default async function LibraryReadingPage({ params }: Props) {
  const { id } = await params;
  const { files, find } = await loadLibrary();
  const file = find(id);
  if (!file) notFound();

  const fileHref = `/hub/library/file/${file.id}`;
  const stored = Boolean(file.storedName);
  const pdf = stored && isPdf(file);
  const inlineHref = file.readable && pdf ? `${fileHref}?inline=1` : null;
  const facts = fileFacts(file);
  const eyebrow = [file.collectionNames.join(", ") || "Library", facts].filter(Boolean).join(" · ");
  const meta = [hasValue(file.author) ? `By ${file.author}` : "", hasValue(file.updated) ? `Updated ${formatDay(file.updated)}` : ""].filter(Boolean);

  const shelfId = file.collectionIds[0];
  const shelfName = file.collectionNames[0];
  const more = shelfId
    ? sortFiles(
        files.filter((item) => item.id !== file.id && item.readable && item.collectionIds.includes(shelfId)),
        "newest",
      ).slice(0, 5)
    : [];
  const timeline = sortFiles(files, "newest");
  const at = timeline.findIndex((item) => item.id === file.id);
  const newer = at > 0 ? timeline[at - 1] : null;
  const older = at >= 0 ? (timeline[at + 1] ?? null) : null;

  return (
    <article className="flex flex-col pb-2">
      <nav aria-label="Breadcrumb" className="print:hidden">
        <Link href="/hub/library" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue no-underline hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Library
        </Link>
      </nav>

      <header className="aq-rise mt-4 flex gap-4">
        <FeedThumb product={fileProduct(file)} size={64} className="mt-1 hidden sm:block" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">{eyebrow}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[32px]">{file.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] text-mid">
            {meta.length ? <p>{meta.join(" · ")}</p> : null}
            <AccessBadge access={file.access} />
          </div>
          <ReadingActions download={file.readable && stored ? fileHref : null} inline={inlineHref} />
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <section id="summary" aria-labelledby="summary-title" className="aq-card scroll-mt-24 p-5 sm:p-6">
            <h2 id="summary-title" className="text-[15px] font-semibold text-ink">
              Summary
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{file.summary || "The desk has not added a summary for this file yet."}</p>
          </section>

          <section id="file" aria-labelledby="file-title" className="scroll-mt-24">
            <h2 id="file-title" className="sr-only">
              {file.readable ? "File" : "Preview"}
            </h2>
            {!file.readable ? (
              <div className="flex flex-col gap-4">
                <div className="aq-card relative overflow-hidden p-5 sm:p-6" aria-hidden>
                  <div className="space-y-3 [mask-image:linear-gradient(to_bottom,black_20%,transparent)]">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-dim">
                      <FileText className="h-4 w-4" />
                      {file.filename}
                    </div>
                    {["w-11/12", "w-full", "w-10/12", "w-full", "w-8/12", "w-11/12", "w-9/12"].map((width, i) => (
                      <div key={i} className={`h-3 rounded-full bg-s3 ${width}`} />
                    ))}
                  </div>
                </div>
                <p className="sr-only">Preview ends. The full file needs the {FILE_ACCESS_LABEL[file.access]} plan.</p>
                <UnlockBox access={file.access} />
              </div>
            ) : !stored ? (
              <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-white/60 p-5">
                <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-dim" aria-hidden />
                <div>
                  <p className="text-[14px] font-semibold text-ink">The desk is preparing this file</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-mid">It will be ready to download here once it is uploaded.</p>
                </div>
              </div>
            ) : (
              <div className="aq-card overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                  <span className="aq-chip aq-chip-blue flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white">
                    <FileText className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[14.5px] font-semibold text-ink">{file.storedName}</p>
                    <p className="mt-0.5 text-[12.5px] text-dim">{facts || "Desk file"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inlineHref ? (
                      <a href={inlineHref} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} lg:hidden`}>
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        Open
                        <span className="sr-only"> (opens a new tab)</span>
                      </a>
                    ) : null}
                    <a href={fileHref} className={btnPrimary}>
                      <Download className="h-4 w-4" aria-hidden />
                      Download
                    </a>
                  </div>
                </div>
                {inlineHref ? (
                  <iframe
                    src={inlineHref}
                    title={`${file.title} preview`}
                    loading="lazy"
                    className="hidden h-[78dvh] min-h-[34rem] w-full border-t border-border bg-s2 lg:block print:hidden"
                  />
                ) : null}
              </div>
            )}
          </section>

          {more.length ? (
            <section id="more" aria-labelledby="more-title" className="aq-card scroll-mt-24 overflow-hidden print:hidden">
              <h2 id="more-title" className="border-b border-border px-5 py-3.5 text-[15px] font-semibold text-ink">
                More in {shelfName}
              </h2>
              <ul>
                {more.map((item) => (
                  <li key={item.id} className="border-b border-border last:border-b-0">
                    <Link href={`/hub/library/${item.id}`} className="flex items-center gap-3 px-5 py-3 no-underline transition hover:bg-s2/70">
                      <FeedThumb product={fileProduct(item)} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-ink">{item.title}</span>
                        <span className="block text-[12px] text-dim">
                          {[hasValue(item.updated) ? formatDay(item.updated) : "", fileFacts(item)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-dim" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="border-t border-border pt-4">
            <Disclaimer>{DISCLAIMER}</Disclaimer>
          </div>

          {older || newer ? (
            <nav aria-label="More files" className="grid gap-3 sm:grid-cols-2 print:hidden">
              {older ? (
                <Link href={`/hub/library/${older.id}`} className="aq-card aq-lift flex flex-col gap-1 p-4 no-underline">
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-dim">
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    Previous
                  </span>
                  <span className="line-clamp-2 text-[14px] font-semibold text-ink">{older.title}</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {newer ? (
                <Link href={`/hub/library/${newer.id}`} className="aq-card aq-lift flex flex-col items-end gap-1 p-4 text-right no-underline">
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-dim">
                    Next
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="line-clamp-2 text-[14px] font-semibold text-ink">{newer.title}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>

        <aside className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex lg:self-start print:hidden">
          <nav aria-label="On this page" className="aq-card p-2">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-dim">On this page</p>
            <ol>
              <li>
                <a href="#summary" className={navLink}>
                  Summary
                </a>
              </li>
              <li>
                <a href="#file" className={navLink}>
                  {file.readable ? (inlineHref ? "Preview" : "File") : "Unlock"}
                </a>
              </li>
              {more.length ? (
                <li>
                  <a href="#more" className={navLink}>
                    More in {shelfName}
                  </a>
                </li>
              ) : null}
            </ol>
          </nav>

          <dl className="aq-card grid gap-3 p-5 text-[13px]">
            {[
              ["Collection", file.collectionNames.join(", ") || "Library"],
              ["Type", hasValue(file.type) ? file.type : ""],
              ["Size", hasValue(file.size) ? file.size : ""],
              ["Updated", hasValue(file.updated) ? formatDay(file.updated) : ""],
              ["Access", FILE_ACCESS_LABEL[file.access]],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-dim">{label}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                </div>
              ))}
          </dl>
        </aside>
      </div>
    </article>
  );
}

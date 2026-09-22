/**
 * Library report reading page. Reports render as a readable, keyboard-
 * navigable web page (not only a PDF), with a sticky section navigator,
 * inline citation markers linking to the Sources block, prev/next week
 * navigation and the standing disclaimer.
 *
 * Locked reports render header + summary + first paragraph only, the full
 * body is never sent to the browser (server-side enforcement).
 */
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft, ArrowRight, Crown, Download, ExternalLink, Lock, Printer, Share2, Sparkles,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const DISCLAIMER =
  "This report is provided for information only. It does not constitute a price assessment, an offer, or trading advice. Prices are indicative and may be delayed. Verify independently before trading.";

const TYPE_LABEL: Record<string, string> = {
  weekly_market: "Weekly market",
  special_report: "Special report",
  data_pack: "Data pack",
  training: "Training",
  other: "Other",
};

const fmtDay = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

export default function LibraryReport() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = trpc.library.bySlug.useQuery({ slug: slug! }, { enabled: !!slug });
  const { data: neighbours } = trpc.library.neighbours.useQuery({ slug: slug! }, { enabled: !!slug });
  const downloadUrl = trpc.library.downloadUrl.useMutation({
    onSuccess: (r) => window.open(r.url, "_blank", "noopener"),
    onError: (e) => toast.error(e.message),
  });
  const logUpgrade = trpc.library.logUpgradeClick.useMutation();

  useEffect(() => {
    if (data?.title) document.title = `${data.title} · Aquifert Library`;
  }, [data?.title]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="h-8 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-4 rounded bg-slate-100 dark:bg-slate-800" />)}
        </div>
        <span className="sr-only">Loading report…</span>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600 dark:text-slate-300">This report could not be found.</p>
        <Link to="/library" className="mt-3 inline-flex h-10 items-center rounded-lg border border-navy-700 px-4 text-sm font-semibold text-navy-700 hover:bg-navy-700 hover:text-white dark:text-navy-200">
          Back to Library
        </Link>
      </div>
    );
  }

  const r = data;
  const body = r.body ?? [];
  const sources = r.sources ?? [];
  const sourceByMarker = new Map<number, (typeof sources)[number]>();
  // markers are assigned in generation order across all sections
  body.forEach((sec) => sec.citations.forEach((c) => {
    const src = sources.find((x) => x.sourceId === c.sourceRefId.split(":")[1]);
    if (src) sourceByMarker.set(c.marker, src);
  }));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };
  const upgrade = () => {
    logUpgrade.mutate({ reportId: r.id });
    navigate("/buyer/membership");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 print:py-0">
      {/* header */}
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {TYPE_LABEL[r.reportType] ?? r.reportType}
          {r.weekNumber ? ` · Week ${r.weekNumber}${r.year ? `, ${r.year}` : ""}` : ""}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-navy-900 dark:text-white sm:text-3xl">{r.title}</h1>
        <p className="mt-2 text-[13.5px] text-slate-500">
          {r.periodStart && r.periodEnd
            ? `${fmtDay(r.periodStart)} to ${fmtDay(r.periodEnd)} · `
            : ""}
          {r.authorName}
          {r.publishedAt ? ` · Published ${fmtDay(r.publishedAt)}` : ""}
        </p>

        {r.aiLabel && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" role="note">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            This report was drafted by AI from the sources listed below and reviewed by the Aquifert desk before publication.
          </div>
        )}

        {/* actions */}
        <div className="mt-5 flex flex-wrap gap-2 print:hidden">
          {r.hasFile && (
            <button
              type="button"
              onClick={() => downloadUrl.mutate({ reportId: r.id })}
              disabled={downloadUrl.isPending}
              className="inline-flex h-10 items-center rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {downloadUrl.isPending ? "Preparing…" : "Download PDF"}
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
            <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" /> Print
          </button>
          <button type="button" onClick={share} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
            <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> Share link
          </button>
        </div>
      </header>

      <div className="mt-8 gap-10 lg:flex">
        {/* sticky section navigator */}
        {body.length > 1 && (
          <nav aria-label="Report sections" className="mb-8 shrink-0 lg:mb-0 lg:w-52 print:hidden">
            <ol className="space-y-1 lg:sticky lg:top-24">
              {body.map((sec) => (
                <li key={sec.key}>
                  <a
                    href={`#sec-${sec.key}`}
                    className="block rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {sec.heading}
                  </a>
                </li>
              ))}
              {sources.length > 0 && (
                <li>
                  <a href="#sources" className="block rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-slate-800">
                    Sources
                  </a>
                </li>
              )}
            </ol>
          </nav>
        )}

        {/* body */}
        <div className="min-w-0 flex-1">
          {r.locked ? (
            <>
              <p className="text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-200">{r.summary}</p>
              {r.previewParagraph && (
                <div className="relative mt-4">
                  <p className="text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-200" aria-hidden="true" style={{ maskImage: "linear-gradient(to bottom, black 30%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent)" }}>
                    {r.previewParagraph}
                  </p>
                  <span className="sr-only">Preview ends. Full report requires {r.accessLevel} access.</span>
                </div>
              )}
              <div className="mt-6 rounded-xl border border-navy-700/20 bg-navy-700/[0.04] p-6 text-center dark:border-slate-600">
                {r.accessLevel === "premium"
                  ? <Crown className="mx-auto h-6 w-6 text-amber-600" aria-hidden="true" />
                  : <Lock className="mx-auto h-6 w-6 text-navy-700 dark:text-navy-200" aria-hidden="true" />}
                <h2 className="mt-2 text-[16px] font-bold text-navy-900 dark:text-white">
                  This report is for {r.accessLevel === "premium" ? "Scale members" : "members"}
                </h2>
                <p className="mx-auto mt-1 max-w-md text-[13.5px] text-slate-600 dark:text-slate-300">
                  Upgrade to read the full report, including every section, citation and the downloadable PDF.
                </p>
                <button
                  type="button"
                  onClick={upgrade}
                  className="mt-4 inline-flex h-11 items-center rounded-lg bg-navy-700 px-6 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Unlock with membership
                </button>
              </div>
            </>
          ) : (
            <>
              {body.map((sec) => (
                <section key={sec.key} id={`sec-${sec.key}`} aria-labelledby={`h-${sec.key}`} className="scroll-mt-24">
                  <h2 id={`h-${sec.key}`} className="mt-8 text-[19px] font-bold text-navy-900 first:mt-0 dark:text-white">
                    {sec.heading}
                  </h2>
                  {sec.paragraphs.map((p, i) => {
                    const cites = sec.citations.filter((c) => c.marker);
                    return (
                      <p key={i} className="mt-3 text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                        {p}
                        {i === sec.paragraphs.length - 1 && cites.length > 0 && (
                          <span className="ml-1 inline-flex flex-wrap gap-1 align-baseline">
                            {[...new Set(cites.map((c) => c.marker))].map((m) => (
                              <a
                                key={m}
                                href={`#src-${m}`}
                                aria-label={`Source ${m}: ${sourceByMarker.get(m)?.sourceTitle ?? "see sources"}`}
                                className="rounded bg-teal-500/15 px-1.5 text-[11px] font-semibold text-teal-700 hover:bg-teal-500/30 dark:text-teal-300"
                              >
                                [{m}]
                              </a>
                            ))}
                          </span>
                        )}
                      </p>
                    );
                  })}
                </section>
              ))}

              {sources.length > 0 && (
                <section id="sources" aria-labelledby="h-sources" className="mt-10 scroll-mt-24 border-t border-slate-200 pt-6 dark:border-slate-700">
                  <h2 id="h-sources" className="text-[19px] font-bold text-navy-900 dark:text-white">Sources</h2>
                  <ol className="mt-4 space-y-2.5">
                    {sources.map((src, i) => (
                      <li key={src.id} id={`src-${i + 1}`} className="scroll-mt-24 text-[13px] text-slate-600 dark:text-slate-300">
                        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">[{i + 1}]</span>
                        {src.sourceUrl ? (
                          <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-700 underline-offset-2 hover:underline dark:text-navy-200">
                            {src.sourceTitle} <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="font-medium text-navy-900 dark:text-white">{src.sourceTitle}</span>
                        )}
                        <span className="text-slate-500">
                          {" "}· {src.sourceType.replace(/_/g, " ")} · {fmtDay(src.sourceDate)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <p className="mt-10 border-t border-slate-200 pt-5 text-[12px] leading-relaxed text-slate-500 dark:border-slate-700">
                {DISCLAIMER}
              </p>
            </>
          )}

          {/* prev / next */}
          <nav aria-label="More reports" className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 print:hidden">
            {neighbours?.prev ? (
              <Link to={`/library/${neighbours.prev.slug}`} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> Previous week
              </Link>
            ) : <span />}
            {neighbours?.next ? (
              <Link to={`/library/${neighbours.next.slug}`} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                Next week <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            ) : <span />}
          </nav>
        </div>
      </div>
    </div>
  );
}

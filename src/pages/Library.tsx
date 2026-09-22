/**
 * Library, member-facing index of desk reports.
 * Every signed-in user sees the full list; locked reports show their title,
 * week, summary, a blurred first-paragraph preview and an upgrade CTA
 * (showing what you're missing is the point of the feature).
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { BookOpen, Crown, Download, Lock, Search, Sparkles } from "lucide-react";
import { trpc } from "@/providers/trpc";

type Card = {
  id: string;
  slug: string;
  title: string;
  reportType: string;
  weekNumber: number | null;
  year: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  summary: string;
  accessLevel: "free" | "members" | "premium";
  origin: string;
  authorName: string;
  publishedAt: Date | null;
  tags: string[];
  viewCount: number;
  locked: boolean;
  hasFile: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  weekly_market: "Weekly market",
  special_report: "Special report",
  data_pack: "Data pack",
  training: "Training",
  other: "Other",
};

const fmtDay = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
const fmtPeriod = (a: Date | null, b: Date | null) => {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  const sameMonth = da.getMonth() === db.getMonth();
  return `${da.getDate()}${sameMonth ? "" : ` ${da.toLocaleDateString("en-GB", { month: "long" })}`} to ${db.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
};

function AccessBadge({ level }: { level: Card["accessLevel"] }) {
  if (level === "free")
    return <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">Free</span>;
  if (level === "members")
    return <span className="inline-flex items-center gap-1 rounded-full bg-navy-700/10 px-2.5 py-0.5 text-[11px] font-semibold text-navy-700 dark:text-navy-200"><Lock className="h-3 w-3" aria-hidden="true" />Members</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"><Crown className="h-3 w-3" aria-hidden="true" />Premium</span>;
}

function ReportCard({ r, featured }: { r: Card; featured?: boolean }) {
  const navigate = useNavigate();
  const logUpgrade = trpc.library.logUpgradeClick.useMutation();
  const open = () => navigate(`/library/${r.slug}`);
  const upgrade = () => {
    logUpgrade.mutate({ reportId: r.id });
    navigate("/buyer/membership");
  };
  const weekLabel =
    r.reportType === "weekly_market" && r.weekNumber
      ? ` · Week ${r.weekNumber}${r.year ? `, ${r.year}` : ""}`
      : "";
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${
        featured ? "p-6 sm:p-8" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          {TYPE_LABEL[r.reportType] ?? r.reportType}{weekLabel}
        </span>
        {featured && <span className="rounded bg-teal-500/15 px-2 py-0.5 text-teal-700 dark:text-teal-300">Latest</span>}
        {r.origin === "ai_generated" && (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 normal-case tracking-normal text-slate-500 dark:bg-slate-800">
            <Sparkles className="h-3 w-3" aria-hidden="true" />AI-drafted · desk-reviewed
          </span>
        )}
        <span className="ml-auto"><AccessBadge level={r.accessLevel} /></span>
      </div>

      <h2 className={`mt-3 font-bold text-navy-900 dark:text-white ${featured ? "text-xl sm:text-2xl" : "text-[17px]"}`}>
        <Link to={`/library/${r.slug}`} className="hover:underline">{r.title}</Link>
      </h2>
      {fmtPeriod(r.periodStart, r.periodEnd) && (
        <p className="mt-1 text-[12.5px] text-slate-500">{fmtPeriod(r.periodStart, r.periodEnd)}</p>
      )}
      <p className={`mt-2 leading-relaxed text-slate-600 dark:text-slate-300 ${featured ? "text-[14.5px]" : "text-[13.5px]"}`}>
        {r.summary}
      </p>

      {r.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.tags.slice(0, 8).map((t) => (
            <span key={t} className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-700">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {r.locked ? (
          <button
            type="button"
            onClick={upgrade}
            className="inline-flex h-10 items-center rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Lock className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Unlock with {r.accessLevel === "premium" ? "Scale" : "membership"}
          </button>
        ) : (
          <button
            type="button"
            onClick={open}
            className="inline-flex h-10 items-center rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" /> Read report
          </button>
        )}
        {r.hasFile && !r.locked && (
          <span className="inline-flex items-center text-[12px] text-slate-500">
            <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />PDF available inside
          </span>
        )}
        <span className="ml-auto text-[12px] text-slate-400">
          {r.publishedAt ? `Published ${fmtDay(r.publishedAt)}` : ""} · {r.viewCount} reads
        </span>
      </div>
    </article>
  );
}

export default function Library() {
  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState("");
  const [year, setYear] = useState("");
  const [week, setWeek] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "most_read">("newest");
  const [page, setPage] = useState(1);

  const { data: flags } = trpc.library.flags.useQuery();
  const { data, isLoading } = trpc.library.list.useQuery({
    search: search || undefined,
    reportType: reportType || undefined,
    year: year ? Number(year) : undefined,
    week: week ? Number(week) : undefined,
    tag: tag || undefined,
    sort,
    page,
  });

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1];
  }, []);

  if (flags && !flags.libraryEnabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">
        The Library is not available right now.
      </div>
    );
  }

  const filtered = !!(search || reportType || year || week || tag);
  const clear = () => {
    setSearch(""); setReportType(""); setYear(""); setWeek(""); setTag(""); setPage(1);
  };

  const inputCls =
    "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Library</h1>
      <p className="mt-1 text-[14px] text-slate-500">
        Weekly market reports and research from the Aquifert desk.
      </p>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-2" role="search">
        <div className="relative">
          <label htmlFor="lib-search" className="sr-only">Search reports</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="lib-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title, summary, tags…"
            className={`${inputCls} w-64 pl-9`}
          />
        </div>
        <label htmlFor="lib-type" className="sr-only">Filter by report type</label>
        <select id="lib-type" value={reportType} onChange={(e) => { setReportType(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label htmlFor="lib-year" className="sr-only">Filter by year</label>
        <select id="lib-year" value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">Any year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label htmlFor="lib-week" className="sr-only">Filter by week</label>
        <input id="lib-week" value={week} onChange={(e) => { setWeek(e.target.value.replace(/\D/g, "")); setPage(1); }} placeholder="Week" className={`${inputCls} w-20`} inputMode="numeric" />
        <label htmlFor="lib-tag" className="sr-only">Filter by product or region tag</label>
        <input id="lib-tag" value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }} placeholder="Tag (e.g. Urea, Brazil)" className={`${inputCls} w-44`} />
        <label htmlFor="lib-sort" className="sr-only">Sort reports</label>
        <select id="lib-sort" value={sort} onChange={(e) => setSort(e.target.value as never)} className={inputCls}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most_read">Most read</option>
        </select>
      </div>

      {/* list */}
      <div className="mt-6 space-y-4" aria-live="polite">
        {isLoading ? (
          <>
            <div className="h-48 animate-none rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />
            <div className="h-36 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />
            <div className="h-36 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />
            <span className="sr-only">Loading reports…</span>
          </>
        ) : !data || (data.items.length === 0 && !data.featured) ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            {filtered ? (
              <>
                <p className="text-[14px] text-slate-600 dark:text-slate-300">No reports match these filters.</p>
                <button type="button" onClick={clear} className="mt-3 inline-flex h-10 items-center rounded-lg border border-navy-700 px-4 text-sm font-semibold text-navy-700 hover:bg-navy-700 hover:text-white dark:text-navy-200">
                  Clear filters
                </button>
              </>
            ) : (
              <p className="text-[14px] text-slate-600 dark:text-slate-300">No reports published yet.</p>
            )}
          </div>
        ) : (
          <>
            {data.featured && <ReportCard r={data.featured as Card} featured />}
            {data.items.map((r) => <ReportCard key={r.id} r={r as Card} />)}
            {data.pages > 1 && (
              <nav aria-label="Library pages" className="flex items-center justify-center gap-2 pt-2">
                {Array.from({ length: data.pages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i + 1)}
                    aria-current={page === i + 1 ? "page" : undefined}
                    className={`h-11 w-11 rounded-lg text-sm font-semibold sm:h-9 sm:w-9 ${
                      page === i + 1
                        ? "bg-navy-700 text-white"
                        : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, RadioTower, Search, X } from "lucide-react";
import { btnPrimary, btnSecondary, fieldClass, hintClass, labelClass } from "@/components/app/form";
import type { SearchParams } from "@/components/hub/analytics/format";
import { allTags, filterTelex, isFiltered, parseCount, parseTelexFilter, TELEX_PAGE, telexQuery } from "@/components/hub/analytics/telex-filter";
import { AsOf, DownloadLink, SegLinks } from "@/components/hub/analytics/ui";
import { Disclaimer, EmptyPanel, HubPageHeader, Panel } from "@/components/hub/kit";
import { LockedScreen } from "@/components/hub/locked-screen";
import { TelexList } from "@/components/hub/telex-list";
import { getHubAccess } from "@/lib/aq-modules/access";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { TELEX_PRODUCTS } from "@/lib/aq-modules/types";
import { formatDay, formatStamp } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { readTelexIds } from "@/lib/telex-reads/store";

export const metadata: Metadata = { title: "AQ TELEX" };
export const dynamic = "force-dynamic";

export default async function AqTelexPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user, modules, can } = await getHubAccess();
  if (!can("aq-telex")) return <LockedScreen module="aq-telex" required={modules.access["aq-telex"]} plan={user.plan} />;

  const params = await searchParams;
  const filter = parseTelexFilter(params);
  const count = parseCount(params);
  const [content, readIds] = await Promise.all([getHubContent(), readTelexIds(user)]);
  const all = publishedTelex(content.telex, "all");
  const tags = allTags(all);
  const matches = filterTelex(all, filter);
  const shown = matches.slice(0, count);
  const forCounts = filterTelex(all, { ...filter, product: "" });
  const filtered = isFiltered(filter);
  const oldest = all.at(-1)?.publishedAt;

  return (
    <div className="flex flex-col gap-5 pb-2">
      <HubPageHeader
        eyebrow="AQ Analytics"
        title="AQ TELEX"
        description="The full desk wire: every flash for every plan tier, with the complete archive. Search it, narrow it by product, tag or date, and export what you are reading."
        tip="AQ TELEX carries every flash the desk files, including AQ Analytics and AQ ZERO items. Search matches the headline, text and tags, and every word you type must appear. Filters live in the address bar, so you can bookmark or share a view."
        actions={matches.length ? <DownloadLink href={`/hub/analytics/telex/csv${telexQuery(filter)}`} label={filtered ? "Download CSV (this filter)" : "Download CSV"} /> : null}
      />

      <section className="aq-card aq-rise p-4 sm:p-5" aria-label="Filter the wire">
        <SegLinks
          label="Product"
          items={[
            { href: telexQuery(filter, { product: "" }) || "?", label: `All · ${forCounts.length}`, active: !filter.product },
            ...TELEX_PRODUCTS.map((product) => ({
              href: telexQuery(filter, { product }),
              label: `${product} · ${forCounts.filter((item) => item.product === product).length}`,
              active: filter.product === product,
            })),
          ]}
        />

        <form method="get" action="/hub/analytics/telex" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          {filter.product ? <input type="hidden" name="product" value={filter.product} /> : null}
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="telex-q" className={labelClass}>
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
              <input id="telex-q" name="q" type="search" defaultValue={filter.q} placeholder="Urea India tender, Brazil MAP…" maxLength={120} className={`${fieldClass} pl-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="telex-tag" className={labelClass}>
              Tag
            </label>
            <div className="relative">
              <select id="telex-tag" name="tag" defaultValue={filter.tag} className={`${fieldClass} appearance-none pr-9`}>
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
            </div>
          </div>
          <div>
            <label htmlFor="telex-from" className={labelClass}>
              From
            </label>
            <input id="telex-from" name="from" type="date" defaultValue={filter.from} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="telex-to" className={labelClass}>
              To
            </label>
            <input id="telex-to" name="to" type="date" defaultValue={filter.to} className={fieldClass} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button type="submit" className={`${btnPrimary} flex-1 lg:flex-none`}>
              Apply
            </button>
            {filtered ? (
              <Link href="/hub/analytics/telex" className={`${btnSecondary} px-4`} aria-label="Clear all filters">
                <X className="h-4 w-4" aria-hidden /> Clear
              </Link>
            ) : null}
          </div>
        </form>
        <p className={hintClass}>{oldest ? `The archive runs back to ${formatDay(oldest)}.` : "The archive grows with every flash the desk files."}</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[14.5px] text-mid" aria-live="polite">
          {matches.length ? (
            <>
              Showing <strong className="font-semibold text-ink">{shown.length}</strong> of <strong className="font-semibold text-ink">{matches.length}</strong> {matches.length === 1 ? "flash" : "flashes"}
              {filtered ? " matching your filters" : ""}
            </>
          ) : (
            "No flashes match these filters"
          )}
        </p>
        {all[0] ? <AsOf>Latest filed {formatStamp(all[0].publishedAt)}</AsOf> : null}
      </div>

      {!all.length ? (
        <EmptyPanel title="The wire is quiet for now" body="The desk publishes flashes through the trading day. New ones appear here the moment they are filed." />
      ) : matches.length ? (
        <Panel title="Desk wire" sub="Newest first, grouped by day" icon={RadioTower} tone="blue">
          <TelexList items={shown} mode="preview" thumb={48} readIds={readIds} />
          {shown.length < matches.length ? (
            <div className="flex flex-col items-center gap-1.5 border-t border-border px-5 py-5">
              <Link href={telexQuery(filter, { n: count + TELEX_PAGE })} scroll={false} className={btnSecondary}>
                Load {Math.min(TELEX_PAGE, matches.length - shown.length)} more
              </Link>
              <p className="text-[13px] text-dim">{matches.length - shown.length} older flashes in this view</p>
            </div>
          ) : null}
        </Panel>
      ) : (
        <EmptyPanel
          title="Nothing matches these filters"
          body="Try fewer search words, a wider date range or another product. The CSV download follows whatever filter you set."
          action={
            <Link href="/hub/analytics/telex" className={btnSecondary}>
              Clear filters
            </Link>
          }
        />
      )}

      <Disclaimer />
    </div>
  );
}

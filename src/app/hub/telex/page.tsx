import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, Lock, RadioTower } from "lucide-react";
import { btnSecondary } from "@/components/app/form";
import { TelexFilters } from "@/components/hub/aq1/telex-filters";
import { Disclaimer, EmptyPanel, HubPageHeader } from "@/components/hub/kit";
import { TelexList } from "@/components/hub/telex-list";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedTelex, type TelexView } from "@/lib/aq-modules/telex";
import { TELEX_PRODUCTS, type TelexProduct } from "@/lib/aq-modules/types";
import { formatStamp } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const metadata: Metadata = { title: "Market TELEX Feed" };
export const dynamic = "force-dynamic";

const PAGE = 40;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** No `p` means "open on the saved default"; `p=all` means the member cleared it. */
function parseProducts(raw: string | undefined, fallback: TelexProduct[]): TelexProduct[] {
  if (raw === undefined) return fallback;
  if (raw === "all" || !raw.trim()) return [];
  const picked = raw.split(",").map((item) => item.trim());
  return TELEX_PRODUCTS.filter((item) => picked.includes(item));
}

/** Locked flashes are searched by headline and tags only, so a search never reveals what they say. */
const haystack = (item: TelexView) => [item.headline, item.tags.join(" "), item.product, item.readable ? item.paragraphs.join(" ") : ""].join(" ").toLowerCase();

export default async function TelexPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { user, admin, can } = await getHubAccess();
  const [content, prefs] = await Promise.all([getHubContent(), getPrefs(user)]);

  const telex = publishedTelex(content.telex, admin ? "all" : user.plan);
  const saved = TELEX_PRODUCTS.filter((item) => prefs.telexProducts.includes(item));
  const selected = parseProducts(first(params.p), saved);
  const query = (first(params.q) ?? "").slice(0, 120);
  const limit = Math.max(PAGE, Math.min(1000, Number(first(params.n)) || PAGE));

  const needle = query.trim().toLowerCase();
  const searched = needle ? telex.filter((item) => haystack(item).includes(needle)) : telex;
  const matches = selected.length ? searched.filter((item) => selected.includes(item.product)) : searched;
  const shown = matches.slice(0, limit);
  const counts = Object.fromEntries(TELEX_PRODUCTS.map((product) => [product, searched.filter((item) => item.product === product).length])) as Record<TelexProduct, number>;
  const locked = matches.filter((item) => !item.readable).length;

  const moreParams = new URLSearchParams({ p: selected.length ? selected.join(",") : "all", n: String(limit + PAGE) });
  if (query) moreParams.set("q", query);

  return (
    <div className="mx-auto max-w-4xl pb-2">
      <HubPageHeader
        eyebrow="AQ ONE Free plan"
        title="Market TELEX Feed"
        description="Desk-issued market flashes, newest first and grouped by day. Pick the products you trade and save them as your default, so the feed opens on what matters to you."
        tip="Short, time-stamped flashes from the Aquifert desk: tenders, price moves, plant news and freight. Green chips lean firmer, red lean softer. Flashes above your plan show as locked rows."
        guide="telex"
        actions={
          <Link href="/hub/analytics/telex" className={btnSecondary}>
            {can("aq-telex") ? <RadioTower className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Full AQ TELEX wire
          </Link>
        }
      />

      <TelexFilters selected={selected} query={query} saved={saved} counts={counts} matching={matches.length} total={telex.length} />

      <section className="aq-card mt-4 overflow-hidden" aria-label="Telex flashes">
        <div className="flex items-start gap-2 border-b border-border bg-s2 px-5 py-2.5 text-[13px] leading-relaxed text-mid">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" aria-hidden />
          <p>
            Preliminary market intel, filed as the desk hears it.
            {telex[0] ? <> Last flash {formatStamp(telex[0].publishedAt)} desk time.</> : null}
            {locked ? (
              <>
                {" "}
                {locked} {locked === 1 ? "flash is" : "flashes are"} on a higher plan.{" "}
                <Link href="/hub/membership" className="font-semibold text-blue no-underline hover:underline">
                  Compare plans
                </Link>
              </>
            ) : null}
          </p>
        </div>

        {matches.length ? (
          <TelexList items={shown} mode="full" />
        ) : telex.length ? (
          <div className="p-5">
            <EmptyPanel
              title="No flashes match this filter"
              body={needle ? `Nothing mentions "${query}" in ${selected.length ? selected.join(", ") : "any product"}. Try a shorter word or widen the products.` : "The desk has not filed on these products recently. Widen the filter to see the rest of the feed."}
              action={
                <Link href="/hub/telex?p=all" className={btnSecondary}>
                  Show every flash
                </Link>
              }
            />
          </div>
        ) : (
          <div className="p-5">
            <EmptyPanel title="The feed is quiet for now" body="The desk files flashes through the trading day. New ones appear here the moment they are published." />
          </div>
        )}

        {matches.length > shown.length ? (
          <div className="border-t border-border px-5 py-3 text-center">
            <Link href={`/hub/telex?${moreParams.toString()}`} scroll={false} className="inline-flex items-center gap-1 text-[14.5px] font-semibold text-blue no-underline hover:underline">
              Show older flashes ({matches.length - shown.length} more) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-4">
        <Disclaimer />
      </div>
    </div>
  );
}
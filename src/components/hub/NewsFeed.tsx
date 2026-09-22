import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { PanelHeader, PanelSkeleton, PanelError, PanelEmpty } from "./FreshnessBadge";
import { PRODUCT_LABEL, REGION_LABEL } from "./TelexFeed";
import { timeAgo } from "@/lib/format";

export function NewsFeed({
  products, regions, onClearFilters,
}: { products: string[]; regions: string[]; onClearFilters: () => void }) {
  const query = trpc.hub.news.useQuery({ products, regions, limit: 30 });
  const items = query.data?.items ?? [];

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="Global News"
          sub="Headlines syndicated from publisher feeds, every item links out"
          freshness={query.data?.freshness}
        />
        {query.isLoading && <div className="mt-4"><PanelSkeleton rows={5} tall /></div>}
        {query.isError && (
          <div className="mt-4"><PanelError label="News feed" onRetry={() => query.refetch()} /></div>
        )}
        {query.isSuccess && items.length === 0 && (
          <div className="mt-4">
            <PanelEmpty
              message="No headlines match your current filters yet. Feeds refresh on their publisher cadence."
              actionLabel="Show everything"
              onAction={onClearFilters}
            />
          </div>
        )}
        {items.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {items.map((it) => (
              <li key={it.id} className="py-3">
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <p className="text-[13px] font-semibold leading-snug text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300">
                    {it.headline}
                    <ExternalLink className="mb-0.5 ml-1 inline h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">(opens on publisher site)</span>
                  </p>
                </a>
                <p className="mt-0.5 text-[11px] font-semibold text-navy-700 dark:text-navy-200">
                  {it.sourceName}
                  <span className="ml-2 font-normal text-muted-foreground">{timeAgo(it.publishedAt)}</span>
                  <span className="ml-2 rounded bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {PRODUCT_LABEL[it.product] ?? it.product}
                  </span>
                  {it.geography !== "GLOBAL" && (
                    <span className="ml-1 rounded bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {REGION_LABEL[it.geography] ?? it.geography}
                    </span>
                  )}
                </p>
                {it.snippet && (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{it.snippet}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {query.isSuccess && query.data.sources.length > 0 && (
          <p className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
            Feeds: {query.data.sources.map((x) => x.name).join(" · ")}. Headlines and short snippets are
            syndicated under each publisher's RSS terms; full articles live on the publisher's site.
            {query.data.sources.some((x) => x.lastError) && (
              <span className="block font-semibold text-amber-700 dark:text-amber-400">
                One or more feeds missed their last refresh, showing last good items.
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { PanelHeader, PanelEmpty } from "./FreshnessBadge";
import { PRODUCT_LABEL, REGION_LABEL } from "./TelexFeed";
import { FeedThumb } from "./FeedThumb";
import { timeAgo } from "@/lib/format";
import { SAMPLE_NEWS } from "@contracts/hub-sample";

export function NewsFeed({
  products, regions, onClearFilters,
}: { products: string[]; regions: string[]; onClearFilters: () => void }) {
  const items = SAMPLE_NEWS.items.filter((it) => {
    if (products.length && !products.includes(it.product)) return false;
    if (regions.length && !regions.includes(it.geography)) return false;
    return true;
  });

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="Global News"
          sub="Headlines syndicated from publisher feeds, every item links out"
          freshness={SAMPLE_NEWS.freshness}
        />
        {items.length === 0 && (
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
                  className="flex items-start gap-3 group"
                >
                  <FeedThumb product={it.product} size={48} alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-foreground group-hover:underline">
                      {it.headline}
                      <ExternalLink className="ml-1 inline h-3 w-3 align-text-top text-muted-foreground" aria-hidden />
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {it.sourceName} · {timeAgo(it.publishedAt)} ·{" "}
                      <span className="uppercase tracking-wide">{PRODUCT_LABEL[it.product] ?? it.product}</span>
                      {" · "}
                      <span className="uppercase tracking-wide">{REGION_LABEL[it.geography] ?? it.geography}</span>
                    </p>
                    {it.snippet && (
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{it.snippet}</p>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

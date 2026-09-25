import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PanelHeader, PanelEmpty } from "./FreshnessBadge";
import { FeedThumb } from "./FeedThumb";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { SAMPLE_TELEX_PAGE } from "@contracts/hub-sample";

const PRODUCT_LABEL: Record<string, string> = {
  NITROGEN: "Nitrogen", PHOSPHATE: "Phosphate", POTASSIUM: "Potash",
  FREIGHT: "Freight", GENERAL: "General",
};
const REGION_LABEL: Record<string, string> = {
  GLOBAL: "Global", MIDDLE_EAST: "Middle East", NORTH_AMERICA: "N. America",
  SOUTH_AMERICA: "S. America", EUROPE: "Europe", SOUTH_ASIA: "S. Asia",
  EAST_ASIA: "E. Asia", FSU: "FSU", AFRICA: "Africa",
};

function Tag({ children, tone = "navy" }: { children: string; tone?: "navy" | "teal" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      tone === "teal"
        ? "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300"
        : "bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-200"
    }`}>{children}</span>
  );
}

export function TelexFeed({
  products, regions, onClearFilters,
}: { products: string[]; regions: string[]; onClearFilters: () => void }) {
  const query = trpc.hub.telex.useInfiniteQuery(
    { products, regions, limit: 12 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      retry: 0,
      placeholderData: { pages: [SAMPLE_TELEX_PAGE], pageParams: [undefined] },
    },
  );

  const groups = useMemo(() => {
    const items = (query.data?.pages.flatMap((p) => p.items) ?? SAMPLE_TELEX_PAGE.items)
      .filter((it) => {
        if (products.length && !products.includes(it.product)) return false;
        if (regions.length && !regions.includes(it.geography)) return false;
        return true;
      });
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const day = fmtDate(it.createdAt);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(it);
    }
    return [...map.entries()];
  }, [query.data, products, regions]);

  const freshness = query.data?.pages[0]?.freshness ?? SAMPLE_TELEX_PAGE.freshness;

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="TELEX Intelligence"
          sub="Desk-issued market flashes, chronological"
          freshness={freshness}
        />
        {groups.length === 0 && (
          <div className="mt-4">
            <PanelEmpty
              message="No TELEX flashes match your current filters. The desk publishes through the trading day."
              actionLabel="Show everything"
              onAction={onClearFilters}
            />
          </div>
        )}
        {groups.length > 0 && (
          <div className="mt-4 space-y-6">
            {groups.map(([day, items]) => (
              <div key={day}>
                <p className="sticky top-0 z-10 -mx-1 bg-card px-1 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {day}
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {items.map((it) => (
                    <li key={it.id} className="py-3">
                      <div className="flex items-start gap-3">
                        <FeedThumb imageUrl={it.imageUrl} product={it.product} size={56} alt="" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                              {new Date(it.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <Tag tone="teal">{PRODUCT_LABEL[it.product] ?? it.product}</Tag>
                            <Tag>{REGION_LABEL[it.geography] ?? it.geography}</Tag>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{it.title}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{it.body}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            UPDATED {fmtDateTime(it.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {query.hasNextPage && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline" size="sm"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load older flashes"}
                </Button>
              </div>
            )}
            <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              TELEX flashes are desk assessments provided for information only. They do not constitute
              an offer, a price assessment, or advice. Verify independently before trading.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export { PRODUCT_LABEL, REGION_LABEL };

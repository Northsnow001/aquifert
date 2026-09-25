/**
 * 1.1 AQ TELEX — full feed, unrestricted, for entitled members. Filters by
 * product, region, tag and date; saveable default filter; freshness badge.
 */
import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { FeedThumb } from "@/components/hub/FeedThumb";
import { trpc } from "@/providers/trpc";
import { Freshness, LockedTeaser } from "@/components/analytics/shared";
import { toast } from "sonner";

export default function TelexFull() {
  const saved = trpc.analytics.telexSavedFilter.useQuery();
  const [products, setProducts] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (saved.data && !applied) {
      setProducts(saved.data.products);
      setRegions(saved.data.regions);
      setApplied(true);
    }
  }, [saved.data, applied]);

  const q = trpc.analytics.telex.useQuery(
    { products, regions, tags: tag ? tag.split(",").map((t) => t.trim()).filter(Boolean) : [], from: from || undefined, to: to || undefined, limit: 200 },
    { retry: 0 },
  );
  const locked = q.error && !q.isLoading;
  const save = trpc.analytics.telexSaveFilter.useMutation({ onSuccess: () => toast.success("Default filter saved") });

  const items = q.data?.items ?? [];
  const allProducts = q.data?.products ?? [];
  const allRegions = q.data?.regions ?? [];

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (locked) {
    return (
      <LockedTeaser capability="intel.telex_feed" title="AQ TELEX">
        <p>The full TELEX intelligence feed, unrestricted — every desk flash, filterable by product, region, tag and date, with a saveable default view.</p>
      </LockedTeaser>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="AQ TELEX"
        description="The full market intelligence feed. Filter it, save your default, and the freshest flashes land first."
        actions={<span><Freshness asOf={q.data?.freshnessAsOf ? new Date(q.data.freshnessAsOf).toISOString().slice(0, 10) : null} /></span>}
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Products</legend>
              <div className="flex flex-wrap gap-2">
                {allProducts.map((p) => (
                  <label key={p} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                    <Checkbox checked={products.includes(p)} onCheckedChange={() => toggle(products, setProducts, p)} aria-label={p} /> {p}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regions</legend>
              <div className="flex flex-wrap gap-2">
                {allRegions.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                    <Checkbox checked={regions.includes(r)} onCheckedChange={() => toggle(regions, setRegions, r)} aria-label={r} /> {r}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Label htmlFor="tl-tag">Tags (comma-separated)</Label>
              <Input id="tl-tag" placeholder="tender, turnaround" value={tag} onChange={(e) => setTag(e.target.value)} />
            </div>
            <div className="w-36">
              <Label htmlFor="tl-from">From</Label>
              <Input id="tl-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="w-36">
              <Label htmlFor="tl-to">To</Label>
              <Input id="tl-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => save.mutate({ products, regions })}>
              <Save className="mr-1.5 h-4 w-4" /> Save as my default
            </Button>
          </div>
        </CardContent>
      </Card>

      <div aria-live="polite" className="text-xs text-muted-foreground">
        {q.data ? `${q.data.total} item${q.data.total === 1 ? "" : "s"} match your filters.` : "Loading…"}
      </div>

      <div className="space-y-3">
        {items.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex gap-4 p-4">
              <FeedThumb imageUrl={t.imageUrl} product={t.product} size={56} className="h-14 w-20 shrink-0" alt="" />
              <div className="min-w-0">
                <p className="font-semibold">{t.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.product} · {t.geography} · {new Date(t.createdAt).toISOString().slice(0, 16).replace("T", " ")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {q.isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted/40" aria-label="Loading TELEX" />}
        {q.data && !items.length && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Nothing matches these filters. Try widening the date range or clearing a product or region.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

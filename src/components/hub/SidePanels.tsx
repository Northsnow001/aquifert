import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { PanelHeader, PanelSkeleton, PanelError, PanelEmpty } from "./FreshnessBadge";
import { fmtDate } from "@/lib/format";

export function FreightPanel() {
  const q = trpc.hub.freight.useQuery();
  const d = q.data;

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="Freight Analytics"
          sub="Open enquiries and corridor analysis from the freight desk"
          freshness={d?.freshness}
        />
        {q.isLoading && <div className="mt-4"><PanelSkeleton rows={5} /></div>}
        {q.isError && <div className="mt-4"><PanelError label="Freight analytics" onRetry={() => q.refetch()} /></div>}
        {q.isSuccess && d.enquiries.length === 0 && !d.commentary && (
          <div className="mt-4">
            <PanelEmpty
              message="No open freight enquiries on the desk right now."
              actionLabel="Reload"
              onAction={() => q.refetch()}
            />
          </div>
        )}
        {d && d.enquiries.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Account</th>
                  <th className="py-1.5 pr-2 font-medium">Product</th>
                  <th className="py-1.5 pr-2 text-right font-medium">Qty MT</th>
                  <th className="py-1.5 pr-2 font-medium">Origin</th>
                  <th className="py-1.5 pr-2 font-medium">Destination</th>
                  <th className="py-1.5 font-medium">Laycan</th>
                </tr>
              </thead>
              <tbody>
                {d.enquiries.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-2 font-mono text-muted-foreground">{e.accountCode}</td>
                    <td className="py-2 pr-2 text-foreground">{e.product}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-foreground">{e.qtyMt.toLocaleString("en-GB")}</td>
                    <td className="py-2 pr-2 text-foreground">{e.origin}</td>
                    <td className="py-2 pr-2 text-foreground">{e.destination}</td>
                    <td className="py-2 text-foreground">{e.laycan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Accounts are anonymised desk codes, counterparties are never identified.
            </p>
          </div>
        )}
        {d?.commentary && (
          <div className="mt-4">
            <p className="text-sm font-semibold leading-snug text-foreground">{d.commentary.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {d.commentary.byline} · {fmtDate(d.commentary.publishedAt)}
            </p>
            <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
              {d.commentary.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CommentaryPanel() {
  const q = trpc.hub.commentary.useQuery();
  const c = q.data?.commentary;
  const [expanded, setExpanded] = useState(false);
  const paras = c ? (expanded ? c.paragraphs : c.paragraphs.slice(0, 2)) : [];

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader title="Market Commentary" sub="The latest AQ VIEW" freshness={q.data?.freshness} />
        {q.isLoading && <div className="mt-4"><PanelSkeleton rows={4} /></div>}
        {q.isError && <div className="mt-4"><PanelError label="Market commentary" onRetry={() => q.refetch()} /></div>}
        {q.isSuccess && !c && (
          <div className="mt-4">
            <PanelEmpty
              message="The next AQ VIEW is being drafted by the desk."
              actionLabel="Reload"
              onAction={() => q.refetch()}
            />
          </div>
        )}
        {c && (
          <div className="mt-4">
            <p className="text-[11px] text-muted-foreground">{fmtDate(c.publishedAt)} · {c.byline}</p>
            <h3 className="mt-1 text-base font-bold leading-snug tracking-tight text-foreground">{c.title}</h3>
            <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted-foreground">
              {paras.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline dark:text-navy-200"
            >
              {expanded ? "Collapse article" : "Expand article"}
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

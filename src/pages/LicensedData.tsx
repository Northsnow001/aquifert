import { useState } from "react";
import { Download, Lock, ShieldAlert } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";

/**
 * Licensed market data browser. Every read goes through the enforcement
 * service: datasets the licence forbids are never returned; export controls
 * are hidden (not disabled) where export is forbidden; attribution renders
 * adjacent to the values.
 */
export default function LicensedData() {
  const list = trpc.licensed.datasets.useQuery();
  const [open, setOpen] = useState<string | null>(null);
  const detail = trpc.licensed.dataset.useQuery(
    { datasetKey: open ?? "", limit: 50 },
    { enabled: !!open },
  );
  const doExport = trpc.licensed.export.useMutation({
    onSuccess: (r) => {
      if (r.ok) {
        const blob = new Blob([JSON.stringify(r.rows, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${open}.json`;
        a.click();
        toast.success(`Exported ${r.rows.length} rows`);
      } else {
        toast.error(r.message);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Licensed market data"
        description="Third-party datasets served under their licence terms. Availability, exports and attribution follow the contract, not the UI."
      />

      {list.data && !list.data.enabled && (
        <Card><CardContent className="p-5 text-sm text-muted-foreground">
          Licensed data is not enabled on this deployment.
        </CardContent></Card>
      )}

      {list.data?.enabled && list.data.datasets.length === 0 && (
        <Card><CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          No licensed datasets are available to your account. Some datasets are restricted to named licensed users — ask your administrator about a seat.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {(list.data?.datasets ?? []).map((d) => (
          <Card key={d.datasetKey}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-navy-900 dark:text-white">{d.label}</h3>
                  <p className="font-mono text-[11px] text-muted-foreground">{d.datasetKey}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen(open === d.datasetKey ? null : d.datasetKey)}>
                    {open === d.datasetKey ? "Close" : "View"}
                  </Button>
                  {/* Export control hidden entirely when the licence forbids it */}
                  {d.exportAllowed && (
                    <Button size="sm" variant="ghost" disabled={doExport.isPending}
                      onClick={() => doExport.mutate({ datasetKey: d.datasetKey, rows: d.maxRowsPerExport ?? 100 })}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Export{d.maxRowsPerExport != null ? ` (max ${d.maxRowsPerExport} rows)` : ""}
                    </Button>
                  )}
                </div>
              </div>
              {d.maxRowsPerExport != null && d.exportAllowed && (
                <p className="mt-1 text-[11px] text-muted-foreground">This licence caps exports at {d.maxRowsPerExport} rows per file.</p>
              )}

              {open === d.datasetKey && detail.data && (
                <div className="mt-4 border-t border-border pt-4">
                  {!detail.data.allowed ? (
                    <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {detail.data.message}
                    </p>
                  ) : (
                    <>
                      <table className="w-full text-[12px]">
                        <tbody>
                          {detail.data.rows.map((r, i) => (
                            <tr key={r.providerRecordId ?? i} className="border-b border-border/50">
                              <td className="py-1.5 pr-3 font-mono text-[11px] text-muted-foreground">{r.providerRecordId ?? "—"}</td>
                              <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(r.dataAsOf).toLocaleDateString("en-GB")}</td>
                              <td className="py-1.5 pr-3">
                                {Object.entries(r.payload).map(([k, v]) => (
                                  <span key={k} className="mr-3"><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{String(v)}</span></span>
                                ))}
                              </td>
                              {r.stale && <td className="py-1.5 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">stale</td>}
                            </tr>
                          ))}
                          {!detail.data.rows.length && (
                            <tr><td className="py-3 text-muted-foreground">No rows within the licence display window.</td></tr>
                          )}
                        </tbody>
                      </table>
                      {/* Attribution adjacent to the values, never a footer */}
                      {detail.data.attribution && (
                        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-[11px] font-medium text-muted-foreground">
                          {detail.data.attribution}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clearFreightDebug } from "@/app/admin/freight-calculator/actions";
import { Card, EmptyState, btnSecondary, field } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { DebugEntry, DebugLevel } from "@/lib/freight-desk/types";

const LEVEL_STYLE: Record<DebugLevel, string> = {
  info: "bg-blue-light text-blue",
  warn: "bg-[#fff6e5] text-[#9a5b00]",
  error: "bg-[#fdecec] text-[#b42318]",
};

function contextText(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DebugPanel({ entries }: { entries: DebugEntry[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [level, setLevel] = useState<"all" | DebugLevel>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const out: Record<DebugLevel, number> = { info: 0, warn: 0, error: 0 };
    for (const entry of entries) out[entry.level] += 1;
    return out;
  }, [entries]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => (level === "all" || entry.level === level) && (!needle || `${entry.message} ${JSON.stringify(entry.context)}`.toLowerCase().includes(needle)));
  }, [entries, level, query]);
  const clear = () =>
    start(async () => {
      await clearFreightDebug();
      toast.success("Debug log cleared.");
      router.refresh();
    });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="mr-auto flex gap-1">
          {(["all", "error", "warn", "info"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLevel(key)}
              className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold capitalize transition ${level === key ? "bg-ink text-white" : "text-mid hover:bg-s2 hover:text-ink"}`}
            >
              {key === "all" ? `All ${entries.length}` : `${key === "warn" ? "Warnings" : key === "error" ? "Errors" : "Info"} ${counts[key]}`}
            </button>
          ))}
        </div>
        <input aria-label="Search debug log" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" className={`${field} h-9 w-56`} />
        <button type="button" className={btnSecondary} disabled={busy || !entries.length} onClick={() => window.confirm("Clear the whole debug log?") && clear()}>
          <Trash2 className="h-4 w-4" />
          Clear log
        </button>
      </div>
      {visible.length ? (
        <ul className="divide-y divide-border">
          {visible.map((entry, i) => {
            const context = Object.entries(entry.context ?? {});
            return (
              <li key={`${entry.at}-${i}`} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[150px_64px_minmax(0,1fr)]">
                <span className="font-mono text-[12px] text-mid">{formatStamp(entry.at)}</span>
                <span>
                  <span className={`rounded px-1.5 py-px font-mono text-[10.5px] font-semibold uppercase ${LEVEL_STYLE[entry.level]}`}>{entry.level}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{entry.message}</p>
                  {context.length ? (
                    <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px]">
                      {context.map(([key, value]) => (
                        <div key={key} className="flex min-w-0 gap-1">
                          <dt className="text-dim">{key}</dt>
                          <dd className="truncate font-mono text-mid" title={contextText(value)}>
                            {contextText(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={entries.length ? "Nothing matches this filter" : "The debug log is empty"}
          body={entries.length ? undefined : "Market data refreshes, AI reads and imports write here, so you can see what ran and why something failed."}
        />
      )}
      <p className="border-t border-border px-4 py-2.5 text-[11.5px] text-dim">Keeps the latest 200 entries, times in UTC.</p>
    </Card>
  );
}

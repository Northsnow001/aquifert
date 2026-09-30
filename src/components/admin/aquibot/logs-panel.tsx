"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clearAquibotLogs } from "@/app/admin/aquibot/actions";
import { btnSecondary } from "@/components/admin/ui";
import type { LogKind, LogRow } from "@/lib/aquibot-engine/store";
import { Panel } from "./shared";

const KINDS: { key: LogKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "index", label: "Indexing" },
  { key: "connection", label: "Gemini connection" },
  { key: "chat", label: "Chat" },
];

const LEVEL = { info: "bg-s2 text-mid", warn: "bg-[#fff6e5] text-[#9a5b00]", error: "bg-[#fdecec] text-[#9b2c2c]" } as const;

export function LogsPanel({ rows, kind }: { rows: LogRow[]; kind: LogKind | "all" }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function clear() {
    const scope = kind === "all" ? "all logs" : `${KINDS.find((item) => item.key === kind)?.label.toLowerCase()} logs`;
    if (!window.confirm(`Clear ${scope}? Logs older than 30 days are removed automatically.`)) return;
    startTransition(async () => {
      const result = await clearAquibotLogs(kind);
      if (!result.ok) toast.error(result.message);
      else {
        toast.success("Logs cleared");
        router.refresh();
      }
    });
  }

  return (
    <Panel
      title="Logs"
      description="Indexing runs, Gemini connection problems and chat failures. Successful answers are kept in Sessions, not here."
      icon={<History className="h-4 w-4" />}
      actions={
        <button type="button" className={btnSecondary} onClick={clear} disabled={pending || rows.length === 0}>
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-s2 p-0.5">
        {KINDS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "all" ? "?tab=logs" : `?tab=logs&kind=${item.key}`}
            className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold no-underline transition ${kind === item.key ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[12.5px] text-dim">No log entries.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => {
            const hasMeta = Object.keys(row.meta ?? {}).length > 0;
            return (
              <li key={row.id}>
                <button type="button" onClick={() => setOpen(open === row.id ? null : row.id)} className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-s2/40" disabled={!hasMeta}>
                  <ChevronRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-dim transition ${open === row.id ? "rotate-90" : ""} ${hasMeta ? "" : "invisible"}`} />
                  <span className={`shrink-0 rounded px-1.5 py-px font-mono text-[10.5px] uppercase ${LEVEL[row.level]}`}>{row.level}</span>
                  <span className="shrink-0 font-mono text-[11px] text-dim">{row.kind}</span>
                  <span className="min-w-0 flex-1 text-[12.5px] text-ink">{row.message}</span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-dim">
                    {new Date(row.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </button>
                {open === row.id ? <pre className="mx-3 mb-2 overflow-x-auto rounded-lg bg-s2 p-2 font-mono text-[11px] text-ink">{JSON.stringify(row.meta, null, 2)}</pre> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

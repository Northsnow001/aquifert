"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Props<T extends { id: string }> = {
  resource: "suppliers" | "buyers" | "rfqs" | "quotes" | "freight";
  table: string;
  initial: T[];
  render: (rows: T[]) => React.ReactNode;
};

export function TradeLive<T extends { id: string }>({ resource, table, initial, render }: Props<T>) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const res = await fetch(`/api/admin/trade/live?resource=${resource}`, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; rows?: T[] } | null;
      if (!cancelled && body?.ok && Array.isArray(body.rows)) setRows(body.rows);
    };
    const timer = window.setInterval(() => void pull(), 4000);
    const client = createBrowserSupabase();
    const channel = client
      ?.channel(`trade-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => void pull())
      .subscribe();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [resource, table]);

  return <>{render(rows)}</>;
}

export function TradeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-dim ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-border px-4 py-2.5 align-middle text-ink ${className}`}>{children}</td>;
}

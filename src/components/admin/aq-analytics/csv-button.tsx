"use client";

import { btnSecondary } from "@/components/admin/ui";

export function CsvButton({ filename, rows }: { filename: string; rows: Record<string, string | number | null>[] }) {
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={() => {
        if (!rows.length) return;
        const cols = Object.keys(rows[0]);
        const body = [cols.join(","), ...rows.map((row) => cols.map((col) => JSON.stringify(row[col] ?? "")).join(","))].join("\n");
        const blob = new Blob([body], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export CSV
    </button>
  );
}

export function PrintButton({ onPrint }: { onPrint?: () => void }) {
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={() => {
        onPrint?.();
        window.print();
      }}
    >
      Download / print
    </button>
  );
}

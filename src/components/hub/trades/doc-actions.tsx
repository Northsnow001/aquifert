"use client";

import { useState } from "react";
import type { TradeDoc } from "@/lib/buyer-trades/book";

export function DocActions({ doc, refId }: { doc: TradeDoc; refId: string }) {
  const [open, setOpen] = useState(false);
  function download() {
    const body = [`Aquifert document record`, `Trade: ${refId}`, `Document: ${doc.name}`, `File: ${doc.file}`, `Status: ${doc.status}`, `Updated: ${doc.updated}`, "", "Sample record. The signed file is issued on a live trade."].join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${refId}-${doc.name.replace(/\s+/g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setOpen(true)} className="text-[12.5px] font-semibold text-blue">
        View
      </button>
      <button type="button" onClick={download} className="text-[12.5px] font-semibold text-ink" aria-label={`Download ${doc.name}`}>
        ↓
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={doc.name}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="font-mono text-[11px] uppercase tracking-wide text-dim">{refId}</p>
            <h3 className="mt-1 text-[18px] font-semibold">{doc.name}</h3>
            <p className="mt-2 text-[13.5px] text-mid">{doc.file}</p>
            <p className="mt-1 text-[13px]">
              {doc.status} · {doc.updated}
            </p>
            <p className="mt-3 text-[12.5px] text-dim">Sample record. A live trade stores the signed PDF in this folder.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-3 py-1.5 text-[13px] font-semibold">
                Close
              </button>
              <button type="button" onClick={download} className="rounded-full bg-[#123a5f] px-3 py-1.5 text-[13px] font-semibold text-white">
                Download record
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

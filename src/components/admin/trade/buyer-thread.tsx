"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, X } from "lucide-react";
import { getBuyerThreadAction } from "@/app/admin/trade/actions";
import { btnGhost, btnSecondary } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { BuyerAuditLine } from "@/lib/desk-hitl/audit";
import type { TradeBuyer } from "@/lib/trade/types";

function lineLabel(line: BuyerAuditLine, buyer: TradeBuyer) {
  if (line.role === "system") return line.channel === "email" ? "Email" : "Desk";
  if (line.role === "buyer") return buyer.contactName || buyer.companyName;
  if (line.channel === "email") return "Email";
  if (line.channel === "whatsapp") return "WhatsApp";
  return "Desk";
}

export function BuyerThread({
  buyer,
  onClose,
  onEdit,
}: {
  buyer: TradeBuyer;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [lines, setLines] = useState<BuyerAuditLine[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setLines(null);
    setError("");
    getBuyerThreadAction({ buyerId: buyer.id, phone: buyer.whatsappE164 ?? "", email: buyer.email }).then((result) => {
      if (!live) return;
      if (!result.ok) setError(result.error);
      setLines(result.lines);
    });
    return () => {
      live = false;
    };
  }, [buyer.id, buyer.whatsappE164, buyer.email]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/25" onClick={onClose}>
      <aside className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-[-24px_0_60px_-32px_rgb(16_38_59/0.45)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">Conversation</p>
            <h2 className="mt-1 truncate text-[18px] font-semibold tracking-[-0.03em] text-ink">{buyer.companyName}</h2>
            <p className="mt-0.5 text-[12.5px] text-mid">
              {buyer.code}
              {buyer.contactName ? ` · ${buyer.contactName}` : ""}
              {buyer.email ? ` · ${buyer.email}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" className={btnSecondary} onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button type="button" className={btnGhost} onClick={onClose} aria-label="Close conversation">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f7fa] px-4 py-5">
          {lines === null ? (
            <p className="px-2 text-[13.5px] text-mid">Loading conversation…</p>
          ) : error ? (
            <p className="rounded-xl border border-[#f2d9a0] bg-[#fffaf0] px-4 py-3 text-[13.5px] text-[#7a5200]">{error}</p>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink shadow-sm">
                <MessageCircle className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[16px] font-semibold text-ink">No messages yet</p>
              <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-mid">
                {buyer.whatsappE164
                  ? "WhatsApp, email and desk events for this buyer will appear here as one audit trail."
                  : "Invite them by email. They tap the WhatsApp link, send a message, and the chat continues here."}
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {lines.map((row) => {
                if (row.role === "system") {
                  return (
                    <li key={row.id} className="px-2">
                      <p className="text-center text-[12px] leading-relaxed text-dim">
                        {row.requestId ? <span className="font-medium text-mid">{row.requestId} · </span> : null}
                        {row.text}
                      </p>
                      {row.dealId ? (
                        <p className="mt-0.5 text-center">
                          <Link href={`/admin/desk/${row.dealId}`} className="text-[11px] font-semibold text-blue no-underline hover:underline">
                            Open desk
                          </Link>
                        </p>
                      ) : null}
                      {row.at ? <p className="mt-0.5 text-center text-[11px] text-dim">{formatStamp(row.at)}</p> : null}
                    </li>
                  );
                }
                const outbound = row.role === "desk";
                return (
                  <li key={row.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                    <article
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-[0_8px_24px_-20px_rgb(16_38_59/0.5)] ${
                        outbound ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-white text-ink"
                      }`}
                    >
                      <p className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${outbound ? "text-white/55" : "text-dim"}`}>
                        {lineLabel(row, buyer)}
                        {row.requestId ? ` · ${row.requestId}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">{row.text}</p>
                      {row.outboundStatus === "queued" ? (
                        <p className={`mt-1 text-[11px] ${outbound ? "text-white/45" : "text-dim"}`}>Queued</p>
                      ) : null}
                      {row.at ? (
                        <p className={`mt-1.5 text-[11px] ${outbound ? "text-white/45" : "text-dim"}`}>{formatStamp(row.at)}</p>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

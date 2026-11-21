"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Pencil, X } from "lucide-react";
import { getSupplierThreadAction } from "@/app/admin/trade/actions";
import { btnGhost, btnSecondary } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { TradeMessage, TradeSupplier } from "@/lib/trade/types";

function agentLabel(payload: Record<string, unknown>) {
  const key = String(payload.agent ?? "");
  if (key === "wechat-supplier-quote") return "Matt";
  if (key === "wechat-supplier-unknown") return "Supplier desk";
  return payload.event === "subscribe" ? "WeChat follow" : "WeChat";
}

export function SupplierThread({
  supplier,
  onClose,
  onEdit,
}: {
  supplier: TradeSupplier;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const [messages, setMessages] = useState<TradeMessage[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setMessages(null);
    setError("");
    getSupplierThreadAction({ supplierId: supplier.id, openid: supplier.wechatOpenid ?? "" }).then((result) => {
      if (!live) return;
      if (!result.ok) setError(result.error);
      setMessages(result.messages);
    });
    return () => {
      live = false;
    };
  }, [supplier.id, supplier.wechatOpenid]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-[-24px_0_60px_-32px_rgb(16_38_59/0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">WeChat thread</p>
            <h2 className="mt-1 truncate text-[18px] font-semibold tracking-[-0.03em] text-ink">{supplier.companyName}</h2>
            <p className="mt-0.5 text-[12.5px] text-mid">
              {supplier.code}
              {supplier.contactName ? ` · ${supplier.contactName}` : ""}
              {supplier.email ? ` · ${supplier.email}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onEdit ? (
              <button type="button" className={btnSecondary} onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : null}
            <button type="button" className={btnGhost} onClick={onClose} aria-label="Close conversation">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f7fa] px-4 py-5">
          {messages === null ? (
            <p className="px-2 text-[13.5px] text-mid">Loading conversation…</p>
          ) : error ? (
            <p className="rounded-xl border border-[#f2d9a0] bg-[#fffaf0] px-4 py-3 text-[13.5px] text-[#7a5200]">{error}</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink shadow-sm">
                <MessageCircle className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[16px] font-semibold text-ink">No messages yet</p>
              <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-mid">
                {supplier.wechatOpenid
                  ? "When this supplier writes on WeChat, the full thread will appear here — inbound and Matt’s replies."
                  : "Invite them on WeChat first. The conversation starts after they scan their QR and follow."}
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {messages.map((row) => {
                const outbound = row.direction === "out";
                return (
                  <li key={row.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                    <article
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-[0_8px_24px_-20px_rgb(16_38_59/0.5)] ${
                        outbound ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-white text-ink"
                      }`}
                    >
                      <p className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${outbound ? "text-white/55" : "text-dim"}`}>
                        {outbound ? agentLabel(row.payload) : supplier.contactName || supplier.companyName}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">{row.body}</p>
                      {row.createdAt ? (
                        <p className={`mt-1.5 text-[11px] ${outbound ? "text-white/45" : "text-dim"}`}>{formatStamp(row.createdAt)}</p>
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

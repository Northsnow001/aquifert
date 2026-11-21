"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteBuyersAction, inviteAllBuyersAction, inviteBuyerAction } from "@/app/admin/trade/actions";
import { BuyerSheet } from "@/components/admin/trade/buyer-sheet";
import { BuyerThread } from "@/components/admin/trade/buyer-thread";
import { TradeLive } from "@/components/admin/trade/live-table";
import { btnDanger, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { BUYER_ONBOARDING_LABEL, type OnboardingStatus, type TradeBuyer } from "@/lib/trade/types";

const TONE: Record<OnboardingStatus, string> = {
  to_invite: "bg-[#fff6e5] text-[#9a5b00]",
  invited: "bg-[#e8f1fb] text-blue",
  subscribed: "bg-[#eaf7ef] text-[#1f7a45]",
  skipped: "bg-s2 text-mid",
};

type Filter = "all" | OnboardingStatus;

function initials(row: TradeBuyer) {
  const source = row.companyName || row.contactName || row.code;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase() || "B";
}

export function BuyersBoard({ initial }: { initial: TradeBuyer[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<TradeBuyer | "new" | null>(null);
  const [thread, setThread] = useState<TradeBuyer | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const removeSelected = () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} buyer${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    start(async () => {
      const result = await deleteBuyersAction(ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${result.deleted} buyer${result.deleted === 1 ? "" : "s"}`);
      setSelected(new Set());
      setSheet(null);
      setThread(null);
      router.refresh();
    });
  };

  const inviteOne = (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setBusyId(id);
    start(async () => {
      const result = await inviteBuyerAction(id);
      setBusyId(null);
      if (result.ok) {
        toast.success(`Invite sent to ${result.email}`);
        router.refresh();
      } else toast.error(result.error || "Invite failed.");
    });
  };

  const inviteAll = () => {
    start(async () => {
      const batch = await inviteAllBuyersAction();
      if ("error" in batch && batch.error) {
        toast.error(batch.error);
        return;
      }
      const ok = batch.results.filter((row) => row.ok).length;
      const fail = batch.results.filter((row) => !row.ok).length;
      toast.success(`${ok} invite${ok === 1 ? "" : "s"} sent${fail ? `, ${fail} skipped` : ""}`);
      router.refresh();
    });
  };

  return (
    <>
      <TradeLive
        resource="buyers"
        table="trade_buyers"
        initial={initial}
        render={(rows) => {
          const waiting = rows.filter((row) => row.onboardingStatus === "to_invite").length;
          const invited = rows.filter((row) => row.onboardingStatus === "invited").length;
          const onWa = rows.filter((row) => row.onboardingStatus === "subscribed" || row.whatsappE164).length;
          const needle = query.trim().toLowerCase();
          const visible = rows.filter((row) => {
            if (filter !== "all" && row.onboardingStatus !== filter) return false;
            if (!needle) return true;
            return [row.companyName, row.contactName, row.email, row.code, row.country].join(" ").toLowerCase().includes(needle);
          });

          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Buyers on file", value: rows.length },
                  { label: "Waiting invite", value: waiting },
                  { label: "Invite sent", value: invited },
                  { label: "On WhatsApp", value: onWa },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_0_rgb(16_38_59/0.04)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">{stat.label}</p>
                    <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search company, email…"
                      className="h-11 w-full rounded-full border border-border bg-white pl-10 pr-4 text-[13.5px] text-ink outline-none placeholder:text-dim focus:border-blue/40"
                    />
                  </label>
                  <div className="flex flex-wrap gap-1 rounded-full border border-border bg-white p-1">
                    {(
                      [
                        ["all", "All"],
                        ["to_invite", "To invite"],
                        ["invited", "Invite sent"],
                        ["subscribed", "On WhatsApp"],
                      ] as const
                    ).map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFilter(id)}
                        className={`h-8 rounded-full px-3 text-[12.5px] font-semibold ${filter === id ? "bg-ink text-white" : "text-mid hover:text-ink"}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {selected.size > 0 ? (
                    <button type="button" className={btnDanger} disabled={pending} onClick={removeSelected}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete {selected.size}
                    </button>
                  ) : null}
                  <button type="button" className={btnSecondary} disabled={pending || waiting === 0} onClick={inviteAll}>
                    Invite waiting
                  </button>
                  <button type="button" className={btnPrimary} onClick={() => setSheet("new")}>
                    <Plus className="h-3.5 w-3.5" />
                    Add buyer
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_-28px_rgb(16_38_59/0.35)]">
                {visible.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-s2 text-ink">
                      <Users className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-[16px] font-semibold text-ink">{rows.length === 0 ? "No buyers on the book yet" : "Nothing matches"}</p>
                    <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-mid">
                      {rows.length === 0 ? "Add the company and email, then send the WhatsApp desk invite." : "Try another search or filter."}
                    </p>
                    {rows.length === 0 ? (
                      <button type="button" className={`${btnPrimary} mt-5`} onClick={() => setSheet("new")}>
                        <Plus className="h-3.5 w-3.5" />
                        Add first buyer
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-border bg-[#f7f9fb]">
                          <th className="w-10 px-5 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border text-blue"
                              checked={visible.length > 0 && visible.every((row) => selected.has(row.id))}
                              ref={(el) => {
                                if (!el) return;
                                const n = visible.filter((row) => selected.has(row.id)).length;
                                el.indeterminate = n > 0 && n < visible.length;
                              }}
                              onChange={(event) => {
                                const on = event.target.checked;
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  for (const row of visible) {
                                    if (on) next.add(row.id);
                                    else next.delete(row.id);
                                  }
                                  return next;
                                });
                              }}
                              aria-label="Select all visible buyers"
                            />
                          </th>
                          {["Buyer", "Contact", "WhatsApp", "Status", ""].map((head) => (
                            <th key={head || "actions"} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((row) => (
                          <tr
                            key={row.id}
                            className={`cursor-pointer border-b border-border last:border-0 hover:bg-[#fbfcfd] ${selected.has(row.id) ? "bg-blue/[.06]" : ""}`}
                            onClick={() => setThread(row)}
                          >
                            <td className="w-10 px-5 py-3.5" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border text-blue"
                                checked={selected.has(row.id)}
                                onChange={(event) => toggleOne(row.id, event.target.checked)}
                                aria-label={`Select ${row.companyName}`}
                              />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                                  {initials(row)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-semibold text-ink">{row.companyName}</p>
                                  <p className="truncate text-[12px] text-dim">
                                    {row.code}
                                    {row.country ? ` · ${row.country}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-[13.5px] text-ink">{row.contactName || "—"}</p>
                              <p className="text-[12.5px] text-mid">{row.email || "No email"}</p>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[12px] text-mid">{row.whatsappE164 || "Pending invite"}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[row.onboardingStatus]}`}>
                                {BUYER_ONBOARDING_LABEL[row.onboardingStatus]}
                              </span>
                              {row.invitedAt ? <p className="mt-1 text-[11px] text-dim">{formatStamp(row.invitedAt)}</p> : null}
                            </td>
                            <td className="px-5 py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button type="button" className={btnSecondary} onClick={() => setThread(row)}>
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Chat
                                </button>
                                {row.onboardingStatus === "subscribed" ? (
                                  <span className="self-center text-[12px] text-dim">Linked</span>
                                ) : (
                                  <button
                                    type="button"
                                    className={btnSecondary}
                                    disabled={pending && busyId === row.id}
                                    onClick={(event) => inviteOne(row.id, event)}
                                  >
                                    {row.onboardingStatus === "invited" ? "Resend" : "Invite"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
      {thread ? (
        <BuyerThread
          buyer={thread}
          onClose={() => setThread(null)}
          onEdit={() => {
            setSheet(thread);
            setThread(null);
          }}
        />
      ) : null}
      {sheet ? (
        <BuyerSheet
          buyer={sheet}
          onClose={(saved) => {
            setSheet(null);
            if (saved) router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

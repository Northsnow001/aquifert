"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSupplierAction, inviteAllWaitingAction, inviteSupplierAction } from "@/app/admin/trade/actions";
import { TradeGrid, TradeLive, Td, Th } from "@/components/admin/trade/live-table";
import { btnPrimary, btnSecondary, EmptyState, input, label } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { ONBOARDING_LABEL, type OnboardingStatus, type TradeSupplier } from "@/lib/trade/types";

const TONE: Record<OnboardingStatus, string> = {
  to_invite: "bg-[#fff6e5] text-[#9a5b00]",
  invited: "bg-blue-light text-blue",
  subscribed: "bg-[#eaf7ef] text-[#1f7a45]",
  skipped: "bg-s2 text-mid",
};

function Status({ value }: { value: OnboardingStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[value]}`}>{ONBOARDING_LABEL[value]}</span>;
}

export function SuppliersBoard({ initial }: { initial: TradeSupplier[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const inviteOne = (id: string) => {
    setBusyId(id);
    start(async () => {
      const result = await inviteSupplierAction(id);
      setBusyId(null);
      if (result.ok) {
        toast.success(`Invite sent to ${result.email}${result.reusedToken ? " (WeChat token reused)" : ""}`);
        router.refresh();
      } else toast.error(result.error || "Invite failed.");
    });
  };

  const inviteAll = () => {
    start(async () => {
      const batch = await inviteAllWaitingAction();
      if ("error" in batch && batch.error) {
        toast.error(batch.error);
        return;
      }
      const ok = batch.results.filter((row) => row.ok).length;
      const fail = batch.results.filter((row) => !row.ok).length;
      toast.success(`${ok} invite${ok === 1 ? "" : "s"} sent${fail ? `, ${fail} skipped` : ""}${batch.truncated ? " (first 20 this run)" : ""}`);
      router.refresh();
    });
  };

  const add = (formData: FormData) => {
    start(async () => {
      const result = await createSupplierAction(formData);
      if (result.ok) {
        toast.success("Supplier saved as to invite.");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <form action={add} className="aq-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className={label}>Company</span>
          <input name="companyName" required className={input} />
        </label>
        <label className="block">
          <span className={label}>Contact</span>
          <input name="contactName" className={input} />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input name="email" type="email" required className={input} />
        </label>
        <label className="block">
          <span className={label}>Country</span>
          <input name="country" className={input} />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={btnSecondary} disabled={pending}>
            Add mill
          </button>
          <button type="button" className={btnPrimary} disabled={pending} onClick={inviteAll}>
            Invite all waiting
          </button>
        </div>
      </form>

      <TradeLive resource="suppliers" table="trade_suppliers" initial={initial} render={(rows) => (
        <div className="aq-card overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState title="No suppliers in the trade book yet" body="Add a mill above, or import the workbook. Status to_invite is who gets a WeChat QR email." />
          ) : (
            <TradeGrid>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Company</Th>
                  <Th>Email</Th>
                  <Th>WeChat</Th>
                  <Th>Onboarding</Th>
                  <Th>Last RFQ</Th>
                  <Th>Updated</Th>
                  <Th className="w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="font-medium">{row.code}</Td>
                    <Td>
                      <div>{row.companyName}</div>
                      <div className="text-[12px] text-dim">{row.contactName || row.country}</div>
                    </Td>
                    <Td className="text-mid">{row.email || "—"}</Td>
                    <Td className="font-mono text-[12px] text-mid">{row.wechatOpenid ? `${row.wechatOpenid.slice(0, 12)}…` : "—"}</Td>
                    <Td>
                      <Status value={row.onboardingStatus} />
                    </Td>
                    <Td>{row.lastRfqCode || "—"}</Td>
                    <Td className="text-dim">{row.updatedAt ? formatStamp(row.updatedAt) : "—"}</Td>
                    <Td>
                      {row.onboardingStatus === "subscribed" ? null : (
                        <button type="button" className={btnSecondary} disabled={pending && busyId === row.id} onClick={() => inviteOne(row.id)}>
                          {row.onboardingStatus === "invited" ? "Resend" : "Invite"}
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TradeGrid>
          )}
        </div>
      )} />
    </div>
  );
}

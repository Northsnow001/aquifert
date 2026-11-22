"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { generateDevQuotesAction, listDevQuoteRfqsAction } from "@/app/admin/trade/actions";
import { btnSecondary, input } from "@/components/admin/ui";

type RfqOption = {
  id: string;
  code: string;
  productLabel: string;
  readyQuoteCount: number;
  status: string;
};

export function DevQuoteBar({ rfqId }: { rfqId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(false);
  const [rfqs, setRfqs] = useState<RfqOption[]>([]);
  const [selected, setSelected] = useState(rfqId || "");
  const [count, setCount] = useState(3);

  useEffect(() => {
    listDevQuoteRfqsAction().then((result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEnabled(result.enabled);
      setRfqs(result.rfqs);
      if (!rfqId && result.rfqs[0]?.id) setSelected((current) => current || result.rfqs[0].id);
    });
  }, [rfqId]);

  if (!enabled) return null;

  const chosen = rfqs.find((row) => row.id === selected);

  const generate = () => {
    start(async () => {
      const result = await generateDevQuotesAction(selected || rfqId || "", count);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Linked ${result.created} dummy quote${result.created === 1 ? "" : "s"} to ${result.rfqCode || "the request"} · ${result.unique} unique so far`,
      );
      router.refresh();
    });
  };

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-[#e2c48a] bg-[#fffaf0] px-4 py-3">
      <div className="min-w-[9rem]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a5b00]">Dev only</p>
        <p className="mt-0.5 text-[12px] text-[#7a5200]">Dummy quotes must be tied to an RFQ.</p>
      </div>
      {rfqId ? (
        <p className="min-w-[10rem] flex-1 text-[13px] font-semibold text-ink">{chosen?.code || "This request"}</p>
      ) : (
        <label className="min-w-[16rem] flex-1 text-[12px] font-medium text-mid">
          Buyer request
          <select className={`${input} mt-1 h-9`} value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Select rfq#…</option>
            {rfqs.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code}
                {row.productLabel ? ` · ${row.productLabel}` : ""}
                {` · ${row.readyQuoteCount} quote${row.readyQuoteCount === 1 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-[12px] font-medium text-mid">
        How many
        <input
          className={`${input} mt-1 h-9 w-16`}
          type="number"
          min={1}
          max={8}
          value={count}
          onChange={(event) => setCount(Math.min(8, Math.max(1, Number(event.target.value) || 1)))}
        />
      </label>
      <button type="button" className={btnSecondary} disabled={pending || !selected} onClick={generate}>
        <FlaskConical className="h-3.5 w-3.5" />
        Generate dummy quotes
      </button>
    </div>
  );
}

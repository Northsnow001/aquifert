"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveTradeTemplates } from "@/app/admin/settings/actions";
import { btnPrimary, label, textarea, input } from "@/components/admin/ui";

const TAGS = ["buyer_name", "company", "product", "quantity", "destination", "incoterm", "packing", "delivery_window", "price_per_tonne", "validity", "inquiry_id"];

export function TradeTemplatesPanel({
  indicationTemplate,
  firmOfferTerms,
  zeroWeeklyClose,
  marketInbox,
}: {
  indicationTemplate: string;
  firmOfferTerms: string;
  zeroWeeklyClose: string;
  marketInbox: string;
}) {
  const [template, setTemplate] = useState(indicationTemplate);
  const [terms, setTerms] = useState(firmOfferTerms);
  const [close, setClose] = useState(zeroWeeklyClose);
  const [inbox, setInbox] = useState(marketInbox);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-5 rounded-2xl border border-border bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveTradeTemplates({ indicationTemplate: template, firmOfferTerms: terms, zeroWeeklyClose: close, marketInbox: inbox });
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Trade templates saved. New drafts use this wording.");
        });
      }}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Indication template</h2>
        <p className="mt-1 text-[13px] text-mid">Used on the shortlist after the margin is set. Do not invite a one-word yes. Placeholders: {TAGS.map((tag) => `{${tag}}`).join(", ")}.</p>
        <label className={`${label} mt-3`} htmlFor="indication-template">Wording</label>
        <textarea id="indication-template" className={`${textarea} mt-1 font-serif`} rows={14} value={template} onChange={(event) => setTemplate(event.target.value)} />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Firm offer terms</h2>
        <p className="mt-1 text-[13px] text-mid">Kept on file. The buyer email uses the firm offer document, the same wording as the PDF, and does not add this paragraph.</p>
        <label className={`${label} mt-3`} htmlFor="firm-terms">Terms</label>
        <textarea id="firm-terms" className={`${textarea} mt-1 font-serif`} rows={6} value={terms} onChange={(event) => setTerms(event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="weekly-close">AQ Zero weekly bid close</label>
          <input id="weekly-close" className={`${input} mt-1`} value={close} onChange={(event) => setClose(event.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="market-inbox">AQ Analytics data inbox</label>
          <input id="market-inbox" className={`${input} mt-1`} value={inbox} onChange={(event) => setInbox(event.target.value)} placeholder="markets@aquifert.com" />
        </div>
      </div>
      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? "Saving…" : "Save templates"}
      </button>
    </form>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  closeDealAction,
  rejectFirmOfferAction,
  removeFoAttachmentAction,
  saveFirmEmailAction,
  saveFirmOfferDraftAction,
  sendFirmOfferDraftToMeAction,
  sendFirmOfferToBuyerAction,
  sendMillFirmOfferAction,
  uploadFoAttachmentAction,
} from "@/app/admin/desk/actions";
import { DocEditor } from "@/components/admin/doc-editor";
import { btnDanger, btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { applyFirmOfferEditor, valuesFromPi, type PiEditorValues } from "@/lib/desk-hitl/pi";
import { firmOfferMismatches, firmOfferSubject } from "@/lib/desk-hitl/gates";
import { firmOfferDraftFromDeal } from "@/lib/firm-order/from-deal";
import { firmOfferEmailFromMarkdown, firmOfferLetterMarkdown } from "@/lib/firm-order/offer-email";
import { FO_ATTACHMENT_KINDS, FO_ATTACHMENT_LABEL, type DeskDeal, type FoAttachmentKind } from "@/lib/desk-hitl/types";

const emptyValues: PiEditorValues = {
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  product: "",
  quantityMt: "",
  unitPrice: "",
  packing: "",
  incoterm: "",
  loadPort: "",
  dischargePort: "",
  origin: "",
  shipping: "",
  paymentTerms: "",
  additionalInformation: "",
  invoiceNumber: "",
  invoiceDate: "",
};

function Field({
  id,
  caption,
  value,
  onChange,
  type = "text",
}: {
  id: keyof PiEditorValues;
  caption: string;
  value: string;
  onChange: (id: keyof PiEditorValues, value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={`fo-${id}`}>
        {caption}
      </label>
      <input id={`fo-${id}`} type={type} value={value} onChange={(e) => onChange(id, e.target.value)} className={`${input} mt-1`} />
    </div>
  );
}

function letterFrom(order: NonNullable<ReturnType<typeof firmOfferDraftFromDeal>>, values: PiEditorValues, note: string) {
  const next = applyFirmOfferEditor(order, values);
  if ("error" in next) return "";
  return firmOfferLetterMarkdown({ order: next, note });
}

export function FoEditor({ deal }: { deal: DeskDeal }) {
  const order = firmOfferDraftFromDeal(deal);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<FoAttachmentKind>("coa");
  const opening = deal.firmEmail?.note || `Dear ${deal.buyerName || "Buyer"}, thank you. Please see our firm offer below.`;
  const [subject, setSubject] = useState(deal.firmEmail?.subject || firmOfferSubject(deal));
  const [note, setNote] = useState(opening);
  const [values, setValues] = useState<PiEditorValues>(() => {
    const v = order ? valuesFromPi(order) : emptyValues;
    return {
      ...v,
      buyerName: v.buyerName || deal.buyerName || "",
      buyerEmail: v.buyerEmail || deal.buyerEmail || "",
      buyerPhone: v.buyerPhone || deal.buyerPhone || "",
    };
  });
  const [body, setBody] = useState(() => {
    if (deal.firmEmail?.body?.trim()) return deal.firmEmail.body;
    if (!order) return "";
    const seeded = valuesFromPi(order);
    return letterFrom(order, { ...seeded, buyerName: seeded.buyerName || deal.buyerName || "", buyerEmail: seeded.buyerEmail || deal.buyerEmail || "", buyerPhone: seeded.buyerPhone || deal.buyerPhone || "" }, opening);
  });
  const review = useMemo(() => (body.trim() ? firmOfferEmailFromMarkdown(body).html : ""), [body]);
  if (!order || deal.status === "waiting_desk") return null;
  const closed = deal.status === "closed";
  const fo = deal.firmOffer;
  const previewStamp = fo?.updatedAt || deal.execution?.confirmedAt || deal.updatedAt;
  const preview = `/admin/desk/${deal.id}/firm-offer?t=${encodeURIComponent(previewStamp)}`;
  const set = (id: keyof PiEditorValues, value: string) => setValues((prev) => ({ ...prev, [id]: value }));

  const save = () => {
    start(async () => {
      const result = await saveFirmOfferDraftAction({ id: deal.id, values });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Firm offer saved. Preview updated.");
      router.refresh();
    });
  };

  const send = () => {
    start(async () => {
      const result = await sendFirmOfferToBuyerAction({ id: deal.id, values, subject, note, body });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Firm offer emailed to ${values.buyerEmail} and the selected supplier.`);
      router.refresh();
    });
  };

  const sendMill = () => {
    start(async () => {
      const result = await sendMillFirmOfferAction({ id: deal.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Firm offer emailed to ${result.millEmail} at mill unit price.`);
      router.refresh();
    });
  };

  const reject = () => {
    start(async () => {
      const result = await rejectFirmOfferAction({ id: deal.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Marked as negotiating. Edit the offer and send again.");
      router.refresh();
    });
  };

  const close = () => {
    start(async () => {
      const result = await closeDealAction({ id: deal.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${deal.requestId} closed. The trade id is kept.`);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-[14.5px] font-semibold text-ink">Firm offer</h2>
          <p className="mt-0.5 text-[12.5px] text-mid">
            {closed
              ? "This request is closed. The letter is still on file."
              : fo?.status === "sent"
                ? `Last sent to ${fo.sentTo || "buyer"}. Edit the letter and send again if they rejected terms.`
                : "Buyer has not received this. The letter is loaded from the offer. Edit it, review the email, then send. Supplier cost never appears."}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            closed
              ? "bg-s2 text-mid"
              : fo?.status === "sent"
                ? "bg-[#eaf7ef] text-[#1f7a45]"
                : "bg-[#fff6e5] text-[#9a5b00]"
          }`}
        >
          {closed ? "Closed" : fo?.status === "sent" ? "Sent" : "For review"}
        </span>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <fieldset className="space-y-3" disabled={closed}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Buyer</legend>
            <Field id="buyerName" caption="Name" value={values.buyerName} onChange={set} />
            <Field id="buyerEmail" caption="Email (send to)" value={values.buyerEmail} onChange={set} type="email" />
            <Field id="buyerPhone" caption="WhatsApp / phone" value={values.buyerPhone} onChange={set} />
          </fieldset>
          <fieldset className="space-y-3" disabled={closed}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Line</legend>
            <Field id="product" caption="Product" value={values.product} onChange={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field id="quantityMt" caption="Quantity MT" value={values.quantityMt} onChange={set} />
              <Field id="unitPrice" caption="Buyer USD / MT" value={values.unitPrice} onChange={set} />
            </div>
            <Field id="packing" caption="Packing" value={values.packing} onChange={set} />
          </fieldset>
          <fieldset className="space-y-3" disabled={closed}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Logistics</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field id="incoterm" caption="Incoterm" value={values.incoterm} onChange={set} />
              <Field id="loadPort" caption="Load port" value={values.loadPort} onChange={set} />
            </div>
            <Field id="dischargePort" caption="Discharge / basis" value={values.dischargePort} onChange={set} />
            <Field id="origin" caption="Origin" value={values.origin} onChange={set} />
            <Field id="shipping" caption="Shipment window" value={values.shipping} onChange={set} />
          </fieldset>
          <fieldset className="space-y-3" disabled={closed}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Document</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field id="invoiceNumber" caption="Offer number" value={values.invoiceNumber} onChange={set} />
              <Field id="invoiceDate" caption="Offer date" value={values.invoiceDate} onChange={set} />
            </div>
            <div>
              <label className={label} htmlFor="fo-paymentTerms">
                Payment terms
              </label>
              <textarea
                id="fo-paymentTerms"
                rows={2}
                value={values.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
                className={`${textarea} mt-1`}
              />
            </div>
            <div>
              <label className={label} htmlFor="fo-additionalInformation">
                Additional information (on the PDF)
              </label>
              <textarea
                id="fo-additionalInformation"
                rows={4}
                value={values.additionalInformation}
                onChange={(e) => set("additionalInformation", e.target.value)}
                className={`${textarea} mt-1`}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-3" disabled={closed}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Pack files (buyer only)</legend>
            <p className="text-[12.5px] text-mid">PDF or image, 4 MB each. These go with the FO email. Do not upload supplier cost sheets.</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem]">
                <label className={label} htmlFor="fo-kind">
                  Type
                </label>
                <select
                  id="fo-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as FoAttachmentKind)}
                  className={`${input} mt-1`}
                >
                  {FO_ATTACHMENT_KINDS.map((item) => (
                    <option key={item} value={item}>
                      {FO_ATTACHMENT_LABEL[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <label className={label} htmlFor="fo-file">
                  File
                </label>
                <input
                  id="fo-file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                  className={`${input} mt-1 pt-1.5`}
                  disabled={pending || closed}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    start(async () => {
                      const body = new FormData();
                      body.set("id", deal.id);
                      body.set("kind", kind);
                      body.set("file", file);
                      const result = await uploadFoAttachmentAction(body);
                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success(`${FO_ATTACHMENT_LABEL[kind]} attached.`);
                      router.refresh();
                    });
                  }}
                />
              </div>
            </div>
            <ul className="space-y-1.5">
              {(deal.foPack?.attachments ?? []).map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-[13px]">
                  <a href={`/admin/desk/${deal.id}/fo-file/${file.id}`} target="_blank" rel="noreferrer" className="min-w-0 truncate font-medium text-blue no-underline hover:underline">
                    {FO_ATTACHMENT_LABEL[file.kind]} — {file.filename}
                  </a>
                  <button
                    type="button"
                    className="shrink-0 text-[12px] font-semibold text-danger"
                    disabled={pending || closed}
                    onClick={() => {
                      start(async () => {
                        const result = await removeFoAttachmentAction({ id: deal.id, attachmentId: file.id });
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success("Removed from pack.");
                        router.refresh();
                      });
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset className="space-y-3" disabled={closed}>
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-dim">Email to the buyer</legend>
            <p className="text-[12.5px] text-mid">The email is the firm offer. Write it on the right, review the email below it, then send. COA, TDS and photos stay as attachments. Nothing is sent until you press Send.</p>
            {firmOfferMismatches(deal).length ? (
              <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-ink">
                {firmOfferMismatches(deal).map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-mid">No difference found between the supplier quote and this firm offer.</p>
            )}
            <div>
              <label className={label} htmlFor="fo-subject">Subject</label>
              <input id="fo-subject" className={`${input} mt-1`} value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="fo-note">Personal note</label>
              <textarea id="fo-note" rows={3} className={`${textarea} mt-1`} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={pending || closed}
                onClick={() => setBody(letterFrom(order, values, note))}
              >
                Reload letter
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={pending || closed}
                onClick={() => {
                  start(async () => {
                    const result = await saveFirmEmailAction({ id: deal.id, subject, note, body });
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Email draft saved.");
                    router.refresh();
                  });
                }}
              >
                Save email draft
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={pending || closed}
                onClick={() => {
                  start(async () => {
                    const result = await sendFirmOfferDraftToMeAction({ id: deal.id, values, subject, note, body });
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Draft emailed to you.");
                  });
                }}
              >
                Send to my email
              </button>
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || closed} className={btnSecondary}>
              {pending ? "Saving…" : "Save offer"}
            </button>
            <button
              type="button"
              disabled={pending || closed}
              onClick={send}
              className={btnPrimary}
            >
              {pending ? "Sending…" : "Send"}
            </button>
            {fo?.status === "sent" ? (
              <button type="button" disabled={pending || closed} onClick={sendMill} className={btnSecondary}>
                {pending ? "Sending…" : "Email supplier FO"}
              </button>
            ) : null}
            <button type="button" disabled={pending || closed} onClick={reject} className={btnSecondary}>
              Back to negotiate
            </button>
            <button type="button" disabled={pending || closed} onClick={close} className={btnDanger}>
              Close request
            </button>
          </div>
        </form>
        <div className="flex min-h-[28rem] flex-col gap-4">
          <DocEditor
            id="firm-offer-letter"
            title="Firm offer"
            value={body}
            onChange={setBody}
            placeholder="The firm offer loads here. Edit it before you send."
            meta="Write, then review the email underneath."
            images={false}
            minHeight={420}
          />
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-dim">Email review</p>
              <a href={preview} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-blue no-underline">
                PDF copy
              </a>
            </div>
            <iframe title="Firm offer email review" srcDoc={review} className="h-[36rem] w-full rounded-xl border border-border bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

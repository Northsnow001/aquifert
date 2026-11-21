"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createBuyerAction, updateBuyerAction } from "@/app/admin/trade/actions";
import { btnPrimary, btnSecondary, field, label, textarea } from "@/components/admin/ui";
import type { TradeBuyer, TradeBuyerDraft } from "@/lib/trade/types";

const empty: TradeBuyerDraft = {
  companyName: "",
  contactName: "",
  jobTitle: "",
  email: "",
  phone: "",
  country: "",
  address: "",
  buyerType: "",
  productsOfInterest: "",
  notes: "",
  inviteNow: true,
};

function isExisting(buyer: TradeBuyer | null | "new"): buyer is TradeBuyer {
  return Boolean(buyer) && buyer !== "new";
}

function fromRow(row: TradeBuyer): TradeBuyerDraft {
  return {
    companyName: row.companyName,
    contactName: row.contactName,
    jobTitle: row.jobTitle,
    email: row.email,
    phone: row.whatsappE164 ?? "",
    country: row.country,
    address: row.address,
    buyerType: row.buyerType,
    productsOfInterest: row.productsOfInterest,
    notes: row.notes,
    inviteNow: false,
  };
}

export function BuyerSheet({ buyer, onClose }: { buyer: TradeBuyer | null | "new"; onClose: (saved: boolean) => void }) {
  const creating = buyer === "new";
  const existing = isExisting(buyer) ? buyer : null;
  const [draft, setDraft] = useState<TradeBuyerDraft>(() => (existing ? fromRow(existing) : empty));
  const [pending, start] = useTransition();
  const set = <K extends keyof TradeBuyerDraft>(key: K, value: TradeBuyerDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () =>
    start(async () => {
      const result = creating
        ? await createBuyerAction(draft)
        : existing
          ? await updateBuyerAction(existing.id, draft)
          : { ok: false as const, error: "Missing buyer." };
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (creating && "invited" in result && result.invited) toast.success("Buyer saved. WhatsApp invite is on its way.");
      else if (creating && "inviteError" in result && result.inviteError) toast.warning(`Buyer saved. Invite not sent: ${result.inviteError}`);
      else toast.success(creating ? "Buyer added." : "Buyer updated.");
      onClose(true);
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose(false)}>
      <form
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-[0_24px_80px_-24px_rgb(16_38_59/0.45)]"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">{creating ? "New buyer" : existing?.code ?? ""}</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ink">{creating ? "Add buyer" : "Edit buyer"}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-mid">
                Invite by email. They open WhatsApp with START plus their email so we can link the number.
              </p>
            </div>
            <button type="button" aria-label="Close" onClick={() => onClose(false)} className="rounded-full p-2 text-dim hover:bg-s2 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <label className={label} htmlFor="buy-company">
            Company name
          </label>
          <input id="buy-company" required className={`${field} h-10 w-full`} value={draft.companyName} onChange={(event) => set("companyName", event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="buy-contact">
                Contact name
              </label>
              <input id="buy-contact" className={`${field} mt-1.5 h-10 w-full`} value={draft.contactName} onChange={(event) => set("contactName", event.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="buy-job">
                Job title
              </label>
              <input id="buy-job" className={`${field} mt-1.5 h-10 w-full`} value={draft.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} />
            </div>
          </div>
          <label className={label} htmlFor="buy-email">
            Email
          </label>
          <input id="buy-email" type="email" required className={`${field} h-10 w-full`} value={draft.email} onChange={(event) => set("email", event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="buy-phone">
                WhatsApp
              </label>
              <input id="buy-phone" className={`${field} mt-1.5 h-10 w-full`} value={draft.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+44 …" />
            </div>
            <div>
              <label className={label} htmlFor="buy-country">
                Country
              </label>
              <input id="buy-country" className={`${field} mt-1.5 h-10 w-full`} value={draft.country} onChange={(event) => set("country", event.target.value)} />
            </div>
          </div>
          <label className={label} htmlFor="buy-type">
            Buyer type
          </label>
          <input id="buy-type" className={`${field} h-10 w-full`} value={draft.buyerType} onChange={(event) => set("buyerType", event.target.value)} placeholder="Importer, distributor…" />
          <label className={label} htmlFor="buy-addr">
            Address
          </label>
          <textarea id="buy-addr" className={textarea} rows={2} value={draft.address} onChange={(event) => set("address", event.target.value)} />
          <label className={label} htmlFor="buy-notes">
            Notes
          </label>
          <textarea id="buy-notes" className={textarea} rows={2} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
          {creating ? (
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink">
              <input type="checkbox" className="mt-1" checked={Boolean(draft.inviteNow)} onChange={(event) => set("inviteNow", event.target.checked)} />
              <span>
                Send the WhatsApp invite email now
                <span className="mt-0.5 block text-[12.5px] text-mid">Same START + email link as workflow 1b.</span>
              </span>
            </label>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" className={btnSecondary} onClick={() => onClose(false)}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={pending}>
            {creating ? (draft.inviteNow ? "Save and invite" : "Save buyer") : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

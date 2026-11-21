"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createSupplierAction, updateSupplierAction } from "@/app/admin/trade/actions";
import { btnPrimary, btnSecondary, field, label, textarea } from "@/components/admin/ui";
import type { TradeSupplier, TradeSupplierDraft } from "@/lib/trade/types";

const empty: TradeSupplierDraft = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  country: "",
  address: "",
  productsSupplied: "",
  origins: "",
  loadPorts: "",
  paymentTerms: "",
  notes: "",
  wechatOpenid: "",
  inviteNow: true,
};

function isExisting(supplier: TradeSupplier | null | "new"): supplier is TradeSupplier {
  return Boolean(supplier) && supplier !== "new";
}

function fromRow(row: TradeSupplier): TradeSupplierDraft {
  return {
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    phone: row.whatsappE164 ?? "",
    country: row.country,
    address: row.address,
    productsSupplied: row.productsSupplied,
    origins: row.origins.join(", "),
    loadPorts: row.loadPorts.join(", "),
    paymentTerms: row.paymentTerms,
    notes: row.notes,
    wechatOpenid: row.wechatOpenid ?? "",
    inviteNow: false,
  };
}

function Field({
  id,
  title,
  hint,
  children,
  className = "",
}: {
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {hint ? <p className="mt-0.5 text-[12px] leading-snug text-dim">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function SupplierSheet({
  supplier,
  onClose,
}: {
  supplier: TradeSupplier | null | "new";
  onClose: (saved: boolean) => void;
}) {
  const creating = supplier === "new";
  const existing = isExisting(supplier) ? supplier : null;
  const [draft, setDraft] = useState<TradeSupplierDraft>(() => (existing ? fromRow(existing) : empty));
  const [pending, start] = useTransition();
  const set = <K extends keyof TradeSupplierDraft>(key: K, value: TradeSupplierDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

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
        ? await createSupplierAction(draft)
        : existing
          ? await updateSupplierAction(existing.id, draft)
          : { ok: false as const, error: "Missing supplier." };
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (creating && "invited" in result && result.invited) toast.success("Supplier saved. WeChat invite is on its way.");
      else if (creating && "inviteError" in result && result.inviteError) toast.warning(`Supplier saved. Invite not sent: ${result.inviteError}`);
      else toast.success(creating ? "Supplier added. Invite them on WeChat when you are ready." : "Supplier updated.");
      onClose(true);
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose(false)}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-sheet-title"
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-[0_24px_80px_-24px_rgb(16_38_59/0.45)]"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">{creating ? "New supplier" : existing?.code ?? ""}</p>
              <h2 id="supplier-sheet-title" className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ink">
                {creating ? "Add supplier" : "Edit supplier"}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-mid">
                WeChat OpenID is filled after they scan their personal QR and follow the Official Account. You can paste it later if needed.
              </p>
            </div>
            <button type="button" aria-label="Close" onClick={() => onClose(false)} className="rounded-full p-2 text-dim hover:bg-s2 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">Company</h3>
            <Field id="sup-company" title="Company name">
              <input id="sup-company" required autoFocus value={draft.companyName} onChange={(event) => set("companyName", event.target.value)} className={`${field} h-10 w-full`} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="sup-country" title="Country">
                <input id="sup-country" value={draft.country} onChange={(event) => set("country", event.target.value)} className={`${field} h-10 w-full`} placeholder="China" />
              </Field>
              <Field id="sup-products" title="Products supplied">
                <input id="sup-products" value={draft.productsSupplied} onChange={(event) => set("productsSupplied", event.target.value)} className={`${field} h-10 w-full`} placeholder="Urea 46, DAP, AS" />
              </Field>
            </div>
            <Field id="sup-address" title="Address" hint="Office or plant, optional.">
              <textarea id="sup-address" value={draft.address} onChange={(event) => set("address", event.target.value)} className={textarea} rows={2} />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">Contact</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="sup-contact" title="Contact name">
                <input id="sup-contact" value={draft.contactName} onChange={(event) => set("contactName", event.target.value)} className={`${field} h-10 w-full`} />
              </Field>
              <Field id="sup-phone" title="WhatsApp / phone">
                <input id="sup-phone" value={draft.phone} onChange={(event) => set("phone", event.target.value)} className={`${field} h-10 w-full`} placeholder="+86 …" />
              </Field>
            </div>
            <Field id="sup-email" title="Email" hint="Used as the WeChat QR scene so we can link their OpenID after they follow.">
              <input id="sup-email" type="email" required value={draft.email} onChange={(event) => set("email", event.target.value)} className={`${field} h-10 w-full`} />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">Trading</h3>
            <Field id="sup-origins" title="Origins" hint="Comma separated.">
              <input id="sup-origins" value={draft.origins} onChange={(event) => set("origins", event.target.value)} className={`${field} h-10 w-full`} placeholder="China, Vietnam" />
            </Field>
            <Field id="sup-ports" title="Load ports" hint="Comma separated.">
              <input id="sup-ports" value={draft.loadPorts} onChange={(event) => set("loadPorts", event.target.value)} className={`${field} h-10 w-full`} placeholder="Qingdao, Lianyungang" />
            </Field>
            <Field id="sup-pay" title="Typical payment terms">
              <input id="sup-pay" value={draft.paymentTerms} onChange={(event) => set("paymentTerms", event.target.value)} className={`${field} h-10 w-full`} placeholder="30% prepayment, 70% CAD" />
            </Field>
            <Field id="sup-notes" title="Notes">
              <textarea id="sup-notes" value={draft.notes} onChange={(event) => set("notes", event.target.value)} className={textarea} rows={3} />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-s2/60 p-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-dim">WeChat</h3>
            <Field
              id="sup-openid"
              title="OpenID"
              hint={creating ? "Leave blank. Workflow 2 writes this when they follow. Paste only if you already have it." : "Blank until they follow. You can paste it here later without waiting for n8n."}
            >
              <input
                id="sup-openid"
                value={draft.wechatOpenid}
                onChange={(event) => set("wechatOpenid", event.target.value)}
                className={`${field} h-10 w-full font-mono text-[13px]`}
                placeholder="Not yet — after they follow"
                autoComplete="off"
              />
            </Field>
            {creating ? (
              <label className="flex items-start gap-2.5 text-[13.5px] text-ink">
                <input type="checkbox" className="mt-1" checked={Boolean(draft.inviteNow)} onChange={(event) => set("inviteNow", event.target.checked)} />
                <span>
                  Send the WeChat invite email now
                  <span className="mt-0.5 block text-[12.5px] text-mid">Personal QR, tied to this email. Status becomes Invite sent.</span>
                </span>
              </label>
            ) : null}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" className={btnSecondary} onClick={() => onClose(false)}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={pending}>
            {creating ? (draft.inviteNow ? "Save and invite" : "Save supplier") : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Link2, Printer, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteReport } from "@/app/hub/nitrogen-report/actions";
import { btnPrimary, btnSecondary } from "@/components/app/form";

export function ReportActions({ id, refNo, quoteHref = "/hub/order-desk" }: { id: string; refNo: string; quoteHref?: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied. Only you can open it while signed in.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Your browser blocked copying. Copy the address from the address bar instead.");
    }
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteReport(id);
      if (!result.ok) {
        toast.error(result.message);
        setConfirming(false);
        return;
      }
      toast.success(`${refNo} deleted.`);
      router.push("/hub/nitrogen-report");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={btnSecondary}>
        <Printer className="h-4 w-4" /> Print / save as PDF
      </button>
      <button type="button" onClick={copyLink} className={btnSecondary} aria-live="polite">
        {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Link2 className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
      </button>
      {confirming ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 p-1 pl-3 text-[14.5px] text-danger">
          Delete for good?
          <button type="button" onClick={remove} disabled={pending} className="h-9 rounded-full bg-danger px-3.5 font-semibold text-white disabled:opacity-60">
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-full px-3 font-semibold text-mid hover:text-ink">
            Keep
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${btnSecondary} hover:!border-red-200 hover:!text-danger`}>
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      )}
      <Link href={quoteHref} className={btnPrimary}>
        <ShoppingCart className="h-4 w-4" /> Ask the desk to quote this
      </Link>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { closeAllOpenDealsAction } from "@/app/admin/desk/actions";
import { btnDanger } from "@/components/admin/ui";

export function CloseAllDealsButton({ openCount }: { openCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (openCount <= 0) return null;

  return (
    <button
      type="button"
      disabled={pending}
      className={btnDanger}
      onClick={() => {
        if (!window.confirm(`Close all ${openCount} open desk request(s)? Trade ids are kept. WhatsApp can start a new RFQ.`)) return;
        start(async () => {
          const result = await closeAllOpenDealsAction();
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(`Closed ${result.closed} request(s). Start a new RFQ on WhatsApp.`);
          router.refresh();
        });
      }}
    >
      {pending ? "Closing…" : `Close all ${openCount} open requests`}
    </button>
  );
}

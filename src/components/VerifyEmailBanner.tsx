/**
 * Persistent, dismissible banner for authenticated users with an unverified
 * email. The gate is enforced at sensitive actions server-side; this banner
 * is the visible reminder with a Resend control.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/providers/trpc";

export function VerifyEmailBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = trpc.identity.verificationStatus.useQuery(undefined, { retry: false });
  const resend = trpc.identity.resendVerification.useMutation();
  const [resent, setResent] = useState(false);

  if (dismissed || !data || data.verified) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-[13px] text-amber-900" role="status">
      <span>
        Verify your email to unlock the trading desk. We sent a code to{" "}
        <span className="font-semibold">{data.email}</span>.
      </span>
      <button
        type="button"
        disabled={resend.isPending || resent}
        onClick={() => resend.mutate(undefined, { onSuccess: () => setResent(true) })}
        className="font-semibold underline underline-offset-2 hover:text-amber-700 disabled:no-underline disabled:opacity-60"
      >
        {resent ? "Code sent" : "Resend"}
      </button>
      <button
        type="button"
        aria-label="Dismiss verification reminder"
        onClick={() => setDismissed(true)}
        className="ml-1 rounded p-0.5 hover:bg-amber-200"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

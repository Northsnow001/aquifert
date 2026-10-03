"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { saveBriefEmail } from "@/app/hub/analytics/actions";

export function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`aq-nopress relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${checked ? "bg-blue" : "bg-[#d5dde6]"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

/** "Email me each issue", saved to the member's brief preferences. */
export function BriefEmailToggle({ initial, email }: { initial: boolean; email: string }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  const change = (next: boolean) => {
    setOn(next);
    start(async () => {
      const result = await saveBriefEmail(next);
      if (result.ok) toast.success(result.message ?? "Saved.");
      else {
        setOn(!next);
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex items-start gap-3">
      <span className="aq-chip aq-chip-blue flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
        <Mail className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-semibold text-ink">Email me each issue</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-mid">
          {on ? `We'll send each issue to ${email} once email delivery is switched on for your account.` : "Get every issue in your inbox as well as here."}
        </p>
      </div>
      <Switch checked={on} onChange={change} label="Email me each issue" disabled={pending} />
    </div>
  );
}

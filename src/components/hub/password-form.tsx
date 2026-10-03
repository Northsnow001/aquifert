"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Eye, EyeOff } from "lucide-react";
import { updatePassword, type PasswordState } from "@/app/(auth)/actions";
import { btnPrimary, btnSecondary, fieldClass, hintClass, labelClass, noticeError, noticeOk } from "@/components/app/form";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {} as PasswordState);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      {state.error ? (
        <p className={noticeError}>
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className={noticeOk}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.preview ? "Password accepted in this preview. It is not stored until sign-in is connected." : "Password updated."}
        </p>
      ) : null}
      <section className="aq-card p-5 md:p-6">
        <h2 className="text-[17px] font-semibold text-ink">Update password</h2>
        <p className="mt-0.5 text-[15px] text-mid">Choose a strong password to keep your account secure.</p>
        <div className="mt-5 flex flex-col gap-4">
          <label className="block">
            <span className={labelClass}>New password</span>
            <div className="relative">
              <input name="password" type={show ? "text" : "password"} required autoComplete="new-password" className={`${fieldClass} pr-11`} />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                className="aq-nopress absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-dim hover:bg-s3 hover:text-ink"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className={hintClass}>Use at least 8 characters. A short phrase is easier to remember.</span>
          </label>
          <label className="block">
            <span className={labelClass}>Confirm new password</span>
            <input name="confirm" type={show ? "text" : "password"} required autoComplete="new-password" className={fieldClass} />
          </label>
        </div>
      </section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/hub/account/profile" className={btnSecondary}>
          Cancel
        </Link>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

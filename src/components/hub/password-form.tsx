"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type PasswordState } from "@/app/(auth)/actions";

const inputClass =
  "block w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-dim focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20";

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {} as PasswordState);

  return (
    <div className="max-w-2xl rounded-xl border border-border bg-white shadow-sm">
      <div className="p-5 md:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-ink">Update Password</h2>
          <p className="mt-1 text-sm text-mid">Choose a strong password to keep your account secure.</p>
        </div>
        {state.error ? (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{state.error}</p>
        ) : null}
        {state.saved ? (
          <p className="mb-5 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-teal">
            {state.preview
              ? "Password accepted in this preview. It is not stored until sign-in is connected."
              : "Password updated."}
          </p>
        ) : null}
        <form action={action} className="space-y-5">
          <label className="block space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">New Password</span>
            <input name="password" type="password" required autoComplete="new-password" className={inputClass} />
          </label>
          <label className="block space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">Confirm New Password</span>
            <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
          </label>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-dim disabled:opacity-60"
            >
              {pending ? "Updating…" : "Update Password"}
            </button>
            <Link
              href="/hub/account/profile"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-colors hover:border-blue hover:text-blue"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

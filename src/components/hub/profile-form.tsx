"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/session-shared";

const COUNTRIES = [
  "Argentina",
  "Australia",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Egypt",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Ireland",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Netherlands",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Poland",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "Spain",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom (UK)",
  "United States",
];

const inputClass =
  "block w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-dim focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20";

function splitName(user: SessionUser) {
  if (user.firstName || user.lastName) {
    return { first: user.firstName ?? "", last: user.lastName ?? "" };
  }
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export function ProfileForm({ user, saved }: { user: SessionUser; saved: boolean }) {
  const [state, action, pending] = useActionState(updateProfile, {} as ProfileState);
  const name = splitName(user);

  return (
    <div className="max-w-6xl rounded-xl border border-border bg-white shadow-sm">
      <div className="p-5 md:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-ink">Profile Details</h2>
          <p className="mt-1 text-sm text-mid">Manage your contact details and billing profile.</p>
        </div>
        {saved ? (
          <p className="mb-5 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-teal">Profile saved.</p>
        ) : null}
        {state.error ? (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{state.error}</p>
        ) : null}
        <form action={action} className="space-y-6">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">First Name*</span>
              <input name="firstName" required defaultValue={name.first} className={inputClass} />
            </label>
            <label className="space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">Last Name*</span>
              <input name="lastName" required defaultValue={name.last} className={inputClass} />
            </label>
          </div>
          <label className="block space-y-3">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">Email*</span>
            <input name="email" type="email" required defaultValue={user.email} className={inputClass} />
          </label>

          <div className="pt-6">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-ink">Billing and Additional Details</h3>
              <p className="mt-1 text-sm text-mid">Keep your account information complete and up to date.</p>
            </div>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <label className="space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">Address line 1*</span>
                <input name="address1" required defaultValue={user.address1 ?? ""} className={inputClass} />
              </label>
              <label className="space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">Address line 2</span>
                <input name="address2" defaultValue={user.address2 ?? ""} className={inputClass} />
              </label>
              <label className="space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">City*</span>
                <input name="city" required defaultValue={user.city ?? ""} className={inputClass} />
              </label>
              <label className="space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-dim">Country*</span>
                <select name="country" required defaultValue={user.country ?? ""} className={inputClass}>
                  <option value="">Select a country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-dim disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

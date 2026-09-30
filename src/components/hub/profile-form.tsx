"use client";

import { useActionState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { updateProfile, type ProfileState } from "@/app/(auth)/actions";
import { btnPrimary, fieldClass, labelClass, noticeError, noticeOk } from "@/components/app/form";
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

function splitName(user: SessionUser) {
  if (user.firstName || user.lastName) {
    return { first: user.firstName ?? "", last: user.lastName ?? "" };
  }
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function ProfileForm({ user, saved }: { user: SessionUser; saved: boolean }) {
  const [state, action, pending] = useActionState(updateProfile, {} as ProfileState);
  const name = splitName(user);

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5">
      {saved ? (
        <p className={noticeOk}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Profile saved.
        </p>
      ) : null}
      {state.error ? (
        <p className={noticeError}>
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      ) : null}

      <section className="aq-card p-5 md:p-6">
        <h2 className="text-[16px] font-semibold text-ink">Profile details</h2>
        <p className="mt-0.5 text-[13.5px] text-mid">How the desk addresses you and where replies go.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="First name">
            <input name="firstName" required autoComplete="given-name" defaultValue={name.first} className={fieldClass} />
          </Field>
          <Field label="Last name">
            <input name="lastName" required autoComplete="family-name" defaultValue={name.last} className={fieldClass} />
          </Field>
          <Field label="Email" className="md:col-span-2">
            <input name="email" type="email" required autoComplete="email" defaultValue={user.email} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section className="aq-card p-5 md:p-6">
        <h2 className="text-[16px] font-semibold text-ink">Billing address</h2>
        <p className="mt-0.5 text-[13.5px] text-mid">Used on quotes and invoices.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Address line 1">
            <input name="address1" required autoComplete="address-line1" defaultValue={user.address1 ?? ""} className={fieldClass} />
          </Field>
          <Field label="Address line 2 (optional)">
            <input name="address2" autoComplete="address-line2" defaultValue={user.address2 ?? ""} className={fieldClass} />
          </Field>
          <Field label="City">
            <input name="city" required autoComplete="address-level2" defaultValue={user.city ?? ""} className={fieldClass} />
          </Field>
          <Field label="Country">
            <select name="country" required autoComplete="country-name" defaultValue={user.country ?? ""} className={fieldClass}>
              <option value="">Select a country</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-auto`}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

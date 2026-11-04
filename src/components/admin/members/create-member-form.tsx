"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteMemberAction } from "@/app/admin/members/actions";
import { btnPrimary, Card, CardHeader, input, label } from "@/components/admin/ui";
import { PLAN_LABEL } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

const empty = {
  email: "",
  name: "",
  company: "",
  country: "",
  phone: "",
  plan: "core" as Plan,
  admin: false,
};

export function CreateMemberForm() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      const result = await inviteMemberAction({
        email: form.email,
        name: form.name,
        company: form.company,
        country: form.country,
        phone: form.phone,
        plan: form.plan,
        admin: form.admin,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Invitation sent to ${result.email}. They set a password from the email, then sign in with it.`);
      setForm(empty);
      router.refresh();
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader title="Create account" meta="Saves the profile and emails a Supabase invitation. They set a password from that email, then sign in with it." />
      <form
        className="grid gap-4 px-5 py-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="sm:col-span-2">
          <label className={label} htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className={`${input} mt-1`}
            placeholder="name@company.com"
          />
        </div>
        <div>
          <label className={label} htmlFor="invite-name">
            Full name
          </label>
          <input
            id="invite-name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={`${input} mt-1`}
          />
        </div>
        <div>
          <label className={label} htmlFor="invite-company">
            Company
          </label>
          <input
            id="invite-company"
            required
            value={form.company}
            onChange={(event) => setForm({ ...form, company: event.target.value })}
            className={`${input} mt-1`}
          />
        </div>
        <div>
          <label className={label} htmlFor="invite-country">
            Country
          </label>
          <input
            id="invite-country"
            required
            value={form.country}
            onChange={(event) => setForm({ ...form, country: event.target.value })}
            className={`${input} mt-1`}
          />
        </div>
        <div>
          <label className={label} htmlFor="invite-phone">
            Phone
          </label>
          <input
            id="invite-phone"
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className={`${input} mt-1`}
          />
        </div>
        <div>
          <label className={label} htmlFor="invite-plan">
            Plan
          </label>
          <select
            id="invite-plan"
            value={form.plan}
            onChange={(event) => setForm({ ...form, plan: event.target.value as Plan })}
            className={`${input} mt-1`}
          >
            {(Object.keys(PLAN_LABEL) as Plan[]).map((plan) => (
              <option key={plan} value={plan}>
                {PLAN_LABEL[plan]}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className={label}>Access</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-[13.5px] text-ink">
              <input type="radio" name="invite-role" checked={!form.admin} onChange={() => setForm({ ...form, admin: false })} />
              Member
            </label>
            <label className="inline-flex items-center gap-2 text-[13.5px] text-ink">
              <input type="radio" name="invite-role" checked={form.admin} onChange={() => setForm({ ...form, admin: true })} />
              Admin
            </label>
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Sending invitation…" : "Save and send invitation"}
          </button>
        </div>
      </form>
    </Card>
  );
}

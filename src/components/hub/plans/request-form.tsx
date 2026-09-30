"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, CheckCircle2, CircleAlert, Send } from "lucide-react";
import { toast } from "sonner";
import { requestPlan } from "@/app/hub/membership/actions";
import { areaClass, btnPrimary, fieldClass, hintClass, labelClass, noticeError, noticeOk } from "@/components/app/form";
import type { Plan } from "@/lib/session-shared";

const MESSAGE_MAX = 1000;

export function RequestForm({
  plans,
  current,
  initial,
  email,
  source,
}: {
  plans: { plan: Plan; label: string; price: string }[];
  current: Plan;
  initial: Plan;
  email: string;
  source: string;
}) {
  const [selected, setSelected] = useState<Plan>(initial);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const same = selected === current;
  const label = plans.find((item) => item.plan === selected)?.label ?? "";

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <p className={noticeOk} role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Request sent for {label}. The desk will be in touch at <strong className="font-semibold">{sent}</strong>, usually the same working day.
          </span>
        </p>
        <p className="text-[13px] text-mid">
          Need it sooner?{" "}
          <Link href="/hub/contact?topic=Membership" className="font-semibold text-blue no-underline hover:underline">
            Message the desk
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await requestPlan({ requestedPlan: selected, company: String(data.get("company") ?? ""), message, source });
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          toast.success("Request sent to the desk.");
          setSent(result.email);
        });
      }}
    >
      <fieldset>
        <legend className={labelClass}>Plan you would like</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {plans.map((item) => {
            const active = selected === item.plan;
            return (
              <label
                key={item.plan}
                className={`relative cursor-pointer rounded-2xl border p-3.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue/40 ${
                  active ? "border-teal-500 bg-teal-50/70 shadow-[0_0_0_1px_var(--color-teal-500)]" : "border-border bg-white hover:border-blue/35"
                }`}
              >
                <input type="radio" name="plan" value={item.plan} checked={active} onChange={() => setSelected(item.plan)} className="sr-only" />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[14.5px] font-semibold text-ink">{item.label}</span>
                  {active ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-mid">{item.price}</span>
                {item.plan === current ? <span className="mt-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.08em] text-dim">Your plan</span> : null}
              </label>
            );
          })}
        </div>
        {same ? <p className={`${hintClass} text-[#9a5b00]`}>This is your current plan. Choose another one to send a request.</p> : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={labelClass}>Your email</span>
          <p className={`${fieldClass} flex items-center truncate bg-s2 text-mid`}>{email}</p>
          <p className={hintClass}>The desk replies here.</p>
        </div>
        <div>
          <label htmlFor="m-company" className={labelClass}>
            Company (optional)
          </label>
          <input id="m-company" name="company" autoComplete="organization" maxLength={120} placeholder="e.g. Fenland Growers Ltd" className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="m-message" className={labelClass}>
          Anything the desk should know (optional)
        </label>
        <textarea
          id="m-message"
          rows={4}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Team size, the products you follow, when you would like the change to start."
          aria-describedby="m-message-count"
          className={areaClass}
        />
        <p id="m-message-count" className={`${hintClass} text-right tabular-nums ${message.length > MESSAGE_MAX - 100 ? "font-semibold text-[#9a5b00]" : ""}`}>
          {message.length} / {MESSAGE_MAX}
        </p>
      </div>

      {error ? (
        <p role="alert" className={noticeError}>
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-dim">No payment is taken here. The desk confirms the change and invoices you.</p>
        <button type="submit" disabled={pending || same} className={btnPrimary}>
          <Send className="h-4 w-4" /> {pending ? "Sending…" : `Request ${label}`}
        </button>
      </div>
    </form>
  );
}

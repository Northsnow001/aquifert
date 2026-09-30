"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { CalendarPlus, CheckCircle2, Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { cancelCall, registerCall } from "@/app/hub/community-call/actions";
import { useNow } from "@/components/hub/aq1/call-time";
import { areaClass, btnPrimary, btnSecondary, fieldClass, hintClass, labelClass, noticeError } from "@/components/app/form";
import { callIcs, icsFileName } from "@/lib/aq-modules/ics";
import type { CommunityCall } from "@/lib/aq-modules/types";

const MAX_QUESTION = 1000;
const JOIN_OPENS = 15 * 60_000;
const readOnlyField = fieldClass.replace("bg-white", "bg-s2").replace("text-ink", "text-mid");

export type RegistrationDefaults = { company: string; country: string; reminders: boolean };

function downloadIcs(call: CommunityCall) {
  const text = callIcs(call, new Date().toISOString(), `${window.location.origin}/hub/community-call`);
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = icsFileName(call);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Calendar file downloaded. Open it to add the call to your calendar.");
}

function JoinButton({ call }: { call: CommunityCall }) {
  const now = useNow();
  const start = Date.parse(call.startsAt);
  const end = start + call.durationMinutes * 60_000;
  const open = Boolean(call.joinUrl) && now !== null && now >= start - JOIN_OPENS && now < end;
  const hint = !call.joinUrl
    ? "The desk adds the joining link before the call. It appears here, ready 15 minutes before the start."
    : open
      ? "The call room is open. Join with your browser or the meeting app."
      : "The joining link opens 15 minutes before the start.";
  return (
    <div>
      {open ? (
        <a href={call.joinUrl} target="_blank" rel="noreferrer noopener" className={btnPrimary}>
          <Video className="h-4 w-4" /> Join the call
        </a>
      ) : (
        <button type="button" disabled className={btnPrimary} aria-describedby={`join-hint-${call.id}`}>
          <Video className="h-4 w-4" /> Join the call
        </button>
      )}
      <p id={`join-hint-${call.id}`} className={hintClass}>
        {hint}
      </p>
    </div>
  );
}

/** Registration form for the next call, and the "you're registered" panel once it is saved. */
export function CallRegistration({
  call,
  registered,
  name,
  email,
  defaults,
}: {
  call: CommunityCall;
  registered: boolean;
  name: string;
  email: string;
  defaults: RegistrationDefaults;
}) {
  const [isRegistered, setRegistered] = useOptimistic(registered);
  const [pending, startTransition] = useTransition();
  const [company, setCompany] = useState(defaults.company);
  const [country, setCountry] = useState(defaults.country);
  const [question, setQuestion] = useState("");
  const [reminders, setReminders] = useState(defaults.reminders);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const register = () => {
    setError("");
    startTransition(async () => {
      setRegistered(true);
      const result = await registerCall({ callId: call.id, company, country, question, reminders });
      if (result.ok) {
        setQuestion("");
        toast.success(result.already ? "You were already registered. Your details are updated." : "You're registered. Add the call to your calendar below.");
      } else setError(result.message);
    });
  };

  const cancel = () => {
    startTransition(async () => {
      setRegistered(false);
      const result = await cancelCall(call.id);
      setConfirming(false);
      if (result.ok) toast.success("Registration cancelled. You can register again any time before the call.");
      else toast.error(result.message);
    });
  };

  if (isRegistered) {
    return (
      <div className="rounded-2xl border border-[#cdebd8] bg-[#f1faf4] p-5" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1f7a45]" aria-hidden />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">You&apos;re registered for this call</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-mid">
              Your place is saved under {email}. Add the call to your calendar so the time and link are to hand.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <JoinButton call={call} />
          <button type="button" onClick={() => downloadIcs(call)} className={btnSecondary}>
            <CalendarPlus className="h-4 w-4" /> Add to calendar (.ics)
          </button>
        </div>
        <div className="mt-4 border-t border-[#cdebd8] pt-3">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-mid">Cancel your place on this call?</span>
              <button type="button" onClick={cancel} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-danger px-3.5 py-1.5 font-semibold text-white disabled:opacity-60">
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Yes, cancel
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-3 py-1.5 font-semibold text-mid hover:text-ink">
                Keep my place
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-mid hover:text-danger">
              <X className="h-3.5 w-3.5" /> Cancel registration
            </button>
          )}
        </div>
      </div>
    );
  }

  const nearLimit = question.length > MAX_QUESTION - 100;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        register();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cc-name" className={labelClass}>
            Name
          </label>
          <input id="cc-name" value={name} readOnly className={readOnlyField} aria-describedby="cc-account-hint" />
        </div>
        <div>
          <label htmlFor="cc-email" className={labelClass}>
            Email
          </label>
          <input id="cc-email" type="email" value={email} readOnly className={readOnlyField} aria-describedby="cc-account-hint" />
        </div>
        <p id="cc-account-hint" className={`${hintClass} -mt-2 sm:col-span-2`}>
          From your account. To change them, update your{" "}
          <Link href="/hub/account/profile" className="font-semibold text-blue no-underline hover:underline">
            profile
          </Link>
          .
        </p>
        <div>
          <label htmlFor="cc-company" className={labelClass}>
            Company
          </label>
          <input id="cc-company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={120} autoComplete="organization" className={fieldClass} aria-describedby="cc-company-hint" />
          <p id="cc-company-hint" className={hintClass}>
            Helps the desk pitch examples at your part of the market.
          </p>
        </div>
        <div>
          <label htmlFor="cc-country" className={labelClass}>
            Country
          </label>
          <input id="cc-country" value={country} onChange={(event) => setCountry(event.target.value)} maxLength={80} autoComplete="country-name" className={fieldClass} aria-describedby="cc-country-hint" />
          <p id="cc-country-hint" className={hintClass}>
            The desk uses it to pick the freight lanes and origins that matter to you.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="cc-question" className={labelClass}>
          What would you like covered? <span className="font-normal text-dim">(optional)</span>
        </label>
        <textarea
          id="cc-question"
          rows={4}
          value={question}
          onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION))}
          maxLength={MAX_QUESTION}
          placeholder="e.g. Where do you see Supramax rates from the Arab Gulf into India in November?"
          className={areaClass}
          aria-describedby="cc-question-hint cc-question-count"
        />
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p id="cc-question-hint" className="text-[12px] leading-relaxed text-dim">
            The desk groups questions by theme and answers the most requested ones live.
          </p>
          <p id="cc-question-count" className={`shrink-0 text-[12px] tabular-nums ${nearLimit ? "font-semibold text-[#9a5b00]" : "text-dim"}`} aria-live={nearLimit ? "polite" : "off"}>
            {question.length} / {MAX_QUESTION}
          </p>
        </div>
      </div>

      <label htmlFor="cc-reminders" className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-s2/50 px-3.5 py-3">
        <input id="cc-reminders" type="checkbox" checked={reminders} onChange={(event) => setReminders(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600" />
        <span>
          <span className="block text-[13.5px] font-medium text-ink">Send me reminders</span>
          <span className="block text-[12px] leading-relaxed text-dim">The desk reminds you by email before the call starts.</span>
        </span>
      </label>

      {error ? (
        <p className={noticeError} role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "Registering" : "Register for the call"}
        </button>
        <p className="text-[12px] text-dim">Free for every member. Only the Aquifert desk sees your details.</p>
      </div>
    </form>
  );
}

/** One-click register or cancel for calls further out, using the details from the member's last registration. */
export function QuickRegister({ callId, registered, defaults }: { callId: string; registered: boolean; defaults: RegistrationDefaults }) {
  const [isRegistered, setRegistered] = useOptimistic(registered);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      setRegistered(!isRegistered);
      const result = isRegistered ? await cancelCall(callId) : await registerCall({ callId, company: defaults.company, country: defaults.country, question: "", reminders: defaults.reminders });
      if (result.ok) toast.success(isRegistered ? "Registration cancelled." : "You're registered for this call.");
      else toast.error(result.message);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isRegistered}
      title={isRegistered ? "Select to cancel your place" : undefined}
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors disabled:opacity-60 ${
        isRegistered ? "border-[#cdebd8] bg-[#f1faf4] text-[#1f7a45] hover:border-red-200 hover:bg-red-50 hover:text-danger" : "border-border bg-white text-ink hover:border-blue/35 hover:text-blue"
      }`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isRegistered ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {isRegistered ? "Registered" : "Register"}
    </button>
  );
}

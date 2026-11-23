"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/hub/onboarding-actions";
import type { OnboardingQuestion } from "@/lib/onboarding/questions";

const PLAN_NAME = { growth: "AQ Analytics", enterprise: "AQ Zero" } as const;

export function OnboardingOverlay({ plan, questions }: { plan: "growth" | "enterprise"; questions: OnboardingQuestion[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const question = questions[step];
  const picked = answers[question.id] ?? [];
  const last = step === questions.length - 1;
  const ready = !question.required || picked.length > 0;

  const toggle = (option: string) => {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      const has = selected.some((item) => item.toLowerCase() === option.toLowerCase());
      const next = question.kind === "single" ? (has ? [] : [option]) : has ? selected.filter((item) => item.toLowerCase() !== option.toLowerCase()) : [...selected, option];
      return { ...current, [question.id]: next };
    });
  };

  const submit = async () => {
    setPending(true);
    setError("");
    const result = await completeOnboarding(answers);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0C1C2E]/75 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white text-ink shadow-[0_30px_80px_-24px_rgb(0_0_0/0.55)]"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.preventDefault();
        }}
      >
        <div className="bg-[#0C1C2E] px-6 py-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300">{PLAN_NAME[plan]}</p>
          <h2 id="onboarding-title" className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">
            Set up your dashboard
          </h2>
          <p className="mt-1 text-[13.5px] text-white/70">
            Question {step + 1} of {questions.length}. These answers choose the Telex, AQ View and briefing you see.
          </p>
          <div className="mt-4 flex gap-1.5" aria-hidden>
            {questions.map((item, index) => (
              <span key={item.id} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-teal-300" : "bg-white/20"}`} />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <p className="text-[18px] font-semibold leading-snug">{question.prompt}</p>
            {question.help ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-mid">{question.help}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => {
              const on = picked.some((item) => item.toLowerCase() === option.toLowerCase());
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(option)}
                  className={`rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition ${
                    on ? "border-[#0C1C2E] bg-[#0C1C2E] text-white" : "border-border bg-white text-ink hover:border-[#0C1C2E]/40"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {error ? <p className="text-[13.5px] font-medium text-danger">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep((current) => Math.max(0, current - 1));
            }}
            disabled={step === 0 || pending}
            className="text-[13.5px] font-semibold text-mid disabled:opacity-40"
          >
            Back
          </button>
          {last ? (
            <button
              type="button"
              disabled={!ready || pending}
              onClick={submit}
              className="inline-flex h-10 items-center rounded-full bg-[#0C1C2E] px-5 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Opening your dashboard…" : "Open my dashboard"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                setError("");
                setStep((current) => current + 1);
              }}
              className="inline-flex h-10 items-center rounded-full bg-[#0C1C2E] px-5 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search } from "lucide-react";
import { completeOnboarding } from "@/app/hub/onboarding-actions";
import type { OnboardingQuestion } from "@/lib/onboarding/questions";

const PLAN_NAME = { growth: "AQ Analytics", enterprise: "AQ Zero" } as const;

const STEP_LABEL: Record<string, string> = {
  products: "Products",
  regions: "Regions",
  role: "Role",
  countries: "Countries",
  tags: "Tags",
  categories: "Categories",
};

function stepLabel(question: OnboardingQuestion, index: number) {
  return STEP_LABEL[question.id] ?? `Question ${index + 1}`;
}

export function OnboardingOverlay({ plan, questions, embedded = false }: { plan: "growth" | "enterprise"; questions: OnboardingQuestion[]; embedded?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const question = questions[step];
  const picked = answers[question.id] ?? [];
  const last = step === questions.length - 1;
  const ready = !question.required || picked.length > 0;
  const many = question.options.length > 8;
  const single = question.kind === "single";

  useEffect(() => {
    if (embedded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [embedded]);

  useEffect(() => {
    setQuery("");
  }, [step]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return question.options;
    return question.options.filter((option) => option.toLowerCase().includes(needle));
  }, [query, question.options]);

  const toggle = (option: string) => {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      const has = selected.some((item) => item.toLowerCase() === option.toLowerCase());
      const next = single ? (has ? [] : [option]) : has ? selected.filter((item) => item.toLowerCase() !== option.toLowerCase()) : [...selected, option];
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

  const card = (
      <div
        role="dialog"
        aria-modal={embedded ? undefined : true}
        aria-labelledby="onboarding-title"
        className={`relative flex w-full max-w-4xl flex-col overflow-hidden bg-white text-ink ${
          embedded
            ? "max-h-[min(820px,calc(100dvh-12rem))] rounded-[22px] border border-border shadow-[0_18px_40px_-24px_rgb(11_30_45/0.35)]"
            : "max-h-[min(860px,100dvh)] rounded-t-[22px] shadow-[0_30px_80px_-24px_rgb(11_30_45/0.55)] sm:max-h-[min(820px,calc(100dvh-3rem))] sm:rounded-[22px]"
        }`}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.preventDefault();
        }}
      >
        <header className="border-b border-border px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal-700">{PLAN_NAME[plan]}</p>
              <h2 id="onboarding-title" className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">
                Set up your dashboard
              </h2>
            </div>
            <p className="shrink-0 rounded-full bg-s2 px-3 py-1 text-[13px] font-semibold text-mid">
              {step + 1} / {questions.length}
            </p>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-s2" aria-hidden>
            <div className="h-full rounded-full bg-teal-500 transition-[width] duration-300" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <ol className="hidden gap-1 overflow-y-auto border-r border-border bg-[#f7f9fb] p-4 md:flex md:flex-col">
            {questions.map((item, index) => {
              const done = index < step && (answers[item.id]?.length ?? 0) > 0;
              const current = index === step;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={index > step}
                    onClick={() => {
                      if (index < step) {
                        setError("");
                        setStep(index);
                      }
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold disabled:cursor-default ${
                      current ? "bg-white text-ink shadow-[0_1px_2px_rgb(16_38_59/0.06)] ring-1 ring-border" : done ? "text-teal-800 hover:bg-white" : "text-dim"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] ${
                        current ? "bg-navy-700 text-white" : done ? "bg-teal-100 text-teal-800" : "bg-white text-dim ring-1 ring-border"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                    </span>
                    {stepLabel(item, index)}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-7">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-teal-700">{single ? "Choose one" : "Select all that apply"}</p>
                <p className="mt-1.5 text-[20px] font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[22px]">{question.prompt}</p>
                {question.help ? <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mid">{question.help}</p> : null}
              </div>

              {many ? (
                <label className="relative block">
                  <span className="sr-only">Search options</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    className="h-11 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-[15px] text-ink outline-none placeholder:text-dim focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20"
                  />
                </label>
              ) : null}

              {visible.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visible.map((option) => {
                    const on = picked.some((item) => item.toLowerCase() === option.toLowerCase());
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(option)}
                        className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[15px] font-medium transition ${
                          on ? "border-teal-500 bg-teal-50 text-ink shadow-[0_0_0_1px_var(--color-teal-500)]" : "border-border bg-white text-ink hover:border-navy-300"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            on ? "border-teal-600 bg-teal-600 text-white" : "border-[#c5d0da] bg-white"
                          }`}
                          aria-hidden
                        >
                          {on ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0 leading-snug">{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-s2 px-4 py-6 text-center text-[14.5px] text-mid">No matches for “{query.trim()}”.</p>
              )}
              {error ? <p className="text-[14px] font-medium text-danger">{error}</p> : null}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-4 sm:px-7">
              <p className="text-[13.5px] text-mid">{picked.length ? `${picked.length} selected` : question.required ? "Choose at least one" : "Optional"}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep((current) => Math.max(0, current - 1));
                  }}
                  disabled={step === 0 || pending}
                  className="inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold text-mid hover:bg-s2 disabled:opacity-40"
                >
                  Back
                </button>
                {last ? (
                  <button
                    type="button"
                    disabled={!ready || pending}
                    onClick={submit}
                    className="inline-flex h-11 items-center rounded-full bg-navy-700 px-5 text-[15px] font-semibold text-white hover:bg-navy-600 disabled:opacity-40"
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
                    className="inline-flex h-11 items-center rounded-full bg-navy-700 px-5 text-[15px] font-semibold text-white hover:bg-navy-600 disabled:opacity-40"
                  >
                    Continue
                  </button>
                )}
              </div>
            </footer>
          </div>
        </div>
      </div>
  );

  if (embedded) return <div className="mx-auto w-full max-w-4xl">{card}</div>;

  return (
    <div className="aq-app fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-[#0b1e2d]/55 backdrop-blur-[2px]" />
      {card}
    </div>
  );
}

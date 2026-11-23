"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { saveOnboardingQuestionsAction } from "@/app/admin/onboarding/actions";
import { btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { INTEREST_KINDS, type OnboardingQuestion, type QuestionKind } from "@/lib/onboarding/questions";

const KIND_LABEL: Record<QuestionKind, string> = {
  single: "One choice",
  multi: "Several choices",
  countries: "Countries",
  tags: "Telex tags",
  categories: "Categories",
};

export function OnboardingEditor({ initial }: { initial: OnboardingQuestion[] }) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<OnboardingQuestion>) => {
    setQuestions((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const move = (index: number, direction: -1 | 1) => {
    setQuestions((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  };

  const save = () => {
    setError("");
    startTransition(async () => {
      const result = await saveOnboardingQuestionsAction(questions);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {questions.map((question, index) => {
        const interest = INTEREST_KINDS.includes(question.kind);
        return (
          <section key={question.id} className="aq-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-dim">
                {index + 1}. {KIND_LABEL[question.kind]}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded-full p-1.5 text-mid hover:bg-s2" aria-label="Move up" onClick={() => move(index, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-full p-1.5 text-mid hover:bg-s2" aria-label="Move down" onClick={() => move(index, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {interest ? null : (
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-danger hover:bg-red-50"
                    aria-label="Remove question"
                    onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <label className={`${label} mt-3`}>
              Question
              <input className={`${input} mt-1`} value={question.prompt} onChange={(event) => update(index, { prompt: event.target.value })} />
            </label>
            <label className={`${label} mt-3`}>
              Help line
              <textarea className={`${textarea} mt-1`} rows={2} value={question.help} onChange={(event) => update(index, { help: event.target.value })} />
            </label>
            {interest ? (
              <p className="mt-3 text-[13px] text-mid">
                Options come from the live list: countries, the tags on published Telex flashes, and the news categories. They are not typed in here.
              </p>
            ) : (
              <label className={`${label} mt-3`}>
                Choices, one per line
                <textarea
                  className={`${textarea} mt-1`}
                  rows={4}
                  value={question.options.join("\n")}
                  onChange={(event) => update(index, { options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })}
                />
              </label>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-[13.5px]">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={question.required} onChange={(event) => update(index, { required: event.target.checked })} />
                Required
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={question.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} />
                Shown
              </label>
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnSecondary}
          onClick={() =>
            setQuestions((current) => [
              ...current,
              { id: `q-${Date.now().toString(36)}`, prompt: "New question", help: "", kind: "multi", required: true, enabled: true, options: ["Option one"] },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add a question
        </button>
        <button type="button" className={btnPrimary} disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save questions"}
        </button>
        {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

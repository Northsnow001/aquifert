import "server-only";

import { readDocument, writeDocument } from "@/lib/data/documents";
import { parseQuestions, type OnboardingQuestion } from "@/lib/onboarding/questions";

export async function getOnboardingQuestions(): Promise<OnboardingQuestion[]> {
  const raw = await readDocument("onboarding").catch(() => null);
  return parseQuestions(raw);
}

export async function saveOnboardingQuestions(questions: OnboardingQuestion[]) {
  const next = parseQuestions({ questions });
  await writeDocument("onboarding", { questions: next });
  return next;
}

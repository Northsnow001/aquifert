import "server-only";

import { getHubContent } from "@/lib/hub-content";
import { publishedAnalysis, getAqModules } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import {
  answerTerms,
  interestCatalog,
  interestsFrom,
  resolveQuestions,
  type InterestPick,
  type OnboardingQuestion,
} from "@/lib/onboarding/questions";

export async function catalogFromDesk() {
  const [content, modules] = await Promise.all([getHubContent(), getAqModules()]);
  const telex = publishedTelex(content.telex, "all");
  const notes = publishedAnalysis(modules);
  return interestCatalog({
    tags: telex.flatMap((item) => item.tags),
    categories: notes.flatMap((note) => note.products),
  });
}

export function checkedAnswers(
  questions: OnboardingQuestion[],
  catalog: { countries: string[]; tags: string[]; categories: string[] },
  raw: Record<string, string[]>,
): { ok: true; answers: Record<string, string[]>; interests: InterestPick; terms: string[] } | { ok: false; message: string } {
  const live = resolveQuestions(questions, catalog);
  if (!live.length) return { ok: false, message: "There are no onboarding questions yet." };
  const answers: Record<string, string[]> = {};
  for (const question of live) {
    const allowed = new Set(question.options.map((item) => item.toLowerCase()));
    const picked = [...new Set((raw[question.id] ?? []).map((item) => item.trim()).filter((item) => allowed.has(item.toLowerCase())))];
    const canonical = question.options.filter((item) => picked.some((value) => value.toLowerCase() === item.toLowerCase()));
    if (question.required && !canonical.length) return { ok: false, message: `Answer “${question.prompt}” before the dashboard opens.` };
    answers[question.id] = canonical;
  }
  return { ok: true, answers, interests: interestsFrom(live, answers), terms: answerTerms(live, answers) };
}

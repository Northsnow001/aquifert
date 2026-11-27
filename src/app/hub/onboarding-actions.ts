"use server";

import { revalidatePath } from "next/cache";
import { getPrefs, savePrefs } from "@/lib/aq-modules/members";
import { personaFromRole } from "@/lib/onboarding/questions";
import { getOnboardingQuestions } from "@/lib/onboarding/store";
import { catalogFromDesk, checkedAnswers } from "@/lib/onboarding/validate";
import { getSession } from "@/lib/session";

export async function completeOnboarding(answers: Record<string, string[]>) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Sign in to finish setup." };
  const prefs = await getPrefs(user);
  const subscribed = user.plan === "growth" || user.plan === "enterprise" ? user.plan : null;
  if (!subscribed) return { ok: false as const, message: "Subscribe before answering." };
  const questions = await getOnboardingQuestions();
  const catalog = await catalogFromDesk();
  const checked = checkedAnswers(questions, catalog, answers);
  if (!checked.ok) return checked;
  const role = checked.answers.role?.[0];
  const persona = personaFromRole(role);
  await savePrefs(user, {
    onboardingDone: true,
    onboardingAnswers: checked.answers,
    interests: checked.interests,
    ...(persona ? { persona } : {}),
  });
  revalidatePath("/hub/dashboard");
  revalidatePath("/hub");
  revalidatePath("/hub/telex");
  revalidatePath("/hub/tools/analytics");
  revalidatePath("/hub/zero");
  return { ok: true as const };
}

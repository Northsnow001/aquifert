"use server";

import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin-access";
import { parseQuestions, type OnboardingQuestion } from "@/lib/onboarding/questions";
import { saveOnboardingQuestions } from "@/lib/onboarding/store";
import { getSession } from "@/lib/session";

export async function saveOnboardingQuestionsAction(questions: OnboardingQuestion[]) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return { ok: false as const, message: "Admin only." };
  const next = parseQuestions({ questions });
  if (!next.some((item) => item.enabled && item.prompt)) return { ok: false as const, message: "Keep at least one question." };
  await saveOnboardingQuestions(next);
  revalidatePath("/admin/onboarding");
  revalidatePath("/hub/dashboard");
  return { ok: true as const };
}

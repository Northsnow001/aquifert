"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getPrefs, savePrefs } from "@/lib/aq-modules/members";
import { personaFromRole } from "@/lib/onboarding/questions";
import { getOnboardingQuestions } from "@/lib/onboarding/store";
import { catalogFromDesk, checkedAnswers } from "@/lib/onboarding/validate";
import { getSession } from "@/lib/session";

/** Opens AQ Analytics on this admin account only. Members stay on the information page until Stripe is live. */
export async function startMockSubscription(form: FormData) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) throw new Error("The demo subscription is for admin accounts.");
  if (String(form.get("plan") ?? "") !== "growth") throw new Error("Choose AQ Analytics.");
  const paid = user.plan === "growth" || user.plan === "enterprise";
  if (!paid) {
    const prefs = await getPrefs(user);
    if (!(prefs.mockPlan === "growth" && prefs.onboardingDone)) {
      await savePrefs(user, {
        mockPlan: "growth",
        mockSubscribedAt: new Date().toISOString(),
        onboardingDone: false,
        onboardingAnswers: {},
        interests: { countries: [], tags: [], categories: [] },
      });
    }
  }
  revalidatePath("/hub");
  revalidatePath("/hub/tools/analytics");
  redirect("/hub/tools/analytics");
}

export async function completeOnboarding(answers: Record<string, string[]>) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Sign in to finish setup." };
  const prefs = await getPrefs(user);
  const demo = isAdminUser(user) && prefs.mockPlan === "growth" ? "growth" : null;
  const subscribed = user.plan === "growth" || user.plan === "enterprise" ? user.plan : demo;
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

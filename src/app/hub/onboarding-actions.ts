"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getPrefs, savePrefs } from "@/lib/aq-modules/members";
import { personaFromRole } from "@/lib/onboarding/questions";
import { getOnboardingQuestions } from "@/lib/onboarding/store";
import { catalogFromDesk, checkedAnswers } from "@/lib/onboarding/validate";
import { getSession } from "@/lib/session";

async function adminUser() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return null;
  return user;
}

/** Mock checkout. Stripe will replace this. Admins only. */
export async function startMockSubscription(form: FormData) {
  const user = await adminUser();
  if (!user) throw new Error("Mock subscription is for admin accounts.");
  const raw = String(form.get("plan") ?? "");
  const plan = raw === "growth" || raw === "enterprise" ? raw : null;
  if (!plan) throw new Error("Choose AQ Analytics or AQ Zero.");
  const prefs = await getPrefs(user);
  const same = prefs.mockPlan === plan && prefs.onboardingDone;
  if (!same) {
    await savePrefs(user, {
      mockPlan: plan,
      mockSubscribedAt: new Date().toISOString(),
      onboardingDone: false,
      onboardingAnswers: {},
      interests: { countries: [], tags: [], categories: [] },
    });
  }
  revalidatePath("/hub/dashboard");
  redirect(plan === "enterprise" ? "/hub/zero" : "/hub/tools/analytics/home");
}

export async function completeOnboarding(answers: Record<string, string[]>) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Sign in to finish setup." };
  const prefs = await getPrefs(user);
  const subscribed = prefs.mockPlan || (user.plan === "growth" || user.plan === "enterprise" ? user.plan : null);
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
  revalidatePath("/hub/tools/analytics/home");
  revalidatePath("/hub/zero");
  return { ok: true as const };
}

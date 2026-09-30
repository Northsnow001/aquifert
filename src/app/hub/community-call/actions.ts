"use server";

import { revalidatePath } from "next/cache";
import { cancelRegistration, registerForCall } from "@/lib/aq-modules/members";
import { getAqModules, upcomingCalls } from "@/lib/aq-modules/store";
import { getSession } from "@/lib/session";

type Result = { ok: true; already?: boolean } | { ok: false; message: string };

export type CallRegistrationInput = { callId: string; company: string; country: string; question: string; reminders: boolean };

const failed = (error: unknown): Result => ({
  ok: false,
  message: error instanceof Error && /table is missing/.test(error.message) ? "Registrations need the latest database update. Ask the desk to run it." : "Could not save your registration. Try again in a moment.",
});

async function openCall(callId: string) {
  const { next, later } = upcomingCalls(await getAqModules());
  return [next, ...later].find((call) => call?.id === callId) ?? null;
}

function refresh() {
  revalidatePath("/hub/community-call");
  revalidatePath("/admin", "layout");
}

export async function registerCall(input: CallRegistrationInput): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  const question = String(input.question ?? "").trim();
  if (question.length > 1000) return { ok: false, message: "Keep your question under 1,000 characters." };
  try {
    const call = await openCall(String(input.callId ?? ""));
    if (!call) return { ok: false, message: "That call has finished or is no longer scheduled. Refresh the page to see the next one." };
    const { already } = await registerForCall(user, {
      callId: call.id,
      name: user.name,
      company: String(input.company ?? "").trim().slice(0, 120),
      country: String(input.country ?? "").trim().slice(0, 80),
      question,
      reminders: Boolean(input.reminders),
    });
    refresh();
    return { ok: true, already };
  } catch (error) {
    return failed(error);
  }
}

export async function cancelCall(callId: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  try {
    const call = await openCall(String(callId ?? ""));
    if (!call) return { ok: false, message: "That call has already finished, so there is nothing to cancel." };
    const cancelled = await cancelRegistration(user, call.id);
    refresh();
    return cancelled ? { ok: true } : { ok: false, message: "You are not registered for this call." };
  } catch (error) {
    return failed(error);
  }
}

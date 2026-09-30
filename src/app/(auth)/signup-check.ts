"use server";

import { checkSignupEmail } from "@/lib/desk-settings/email-rules";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { isBannedEmail } from "@/lib/member-access";

/** Applies the admin's sign-up rules. The reason stays on the server so a ban is never revealed. */
export async function checkSignupAddress(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const verdict = checkSignupEmail(String(email ?? "").slice(0, 320), getDeskSettings().members, isBannedEmail);
  return verdict.ok ? { ok: true } : { ok: false, message: verdict.message };
}

"use server";

import { checkSignupEmail, signupCheck, type SignupCheck } from "@/lib/desk-settings/email-rules";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { isBannedEmail } from "@/lib/member-access";

/** Applies the admin's sign-up rules. The reason stays on the server so a ban is never revealed. */
export async function checkSignupAddress(email: string): Promise<SignupCheck> {
  const address = String(email ?? "").slice(0, 320);
  const [settings, banned] = await Promise.all([getDeskSettings(), isBannedEmail(address)]);
  return signupCheck(checkSignupEmail(address, settings.members, () => banned));
}

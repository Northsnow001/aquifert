import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSignupAddress } from "@/app/(auth)/signup-check";
import { existingAccountKind, phoneToE164 } from "@/marketing/lib/auth-signup";
import { friendlyAuthError } from "@/marketing/lib/auth-errors";
import { createAdminClient } from "@/lib/supabase/admin";

export type SignupCodeInput = {
  email: string;
  phone: string;
  name: string;
  company: string;
  country: string;
};

const TAKEN = "This email or phone number already has an account. Sign in, or open the invitation email to set your password.";

/**
 * Creates one account when needed, stores the phone number, and emails the only verification code.
 * The phone is contact information. Sign-in stays on the email address.
 */
export async function sendSignupCodes(input: SignupCodeInput): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = input.email.trim().toLowerCase();
  const phone = phoneToE164(input.phone);
  const name = input.name.trim();
  const company = input.company.trim();
  const country = input.country.trim();
  if (!phone) return { ok: false, message: "Enter the phone number with its country code, for example +44…" };

  const allowed = await checkSignupAddress(email);
  if (!allowed.ok) return { ok: false, message: allowed.message };

  const db = createAdminClient();
  if (!db) {
    return { ok: false, message: "Sign-up cannot send the email yet. The server is missing SUPABASE_SERVICE_ROLE_KEY." };
  }

  const metadata = { name, company, country, phone, full_name: name };
  const ready = await accountForCodes(db, { email, phone, metadata });
  if (!ready.ok) return ready;

  const emailSend = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: false, data: metadata } });
  if (!emailSend.error) return { ok: true };
  return {
    ok: false,
    message: `The email could not be sent. ${friendlyAuthError(emailSend.error.message, "signup")}`,
  };
}

async function accountForCodes(
  db: SupabaseClient,
  input: { email: string; phone: string; metadata: Record<string, string> },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const created = await db.auth.admin.createUser({
    email: input.email,
    phone: input.phone,
    email_confirm: false,
    phone_confirm: true,
    user_metadata: input.metadata,
  });
  if (!created.error) return { ok: true };

  const kind = existingAccountKind(created.error.message);
  if (kind !== "email") {
    return { ok: false, message: kind ? TAKEN : friendlyAuthError(created.error.message, "signup") };
  }

  const link = await db.auth.admin.generateLink({ type: "magiclink", email: input.email });
  const user = link.data?.user;
  if (link.error || !user) return { ok: false, message: TAKEN };
  const owned = phoneToE164(user.phone ?? "");
  if (owned && owned !== input.phone) return { ok: false, message: TAKEN };
  const updated = await db.auth.admin.updateUserById(user.id, {
    ...(owned ? {} : { phone: input.phone }),
    phone_confirm: true,
    user_metadata: { ...(user.user_metadata ?? {}), ...input.metadata },
  });
  if (updated.error) return { ok: false, message: friendlyAuthError(updated.error.message, "signup") };
  return { ok: true };
}

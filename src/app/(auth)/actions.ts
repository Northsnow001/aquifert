"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE } from "@/lib/session";
import type { SessionUser } from "@/lib/session-shared";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ProfileState = { error?: string };
export type PasswordState = { error?: string; saved?: boolean; preview?: boolean };

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const firstName = field(formData, "firstName");
  const lastName = field(formData, "lastName");
  const email = field(formData, "email");
  const address1 = field(formData, "address1");
  const address2 = field(formData, "address2");
  const city = field(formData, "city");
  const country = field(formData, "country");

  if (!firstName || !lastName || !email || !address1 || !city || !country) {
    return { error: "First name, last name, email, address line 1, city, and country are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const name = `${firstName} ${lastName}`.trim();
  const profile = { firstName, lastName, address1, address2, city, country };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.auth.getUser();
    if (data.user) {
      const { error: metaError } = await supabase!.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          address_line_1: address1,
          address_line_2: address2,
          city,
          country,
        },
      });
      if (metaError) return { error: metaError.message };
      if (email !== data.user.email) {
        const { error: emailError } = await supabase!.auth.updateUser({ email });
        if (emailError) return { error: emailError.message };
      }
      await supabase!.from("profiles").update({ full_name: name }).eq("id", data.user.id);
    }
    redirect("/hub/account/profile?saved=1");
  }

  const jar = await cookies();
  const raw = jar.get(DEMO_COOKIE)?.value;
  if (raw) {
    const current = JSON.parse(raw) as SessionUser;
    jar.set(
      DEMO_COOKIE,
      JSON.stringify({ ...current, ...profile, name, email }),
      { httpOnly: true, sameSite: "lax", path: "/" },
    );
  }
  redirect("/hub/account/profile?saved=1");
}

export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = field(formData, "password");
  const confirm = field(formData, "confirm");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.auth.getUser();
    if (!data.user) return { error: "Sign in again before changing your password." };
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { saved: true };
  }

  return { saved: true, preview: true };
}

export async function saveEnquiry(table: "contact_messages" | "order_enquiries", payload: Record<string, string>) {
  if (!isSupabaseConfigured()) return { saved: "local" as const };
  const supabase = await createClient();
  const { error } = await supabase!.from(table).insert(payload);
  if (error) return { saved: "error" as const, message: error.message };
  return { saved: "remote" as const };
}

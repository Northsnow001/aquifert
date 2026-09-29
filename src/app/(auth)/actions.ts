"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE } from "@/lib/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.auth.getUser();
    if (data.user) {
      await supabase!.from("profiles").update({ full_name: name }).eq("id", data.user.id);
    }
    redirect("/hub/account/profile?saved=1");
  }
  const jar = await cookies();
  const raw = jar.get(DEMO_COOKIE)?.value;
  if (raw) {
    const current = JSON.parse(raw) as { id: string; email: string; name: string; plan: string };
    jar.set(DEMO_COOKIE, JSON.stringify({ ...current, name }), { httpOnly: true, sameSite: "lax", path: "/" });
  }
  redirect("/hub/account/profile?saved=1");
}

export async function saveEnquiry(table: "contact_messages" | "order_enquiries", payload: Record<string, string>) {
  if (!isSupabaseConfigured()) return { saved: "local" as const };
  const supabase = await createClient();
  const { error } = await supabase!.from(table).insert(payload);
  if (error) return { saved: "error" as const, message: error.message };
  return { saved: "remote" as const };
}

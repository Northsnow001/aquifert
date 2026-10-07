import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACTIVITY_COOKIE } from "@/lib/idle-timeout";
import { DEMO_COOKIE } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Ends this browser's session after the inactivity limit. Other devices stay signed in. */
export async function POST() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.delete(ACTIVITY_COOKIE);
  return new NextResponse(null, { status: 204 });
}

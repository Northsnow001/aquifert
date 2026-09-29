import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  return NextResponse.redirect(new URL("/", request.url), 303);
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_OPTIONS, idleState } from "@/lib/idle-timeout";

/** The browser reports activity here. A session already past the limit stays ended. */
export async function POST() {
  const jar = await cookies();
  if (idleState(jar.get(ACTIVITY_COOKIE)?.value) === "expired") {
    return NextResponse.json({ ok: false, expired: true }, { status: 401 });
  }
  jar.set(ACTIVITY_COOKIE, String(Date.now()), ACTIVITY_COOKIE_OPTIONS);
  return NextResponse.json({ ok: true });
}

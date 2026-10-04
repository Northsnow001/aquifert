import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  const body = user ? { signedIn: true, plan: user.plan, admin: isAdminUser(user) } : { signedIn: false, plan: null, admin: false };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}

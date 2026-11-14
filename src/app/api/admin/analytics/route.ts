import { isAdminUser } from "@/lib/admin-access";
import { liveAnalytics } from "@/lib/ga-realtime";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Live Google Analytics for the admin dashboard. Admins only. */
export async function GET() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return Response.json({ ok: false, reason: "denied", message: "Not allowed." }, { status: 401 });
  return Response.json(await liveAnalytics());
}

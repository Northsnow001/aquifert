import { isAdminUser } from "@/lib/admin-access";
import { canReadTelex, telexHeadline } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";
import { MAX_VISIT_SECONDS } from "@/lib/telex-reads/stats";
import { recordVisit } from "@/lib/telex-reads/store";

const VISIT_ID = /^[A-Za-z0-9-]{8,40}$/;
const MAX_BODY = 1024;

let warned = false;

/** The full view reports in while a member reads a flash: when it opens, at the read mark, then every so often and when they leave. */
export async function POST(request: Request, ctx: RouteContext<"/hub/telex/[id]/read">) {
  const { id } = await ctx.params;
  const user = await getSession();
  if (!user) return new Response(null, { status: 401 });

  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) return new Response(null, { status: 400 });
  let body: { visit?: unknown; seconds?: unknown; depth?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const seconds = Number(body.seconds);
  const depth = Number(body.depth);
  if (typeof body.visit !== "string" || !VISIT_ID.test(body.visit) || !Number.isFinite(seconds) || !Number.isFinite(depth)) {
    return new Response(null, { status: 400 });
  }

  const admin = isAdminUser(user);
  const findFlash = async () => {
    const item = (await getHubContent()).telex.find((entry) => entry.id === id);
    if (!item || (!admin && (item.status !== "published" || !canReadTelex(item.access, user.plan)))) return null;
    return { headline: telexHeadline(item) };
  };

  try {
    const visit = await recordVisit(
      { ...user, admin },
      id,
      { visit: body.visit, seconds: Math.min(MAX_VISIT_SECONDS, Math.max(0, seconds)), depth: Math.min(100, Math.max(0, depth)) },
      findFlash,
    );
    if (!visit) return new Response(null, { status: 404 });
    return Response.json({ read: Boolean(visit.readAt) });
  } catch (error) {
    if (!warned) {
      warned = true;
      console.error("[telex-reads]", error instanceof Error ? error.message : error);
    }
    return new Response(null, { status: 503 });
  }
}

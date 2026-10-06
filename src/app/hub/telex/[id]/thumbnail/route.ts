import { isAdminUser } from "@/lib/admin-access";
import { canReadTelex, isThumbLink } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";
import { readTelexThumb, thumbContentType } from "@/lib/telex-thumbs";

export async function GET(request: Request, ctx: RouteContext<"/hub/telex/[id]/thumbnail">) {
  const { id } = await ctx.params;
  const user = await getSession();
  if (!user) return new Response("Sign in to see TELEX pictures.", { status: 401 });

  const item = (await getHubContent()).telex.find((entry) => entry.id === id);
  const admin = isAdminUser(user);
  if (!item || (!admin && (item.status !== "published" || !canReadTelex(item.access, user.plan)))) return new Response("Not found.", { status: 404 });

  const stored = item.thumbnail?.trim();
  if (!stored) return new Response("This flash has no picture.", { status: 404 });
  if (isThumbLink(stored)) return Response.redirect(stored, 302);

  const data = await readTelexThumb(item.id, stored);
  if (!data) return new Response("This flash has no picture.", { status: 404 });
  const current = new URL(request.url).searchParams.get("v") === stored;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": thumbContentType(stored),
      "Cache-Control": current ? "private, max-age=31536000, immutable" : "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

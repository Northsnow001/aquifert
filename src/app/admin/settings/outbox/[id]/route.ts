import { isAdminUser } from "@/lib/admin-access";
import { listOutbox } from "@/lib/mailer";
import { getSession } from "@/lib/session";

export async function GET(_request: Request, ctx: RouteContext<"/admin/settings/outbox/[id]">) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const { id } = await ctx.params;
  const entry = listOutbox().find((item) => item.id === id);
  if (!entry) return new Response("That email is no longer in the outbox.", { status: 404 });
  return new Response(entry.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'",
    },
  });
}

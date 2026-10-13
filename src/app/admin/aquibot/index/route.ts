import { isAdminUser } from "@/lib/admin-access";
import { indexSource, type IndexResult } from "@/lib/aquibot-engine/indexer";
import { engineStatus } from "@/lib/aquibot-engine/store";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

/** Indexes one source. A route rather than a server action so the browser can run several side by side. */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return Response.json({ ok: false, message: "Sign in with an admin account." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; force?: unknown };
  const key = String(body.key ?? "").trim();
  if (!/^(telex|file):\S{1,160}$/.test(key)) return Response.json({ ok: false, message: "Unknown source." }, { status: 400 });

  const status = await engineStatus();
  if (!status.ready) {
    const result: IndexResult = { key, ok: false, state: "not_indexed", chunkCount: 0, message: status.problem ?? "The engine is not ready." };
    return Response.json(result);
  }
  return Response.json(await indexSource(key, { force: body.force === true }));
}

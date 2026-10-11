import { isAdminUser } from "@/lib/admin-access";
import { canReadTelex, telexDocExt, telexDocView } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";
import { readTelexDoc, telexDocMime, telexDocSignedUrl } from "@/lib/telex-docs";

/** The saved file keeps the title the desk gave it, with the real extension. */
function downloadName(title: string, name: string) {
  const ext = telexDocExt(name);
  const base = title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "document";
  return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

export async function GET(request: Request, ctx: RouteContext<"/hub/telex/[id]/documents/[docId]">) {
  const { id, docId } = await ctx.params;
  const user = await getSession();
  if (!user) return new Response("Sign in to open TELEX documents.", { status: 401 });

  const item = (await getHubContent()).telex.find((entry) => entry.id === id);
  const admin = isAdminUser(user);
  if (!item || (!admin && item.status !== "published")) return new Response("Not found.", { status: 404 });
  if (!admin && !canReadTelex(item.access, user.plan)) return new Response("Your plan does not include this document.", { status: 403 });

  const doc = item.documents?.find((entry) => entry.id === docId);
  if (!doc) return new Response("This document is no longer attached.", { status: 404 });

  const inline = new URL(request.url).searchParams.get("inline") === "1" && telexDocView(doc.name) !== "download";
  const name = downloadName(doc.title, doc.name);

  const signed = await telexDocSignedUrl(doc, inline ? null : name);
  if (signed) return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "private, no-store" } });

  const data = await readTelexDoc(doc);
  if (!data) return new Response("This document is missing from storage.", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": telexDocMime(doc.name),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { readSiteImage } from "@/lib/site-content/media";

/** Pictures uploaded for the public website. Names are unique per upload, so they cache forever. */
export async function GET(_request: Request, ctx: RouteContext<"/site-media/[name]">) {
  const { name } = await ctx.params;
  const file = await readSiteImage(name);
  if (!file) return new Response("Not found.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { readUpload, sharedTelex } from "@/lib/share";

/** The picture of a published flash, for its public share page. The flash itself stays behind sign-in. */
export async function GET(request: Request, ctx: RouteContext<"/share/telex/[id]/picture">) {
  const { id } = await ctx.params;
  const post = await sharedTelex(id);
  if (!post?.upload) return new Response("Not found.", { status: 404 });
  const file = await readUpload(post.upload);
  if (!file) return new Response("Not found.", { status: 404 });
  const current = new URL(request.url).searchParams.get("v") === post.upload.name;
  return new Response(file.data, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": current ? "public, max-age=31536000, immutable" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

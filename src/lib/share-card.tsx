import "server-only";

import { ImageResponse } from "next/og";
import { productThumb } from "@/lib/aq-modules/types";
import { readUpload, type SharedPost } from "@/lib/share";
import { SHARE_SITE } from "@/lib/share-links";

export const CARD_SIZE = { width: 1200, height: 630 };

/** The card renderer reads JPEG and PNG only. */
const DRAWABLE = /^image\/(jpeg|png)$/;

async function fetchImage(src: string) {
  try {
    const response = await fetch(new URL(src, SHARE_SITE), { signal: AbortSignal.timeout(4000) });
    const type = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!response.ok || !DRAWABLE.test(type)) return null;
    return { data: new Uint8Array(await response.arrayBuffer()), type };
  } catch {
    return null;
  }
}

const dataUrl = (file: { data: Uint8Array; type: string }) => `data:${file.type};base64,${Buffer.from(file.data).toString("base64")}`;

async function backdrop(post: SharedPost) {
  const own = post.upload ? await readUpload(post.upload).catch(() => null) : await fetchImage(post.picture);
  if (own && DRAWABLE.test(own.type)) return dataUrl(own);
  const stock = await fetchImage(productThumb(post.product));
  return stock ? dataUrl(stock) : null;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export async function shareCard(post: SharedPost | null) {
  const [picture, logo] = await Promise.all([post ? backdrop(post) : null, fetchImage("/brand/logo-v2-light.png")]);
  const title = clip(post?.title ?? "Aquifert ONE", 110);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0C1C2E", fontFamily: "sans-serif" }}>
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not to the page
          <img src={picture} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: "linear-gradient(180deg, rgba(12,28,46,0.55) 0%, rgba(12,28,46,0.72) 45%, rgba(12,28,46,0.96) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "48px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not to the page
              <img src={dataUrl(logo)} alt="" height={52} style={{ height: 52 }} />
            ) : (
              <span style={{ color: "white", fontSize: 40, fontWeight: 700 }}>aquifert</span>
            )}
            <span style={{ display: "flex", color: "white", fontSize: 22, fontWeight: 700, letterSpacing: 3, padding: "10px 20px", borderRadius: 999, background: "rgba(255,255,255,0.14)" }}>
              {post ? `${post.label} · ${post.product.toUpperCase()}` : "AQUIFERT ONE"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: "white", fontSize: title.length > 70 ? 50 : 60, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1 }}>{title}</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
              <span style={{ display: "flex", color: "#0C1C2E", background: "#5eead4", fontSize: 24, fontWeight: 700, padding: "12px 24px", borderRadius: 12 }}>Sign up free to read</span>
              <span style={{ display: "flex", color: "rgba(255,255,255,0.8)", fontSize: 24, marginLeft: 20 }}>{post ? `${post.author} on Aquifert ONE` : "aquifert.com"}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    CARD_SIZE,
  );
}

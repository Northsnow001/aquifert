import "server-only";

import type { Metadata } from "next";
import { getAqModules, publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { notePick, productOf, productThumb, type TelexProduct } from "@/lib/aq-modules/types";
import { isThumbLink } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { sharePath, type ShareKind } from "@/lib/share-links";
import { readTelexThumb, thumbContentType } from "@/lib/telex-thumbs";

/** Only what a visitor who is not signed in may see: never the body. */
export type SharedPost = {
  kind: ShareKind;
  key: string;
  title: string;
  label: string;
  product: TelexProduct;
  author: string;
  publishedAt: string;
  /** Path or https link the teaser page shows. */
  picture: string;
  /** Set when the picture is a desk upload, read straight from storage for the preview card. */
  upload?: { telexId: string; name: string };
};

export async function sharedTelex(id: string): Promise<SharedPost | null> {
  const content = await getHubContent();
  const view = publishedTelex(content.telex, "all").find((item) => item.id === id);
  if (!view) return null;
  const stored = content.telex.find((item) => item.id === id)?.thumbnail?.trim() ?? "";
  const upload = stored && !isThumbLink(stored) ? { telexId: id, name: stored } : undefined;
  return {
    kind: "telex",
    key: id,
    title: view.headline,
    label: "TELEX",
    product: view.product,
    author: view.author || "Aquifert Desk",
    publishedAt: view.publishedAt,
    picture: upload ? `${sharePath("telex", id)}/picture?v=${encodeURIComponent(stored)}` : stored || productThumb(view.product, view.pick),
    upload,
  };
}

export async function sharedNote(slug: string): Promise<SharedPost | null> {
  const note = publishedAnalysis(await getAqModules()).find((item) => item.slug === slug);
  if (!note) return null;
  const product = productOf(`${note.products.join(" ")} ${note.title}`);
  return {
    kind: "aq-view",
    key: slug,
    title: note.title,
    label: "AQ VIEW",
    product,
    author: note.author || "Aquifert Desk",
    publishedAt: note.publishedAt,
    picture: productThumb(product, notePick(slug)),
  };
}

export const sharedPost = (kind: ShareKind, key: string) => (kind === "telex" ? sharedTelex(key) : sharedNote(key));

/** Title and card for link previews. The description never quotes the body. */
export function shareMetadata(post: SharedPost | null): Metadata {
  if (!post) return { title: "Aquifert ONE", robots: { index: false } };
  const what = post.kind === "telex" ? "TELEX flash" : "AQ View note";
  const description = `${post.label} · ${post.product}. Sign up free to Aquifert ONE to read the full ${what} from the desk.`;
  const url = sharePath(post.kind, post.key);
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", siteName: "Aquifert", title: post.title, description, url, publishedTime: post.publishedAt, authors: [post.author] },
    twitter: { card: "summary_large_image", title: post.title, description },
  };
}

export async function readUpload(upload: NonNullable<SharedPost["upload"]>) {
  const data = await readTelexThumb(upload.telexId, upload.name);
  return data ? { data: new Uint8Array(data), type: thumbContentType(upload.name) } : null;
}

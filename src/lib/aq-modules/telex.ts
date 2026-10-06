import { canReadTelex, excerpt, telexHeadline, telexThumbSrc, type TelexItem } from "@/lib/content-types";
import { productOf, toneOf, type TelexProduct, type Tone } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

export type TelexView = {
  id: string;
  headline: string;
  excerpt: string;
  paragraphs: string[];
  tags: string[];
  product: TelexProduct;
  tone: Tone;
  access: TelexItem["access"];
  publishedAt: string;
  updatedAt: string;
  author: string;
  /** The desk's own picture for this flash; null falls back to the product picture. */
  thumb: string | null;
  /** Which product picture to fall back to, counted per product from the oldest flash so it never changes. */
  pick: number;
  /** False when the member's plan does not include this flash. */
  readable: boolean;
};

/** Tags and headline decide the product; the body only breaks a tie. */
export function telexProduct(item: Pick<TelexItem, "headline" | "paragraphs" | "tags">): TelexProduct {
  const headline = telexHeadline(item);
  const product = productOf(`${item.tags.join(" ")} ${headline}`);
  return product === "General" ? productOf(`${headline} ${item.paragraphs.join(" ")}`) : product;
}

export function telexView(item: TelexItem, plan: Plan | "all", pick = 0): TelexView {
  const headline = telexHeadline(item);
  return {
    id: item.id,
    headline,
    excerpt: excerpt(item.paragraphs, 34),
    paragraphs: item.paragraphs,
    tags: item.tags,
    product: telexProduct(item),
    tone: toneOf(`${headline} ${item.paragraphs.join(" ")}`),
    access: item.access,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    author: item.author,
    thumb: telexThumbSrc(item),
    pick,
    readable: plan === "all" || canReadTelex(item.access, plan),
  };
}

/** Published flashes, newest first. */
export function publishedTelex(items: TelexItem[], plan: Plan | "all") {
  const seen = new Map<TelexProduct, number>();
  return items
    .filter((item) => item.status === "published")
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
    .map((item) => {
      const product = telexProduct(item);
      const pick = seen.get(product) ?? 0;
      seen.set(product, pick + 1);
      return telexView(item, plan, pick);
    })
    .reverse();
}

export function groupByDay(items: TelexView[]) {
  const map = new Map<string, TelexView[]>();
  for (const item of items) {
    const day = item.publishedAt.slice(0, 10);
    map.set(day, [...(map.get(day) ?? []), item]);
  }
  return [...map.entries()];
}

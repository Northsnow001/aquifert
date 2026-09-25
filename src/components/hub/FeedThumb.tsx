import { useState } from "react";

/**
 * FeedThumb, a picture thumbnail for feed content.
 * Uses the image carried from the source (publisher feed, desk attachment)
 * when present; otherwise falls back to curated Aquifert category art,
 * so every content item always renders with a consistent visual anchor.
 */

const CATEGORY_ART: Record<string, string> = {
  NITROGEN: "/media/thumbs/nitrogen.jpg",
  PHOSPHATE: "/media/thumbs/phosphate.jpg",
  POTASSIUM: "/media/thumbs/potash.jpg",
  FREIGHT: "/media/thumbs/freight.jpg",
  GENERAL: "/media/thumbs/general.jpg",
  MARKET: "/media/thumbs/market.jpg",
};

const CATEGORY_COLOR: Record<string, string> = {
  NITROGEN: "#3E8E6E",
  PHOSPHATE: "#8A7A3C",
  POTASSIUM: "#5B6B8A",
  FREIGHT: "#4A6FA5",
  GENERAL: "#6B7280",
  MARKET: "#0F766E",
};

/** Price-board product names → nutrient category. */
export function productCategory(product: string): string {
  const p = product.toLowerCase();
  if (/urea|ammoni|nitrate|uan|nitrogen/.test(p)) return "NITROGEN";
  if (/dap|map\b|tsp|ssp|phosph/.test(p)) return "PHOSPHATE";
  if (/mop|sop|potash|potassium/.test(p)) return "POTASSIUM";
  if (/freight|vessel|baltic|charter|route|shipping/.test(p)) return "FREIGHT";
  return "GENERAL";
}

export function thumbFor(opts: { imageUrl?: string | null; product?: string; kind?: string }): string {
  if (opts.imageUrl) return opts.imageUrl;
  if (opts.kind === "MARKET") return CATEGORY_ART.MARKET;
  if (opts.kind === "FREIGHT") return CATEGORY_ART.FREIGHT;
  return CATEGORY_ART[opts.product ?? "GENERAL"] ?? CATEGORY_ART.GENERAL;
}

export function FeedThumb({
  imageUrl,
  product,
  kind,
  size = 56,
  className = "",
  alt = "",
}: {
  imageUrl?: string | null;
  product?: string;
  kind?: string;
  /** Pixel edge for square thumbs; pass a className with explicit w/h for wide crops. */
  size?: number;
  className?: string;
  alt?: string;
}) {
  const category = kind === "MARKET" || kind === "FREIGHT" ? kind : (product ?? "GENERAL");
  const primary = thumbFor({ imageUrl, product, kind });
  const fallback = thumbFor({ product, kind });
  const [src, setSrc] = useState(primary);
  const [dead, setDead] = useState(false);

  if (dead) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 rounded-lg ring-1 ring-border ${className}`}
        style={{
          width: className ? undefined : size,
          height: className ? undefined : size,
          background: CATEGORY_COLOR[category] ?? CATEGORY_COLOR.GENERAL,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      onError={() => {
        if (src !== fallback) setSrc(fallback);
        else setDead(true);
      }}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      className={`shrink-0 select-none rounded-lg object-cover ring-1 ring-border ${className}`}
      style={className ? undefined : { width: size, height: size }}
    />
  );
}

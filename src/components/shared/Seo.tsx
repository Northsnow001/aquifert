import { useEffect } from "react";

const SITE = "https://aquifert.com";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-page SEO / GEO / AI-search optimisation.
 * Sets a unique title, description, keywords, canonical URL and Open Graph /
 * Twitter metadata, and injects JSON-LD structured data (removed on unmount)
 * so search engines and AI answer engines can attribute facts to Aquifert.
 */
export function Seo({
  title,
  description,
  path = "/",
  keywords,
  image = "/media/hero-ship-containers.jpg",
  jsonLd = [],
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  /** Absolute-path social share image; defaults to the hero ship shot. */
  image?: string;
  jsonLd?: Record<string, unknown>[];
}) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    if (keywords) upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "Aquifert");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", `${SITE}${path}`);
    upsertMeta("property", "og:image", `${SITE}${image}`);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", `${SITE}${image}`);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE}${path}`;

    const scripts = jsonLd.map((obj) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.dataset.seo = "page";
      s.text = JSON.stringify(obj);
      document.head.appendChild(s);
      return s;
    });
    return () => scripts.forEach((s) => s.remove());
  }, [title, description, path, keywords, jsonLd]);

  return null;
}

/** Organisation + WebSite schema shared by every public page (AI answer engines read this). */
export const ORGANIZATION_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Aquifert",
      url: SITE,
      logo: `${SITE}/brand/logo-v2.png`,
      description:
        "Aquifert is a UK-based B2B fertilizer trading platform. Members source water-soluble fertilizer, Urea, DAP, MOP, MAP and NPK, directly from vetted global producers at true landed cost, with AI-drafted quotes, live container tracking and invoice financing.",
      foundingLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" } },
      knowsAbout: [
        "fertilizer trading",
        "water-soluble fertilizer",
        "urea",
        "DAP",
        "MOP",
        "MAP",
        "NPK",
        "agricultural supply chain",
        "container shipping",
        "invoice financing",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Aquifert",
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en-GB",
    },
  ],
};

/** BreadcrumbList schema for AI answer engines and search rich results. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

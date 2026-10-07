import "server-only";

import type { Metadata } from "next";
import { SITE_SCHEMA, type SitePageKey } from "@/lib/site-content/schema";
import { getSiteContent } from "@/lib/site-content/store";

type EditablePage = Exclude<SitePageKey, "global">;

const SHARE_IMAGE = "/media/hero-ship-containers.jpg";

/** Title, description and share cards from the page's "Search & sharing" section. */
export async function siteMetadata(key: EditablePage): Promise<Metadata> {
  const { title, description } = (await getSiteContent())[key].seo;
  const path = SITE_SCHEMA[key].path;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Aquifert", title, description, url: path, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

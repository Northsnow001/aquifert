import { siteMetadata } from "@/lib/site-content/metadata";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { getSiteContent } from "@/lib/site-content/store";
import Landing from "@/marketing/pages/Landing";

const TAB_TITLE = DEFAULT_SITE_CONTENT.home.seo.title;
const SITE_DESCRIPTION = DEFAULT_SITE_CONTENT.home.seo.description;

export async function generateMetadata() {
  const metadata = await siteMetadata("home");
  return {
    ...metadata,
    title: TAB_TITLE,
    description: SITE_DESCRIPTION,
    openGraph: { ...metadata.openGraph, title: TAB_TITLE, description: SITE_DESCRIPTION },
    twitter: { ...metadata.twitter, title: TAB_TITLE, description: SITE_DESCRIPTION },
  };
}

export default async function HomePage() {
  const { home } = await getSiteContent();
  return <Landing content={{ ...home, seo: { ...home.seo, title: TAB_TITLE, description: SITE_DESCRIPTION } }} />;
}

import { siteMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import Platform from "@/marketing/pages/Platform";

export const generateMetadata = () => siteMetadata("platform");

export default async function PlatformPage() {
  const { platform } = await getSiteContent();
  return <Platform content={platform} />;
}

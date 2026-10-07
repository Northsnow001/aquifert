import { siteMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import Landing from "@/marketing/pages/Landing";

export const generateMetadata = () => siteMetadata("home");

export default async function HomePage() {
  const { home } = await getSiteContent();
  return <Landing content={home} />;
}

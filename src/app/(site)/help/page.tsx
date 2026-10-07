import { siteMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import Help from "@/marketing/pages/Help";

export const generateMetadata = () => siteMetadata("help");

export default async function HelpPage() {
  const { help } = await getSiteContent();
  return <Help content={help} />;
}

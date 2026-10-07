import { siteMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import WhyAquifert from "@/marketing/pages/WhyAquifert";

export const generateMetadata = () => siteMetadata("why");

export default async function WhyAquifertPage() {
  const { why } = await getSiteContent();
  return <WhyAquifert content={why} />;
}

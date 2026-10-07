import { siteMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import { MembershipPage } from "@/marketing/pages/MembershipPage";

export const generateMetadata = () => siteMetadata("membership");

export default async function Membership() {
  const { membership } = await getSiteContent();
  return <MembershipPage content={membership} />;
}

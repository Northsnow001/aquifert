import { siteMetadata } from "@/lib/site-content/metadata";
import { getSiteContent } from "@/lib/site-content/store";
import ContactPage from "@/marketing/pages/Contact";

export const generateMetadata = () => siteMetadata("contact");

export default async function Contact() {
  const { contact } = await getSiteContent();
  return <ContactPage content={contact} />;
}

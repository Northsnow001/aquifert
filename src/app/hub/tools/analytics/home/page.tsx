import { PersonalFeed } from "@/components/hub/personal-feed";

export const dynamic = "force-dynamic";

export default function AnalyticsHomePage() {
  return (
    <PersonalFeed
      title="Your AQ Analytics"
      lede="Telex flashes and AQ View notes that match the products, countries and tags you chose. New matching items show up as the desk publishes them."
    />
  );
}

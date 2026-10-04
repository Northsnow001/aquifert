import type { Metadata } from "next";
import { MembershipPage } from "@/marketing/pages/MembershipPage";

export const metadata: Metadata = {
  title: "Fertilizer Membership Plans: AQ Zero Sprout, AQ Zero Harvest, AQ Zero Scale, AQ Analytics | Aquifert",
  description:
    "Aquifert membership replaces per-tonne fertilizer margin with one flat fee. AQ Zero Sprout (up to 200t a month), AQ Zero Harvest (201-600t) and AQ Zero Scale (unlimited) include cost-to-cost quotes, market intelligence, live tracking and invoice financing. AQ Analytics adds licensed market data and unlimited Aquibot without physical trading.",
  alternates: { canonical: "/membership" },
};

export default MembershipPage;

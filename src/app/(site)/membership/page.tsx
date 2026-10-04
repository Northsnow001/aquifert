import type { Metadata } from "next";
import { MembershipPage } from "@/marketing/pages/MembershipPage";

export const metadata: Metadata = {
  title: "Fertilizer Trading Membership Plans: AQ Zero Sprout, AQ Zero Harvest, AQ Zero Scale | Aquifert",
  description:
    "Aquifert membership replaces per-tonne fertilizer margin with one flat fee. AQ Zero Sprout (up to 200t a month), AQ Zero Harvest (201-600t) and AQ Zero Scale (unlimited) include cost-to-cost quotes, market intelligence, live tracking and invoice financing.",
  alternates: { canonical: "/membership" },
};

export default MembershipPage;

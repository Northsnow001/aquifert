import type { Metadata } from "next";
import { MembershipPage } from "@/marketing/pages/MembershipPage";

export const metadata: Metadata = {
  title: "Fertilizer Trading Membership Plans: AQ Sprout, AQ Harvest, AQ Scale | Aquifert",
  description:
    "Aquifert membership replaces per-tonne fertilizer margin with one flat fee. AQ Sprout (up to 200t a month), AQ Harvest (201-600t) and AQ Scale (unlimited) include cost-to-cost quotes, market intelligence, live tracking and invoice financing.",
  alternates: { canonical: "/membership" },
};

export default MembershipPage;

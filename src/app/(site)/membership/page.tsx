import type { Metadata } from "next";
import { MembershipPage } from "@/marketing/pages/MembershipPage";

export const metadata: Metadata = {
  title: "Fertilizer Trading Membership Plans, Sprout £2,000, Harvest £5,000, Scale £7,000 | Aquifert",
  description:
    "Aquifert membership replaces per-tonne fertilizer margin with one flat fee. Sprout (£2,000/month, up to 50t), Harvest (£5,000/month, 51-200t) and Scale (£7,000/month, 201t+) include cost-to-cost quotes, market intelligence, live tracking and invoice financing.",
  alternates: { canonical: "/membership" },
};

export default MembershipPage;

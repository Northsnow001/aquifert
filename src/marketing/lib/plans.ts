export const MEMBERSHIP_PLANS = [
  {
    tier: "SPROUT" as const,
    name: "AQ Zero Sprout",
    tonnage: "Up to 200 tonnes / month",
    features: [
      "Cost-to-cost pricing (no margin)",
      "Basic market insights dashboard",
      "30-day price trends",
      "Standard support",
    ],
    missing: ["Invoice financing", "Real-time AI recommendations", "Dedicated account manager"],
  },
  {
    tier: "HARVEST" as const,
    name: "AQ Zero Harvest",
    tonnage: "201–600 tonnes / month",
    features: [
      "Everything in AQ Zero Sprout",
      "Real-time insights dashboard",
      "Invoice financing up to £50k",
      "AI trade recommendations",
      "Priority support",
    ],
    missing: ["Dedicated account manager", "Custom analytics"],
  },
  {
    tier: "SCALE" as const,
    name: "AQ Zero Scale",
    tonnage: "Unlimited tonnes / month",
    features: [
      "Everything in AQ Zero Harvest",
      "Dedicated account manager",
      "Financing up to £200k",
      "Custom analytics & reports",
      "Quarterly strategy reviews",
    ],
    missing: [] as string[],
  },
];

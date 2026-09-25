/** Client-side sample gauges — Hub never waits blank on a slow RPC. */
import type { Indicator } from "@/components/hub/GaugeCard";

const AS_OF = "2026-09-17T21:07:00.000Z";

function fresh(owner = "Trading Desk") {
  return {
    level: "amber" as const,
    asOf: AS_OF,
    ageHours: 168,
    cadence: "7 days",
    source: "Aquifert Trading Desk",
    owner,
    nextExpected: null as string | null,
  };
}

export const SAMPLE_HUB_INDICATORS: Indicator[] = [
  {
    id: 1,
    nutrient: "NITROGEN",
    score: 62,
    label: "Bullish",
    rationale:
      "Fresh Indian tender and firm Egyptian FOB keep the desk constructive; China export policy remains the swing factor into October.",
    history: [
      { date: "2026-06-20", score: 55 },
      { date: "2026-07-15", score: 58 },
      { date: "2026-08-10", score: 60 },
      { date: "2026-09-01", score: 59 },
      { date: "2026-09-17", score: 62 },
    ],
    updatedBy: "Aquifert Trading Desk",
    updatedAt: AS_OF,
    freshness: fresh(),
  },
  {
    id: 2,
    nutrient: "PHOSPHATE",
    score: 54,
    label: "Neutral",
    rationale:
      "Brazil demand is winding down while Chinese export allocations and Indian parity keep the desk balanced rather than directional.",
    history: [
      { date: "2026-06-20", score: 52 },
      { date: "2026-07-15", score: 53 },
      { date: "2026-08-10", score: 55 },
      { date: "2026-09-01", score: 54 },
      { date: "2026-09-17", score: 54 },
    ],
    updatedBy: "Aquifert Trading Desk",
    updatedAt: AS_OF,
    freshness: fresh(),
  },
  {
    id: 3,
    nutrient: "POTASSIUM",
    score: 47,
    label: "Neutral",
    rationale:
      "SE Asia spot is flat; Baltic logistics works and no disruption is confirmed — desk stays neutral into Q4 contracts.",
    history: [
      { date: "2026-06-20", score: 50 },
      { date: "2026-07-15", score: 49 },
      { date: "2026-08-10", score: 48 },
      { date: "2026-09-01", score: 47 },
      { date: "2026-09-17", score: 47 },
    ],
    updatedBy: "Aquifert Trading Desk",
    updatedAt: AS_OF,
    freshness: fresh(),
  },
];

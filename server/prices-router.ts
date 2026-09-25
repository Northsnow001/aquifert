/**
 * Hub price board — sample data only (no Drizzle).
 */
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { HUB_AS_OF, SAMPLE_PRICES_FREIGHT, SAMPLE_PRICES_ME } from "@contracts/hub-sample";

const REGIONS = [
  "Middle East",
  "Black Sea",
  "Baltic",
  "North Africa",
  "North West Europe",
  "US Gulf",
  "Brazil",
  "India",
  "China",
  "Southeast Asia",
  "East Africa",
  "Southern Africa",
  "Freight",
] as const;

export const pricesRouter = createRouter({
  enabled: publicQuery.query(() => process.env.PRICE_SLIDER_ENABLED !== "false"),

  regions: publicQuery.query(() => [...REGIONS]),

  slider: publicQuery
    .input(z.object({ region: z.string() }))
    .query(async ({ input }) => {
      const items =
        input.region === "Freight"
          ? SAMPLE_PRICES_FREIGHT
          : input.region === "All"
            ? [...SAMPLE_PRICES_ME, ...SAMPLE_PRICES_FREIGHT]
            : SAMPLE_PRICES_ME;
      return {
        region: input.region,
        asOf: new Date(HUB_AS_OF),
        items: items.map((p) => ({
          ...p,
          sourceCode: "AQ_DESK",
          sourceName: "Aquifert desk assessments",
          dataAsOf: new Date(p.dataAsOf),
          stale: false,
        })),
      };
    }),

  sources: publicQuery.query(async () => [
    {
      code: "AQ_DESK",
      name: "Aquifert desk assessments",
      url: "https://aquifert.com",
      attributionText: "Aquifert desk assessments (sample)",
      refreshCadence: "7 days",
      dataAsOf: new Date(HUB_AS_OF),
    },
  ]),
});

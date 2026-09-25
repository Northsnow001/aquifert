-- Seed live Hub gauges + starter TELEX so /hub is not empty.
-- Run once in Supabase SQL Editor. Safe to re-run.

INSERT INTO public.hub_indicators ("nutrient", "score", "rationale", "history", "updatedBy", "updatedAt")
VALUES
  (
    'NITROGEN',
    58,
    $$Urea sentiment steady; Middle East offers hold while Indian tender timing keeps the desk constructive.$$,
    '[{"date":"2026-09-18","score":55},{"date":"2026-09-25","score":58}]'::jsonb,
    'Aquifert Trading Desk',
    now()
  ),
  (
    'PHOSPHATE',
    52,
    $$DAP/MAP balanced; Brazilian demand supporting floors with limited spot availability out of North Africa.$$,
    '[{"date":"2026-09-18","score":50},{"date":"2026-09-25","score":52}]'::jsonb,
    'Aquifert Trading Desk',
    now()
  ),
  (
    'POTASSIUM',
    47,
    $$MOP quieter into Q4; contract negotiations ongoing with soft spot liquidity.$$,
    '[{"date":"2026-09-18","score":48},{"date":"2026-09-25","score":47}]'::jsonb,
    'Aquifert Trading Desk',
    now()
  )
ON CONFLICT ("nutrient") DO UPDATE SET
  "score" = EXCLUDED."score",
  "rationale" = EXCLUDED."rationale",
  "history" = EXCLUDED."history",
  "updatedBy" = EXCLUDED."updatedBy",
  "updatedAt" = now();

INSERT INTO public.telex_items ("title", "body", "product", "geography", "createdAt", "updatedAt")
SELECT * FROM (
  SELECT
    $$Urea CFR Brazil offers firm for October$$ AS title,
    $$Desk notes limited prompt tonnage; buyers covering short stems ahead of planting windows.$$ AS body,
    'NITROGEN'::varchar AS product,
    'SOUTH_AMERICA'::varchar AS geography,
    now() - '2 hours'::interval AS "createdAt",
    now() - '2 hours'::interval AS "updatedAt"
  UNION ALL
  SELECT
    $$DAP FOB Morocco steady; MAP slightly firmer$$,
    $$Supplier indications unchanged week-on-week. Freight still the swing factor into NW Europe.$$,
    'PHOSPHATE',
    'AFRICA',
    now() - '5 hours'::interval,
    now() - '5 hours'::interval
  UNION ALL
  SELECT
    $$MOP contract talks: soft spot, firm contracts$$,
    $$Spot remains quiet while annual negotiations continue. Watch Baltic and Dead Sea stems.$$,
    'POTASSIUM',
    'GLOBAL',
    now() - '1 day'::interval,
    now() - '1 day'::interval
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM public.telex_items LIMIT 1);

INSERT INTO public.hub_commentary ("kind", "title", "byline", "paragraphs", "publishedAt", "createdAt")
SELECT
  'MARKET',
  $$AQ VIEW: Balanced desks into late September$$,
  'Aquifert Trading Desk',
  '["Nitrogen holds a mild constructive bias on tender timing.","Phosphate floors supported by Brazilian demand.","Potash remains the quieter nutrient with soft spot liquidity."]'::jsonb,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.hub_commentary WHERE "kind" = 'MARKET' LIMIT 1
);

-- Seed live Hub gauges + starter TELEX so /hub is not empty.
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Values align with the Kimi Hub update (demo gauges for client walkthrough).

INSERT INTO public.hub_indicators ("nutrient", "score", "rationale", "history", "updatedBy", "updatedAt")
VALUES
  (
    'NITROGEN',
    62,
    $$Fresh Indian tender and firm Egyptian FOB keep the desk constructive; China export policy remains the swing factor into October.$$,
    '[{"date":"2026-06-20","score":55},{"date":"2026-07-15","score":58},{"date":"2026-08-10","score":60},{"date":"2026-09-01","score":59},{"date":"2026-09-17","score":62}]'::jsonb,
    'Aquifert Trading Desk',
    '2026-09-17T21:07:00.000Z'::timestamptz
  ),
  (
    'PHOSPHATE',
    54,
    $$Brazil demand is winding down while Chinese export allocations and Indian parity keep the desk balanced rather than directional.$$,
    '[{"date":"2026-06-20","score":52},{"date":"2026-07-15","score":53},{"date":"2026-08-10","score":55},{"date":"2026-09-01","score":54},{"date":"2026-09-17","score":54}]'::jsonb,
    'Aquifert Trading Desk',
    '2026-09-17T21:07:00.000Z'::timestamptz
  ),
  (
    'POTASSIUM',
    47,
    $$SE Asia spot is flat; Baltic logistics works and no disruption is confirmed — desk stays neutral into Q4 contracts.$$,
    '[{"date":"2026-06-20","score":50},{"date":"2026-07-15","score":49},{"date":"2026-08-10","score":48},{"date":"2026-09-01","score":47},{"date":"2026-09-17","score":47}]'::jsonb,
    'Aquifert Trading Desk',
    '2026-09-17T21:07:00.000Z'::timestamptz
  )
ON CONFLICT ("nutrient") DO UPDATE SET
  "score" = EXCLUDED."score",
  "rationale" = EXCLUDED."rationale",
  "history" = EXCLUDED."history",
  "updatedBy" = EXCLUDED."updatedBy",
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO public.telex_items ("title", "body", "product", "geography", "createdAt", "updatedAt")
SELECT * FROM (
  SELECT
    $$POTASSIUM, Contract chatter$$ AS title,
    $$SE Asia standard MOP contracts under discussion; spot remains quiet with soft liquidity.$$ AS body,
    'POTASSIUM'::varchar AS product,
    'EAST_ASIA'::varchar AS geography,
    '2026-09-12T10:00:00.000Z'::timestamptz AS "createdAt",
    '2026-09-12T10:00:00.000Z'::timestamptz AS "updatedAt"
  UNION ALL
  SELECT
    $$PHOSPHATE, TSP niche firm$$,
    $$LatAm demand for TSP supports a firmer niche; mainstream DAP/MAP balanced.$$,
    'PHOSPHATE',
    'SOUTH_AMERICA',
    '2026-09-12T14:00:00.000Z',
    '2026-09-12T14:00:00.000Z'
  UNION ALL
  SELECT
    $$FREIGHT, Baltic dry index flat$$,
    $$Dry bulk indices little changed week-on-week; fertilizer stems still finding cover.$$,
    'FREIGHT',
    'GLOBAL',
    '2026-09-13T09:00:00.000Z',
    '2026-09-13T09:00:00.000Z'
  UNION ALL
  SELECT
    $$NITROGEN, US fill done$$,
    $$US fill season largely complete; attention shifts to Mexican and Brazilian stems.$$,
    'NITROGEN',
    'NORTH_AMERICA',
    '2026-09-13T16:00:00.000Z',
    '2026-09-13T16:00:00.000Z'
  UNION ALL
  SELECT
    $$India IPL issues urea tender for October shipment$$,
    $$Fresh Indian tender keeps Middle East FOB constructive into October.$$,
    'NITROGEN',
    'SOUTH_ASIA',
    '2026-09-17T12:00:00.000Z',
    '2026-09-17T12:00:00.000Z'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM public.telex_items LIMIT 1);

INSERT INTO public.hub_commentary ("kind", "title", "byline", "paragraphs", "publishedAt", "createdAt")
SELECT
  'MARKET',
  $$AQ VIEW: Balanced desks into late September$$,
  'Aquifert Trading Desk',
  '["Nitrogen holds a mild constructive bias on tender timing.","Phosphate floors supported by Brazilian demand.","Potash remains the quieter nutrient with soft spot liquidity."]'::jsonb,
  '2026-09-17T21:07:00.000Z'::timestamptz,
  '2026-09-17T21:07:00.000Z'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM public.hub_commentary WHERE "kind" = 'MARKET' LIMIT 1
);

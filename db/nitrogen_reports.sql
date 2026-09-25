-- Optional: persist Nitrogen Assessment history in Supabase.
-- Safe to re-run. Not required for generate + PDF (those work without this table).

CREATE TABLE IF NOT EXISTS public.nitrogen_reports (
  id bigserial PRIMARY KEY,
  "refNo" varchar(32) NOT NULL UNIQUE,
  "userId" bigint NOT NULL,
  answers jsonb NOT NULL,
  "reportMd" text NOT NULL,
  "pdfUrl" varchar(512),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nitrogen_reports_user_idx ON public.nitrogen_reports ("userId");

-- Optional repair if login still fails with a users upsert error.
-- Run in Supabase SQL Editor (once). Safe to re-run.

-- Ensure unique constraint the app expects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_unionId_unique'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT "users_unionId_unique" UNIQUE ("unionId");
  END IF;
END $$;

-- App connects as the DB owner from DATABASE_URL; grant table access just in case
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

-- Disable RLS on app tables if it was enabled without policies (blocks the pooler role)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.price_sources DISABLE ROW LEVEL SECURITY;

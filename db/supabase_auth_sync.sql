-- Sync Supabase Auth (auth.users) → public.users + public.user_credentials
-- Matches app mapping: unionId = 'supabase:' || auth.users.id
-- Run in Supabase SQL Editor after supabase_init.sql

CREATE OR REPLACE FUNCTION public.handle_supabase_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_union_id text;
  v_name text;
  v_email text;
  v_phone text;
  v_company text;
  v_country text;
  v_user_id bigint;
BEGIN
  v_union_id := 'supabase:' || NEW.id::text;
  v_email := lower(NEW.email);

  v_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'name'), ''),
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
    'User'
  );

  v_phone := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'phone'), ''),
    nullif(NEW.phone, '')
  );

  v_company := nullif(trim(NEW.raw_user_meta_data->>'company'), '');
  v_country := nullif(trim(NEW.raw_user_meta_data->>'country'), '');

  INSERT INTO public.users (
    "unionId",
    "name",
    "email",
    "phone",
    "lastSignInAt"
  )
  VALUES (
    v_union_id,
    v_name,
    v_email,
    v_phone,
    now()
  )
  ON CONFLICT ("unionId") DO UPDATE SET
    "name" = COALESCE(EXCLUDED."name", public.users."name"),
    "email" = COALESCE(EXCLUDED."email", public.users."email"),
    "phone" = COALESCE(EXCLUDED."phone", public.users."phone"),
    "updatedAt" = now(),
    "lastSignInAt" = now()
  RETURNING id INTO v_user_id;

  IF v_email IS NOT NULL THEN
    INSERT INTO public.user_credentials (
      "userId",
      "email",
      "passwordHash",
      "emailVerified",
      "company",
      "country",
      "phone"
    )
    VALUES (
      v_user_id,
      v_email,
      'supabase:managed',
      (NEW.email_confirmed_at IS NOT NULL),
      v_company,
      v_country,
      v_phone
    )
    ON CONFLICT ("email") DO UPDATE SET
      "userId" = EXCLUDED."userId",
      "emailVerified" = EXCLUDED."emailVerified",
      "company" = COALESCE(EXCLUDED."company", public.user_credentials."company"),
      "country" = COALESCE(EXCLUDED."country", public.user_credentials."country"),
      "phone" = COALESCE(EXCLUDED."phone", public.user_credentials."phone");
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supabase_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, phone, raw_user_meta_data, email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supabase_auth_user();

-- Optional: backfill existing auth users into public.users
INSERT INTO public.users ("unionId", "name", "email", "phone", "lastSignInAt")
SELECT
  'supabase:' || u.id::text,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  lower(u.email),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'phone'), ''),
    nullif(u.phone, '')
  ),
  coalesce(u.last_sign_in_at, u.created_at, now())
FROM auth.users u
ON CONFLICT ("unionId") DO NOTHING;

INSERT INTO public.user_credentials (
  "userId",
  "email",
  "passwordHash",
  "emailVerified",
  "company",
  "country",
  "phone"
)
SELECT
  pu.id,
  lower(au.email),
  'supabase:managed',
  (au.email_confirmed_at IS NOT NULL),
  nullif(trim(au.raw_user_meta_data->>'company'), ''),
  nullif(trim(au.raw_user_meta_data->>'country'), ''),
  coalesce(
    nullif(trim(au.raw_user_meta_data->>'phone'), ''),
    nullif(au.phone, '')
  )
FROM auth.users au
JOIN public.users pu ON pu."unionId" = 'supabase:' || au.id::text
WHERE au.email IS NOT NULL
ON CONFLICT ("email") DO NOTHING;

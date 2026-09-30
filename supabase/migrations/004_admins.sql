-- Grant admin access by setting app_metadata.role = 'admin' on the auth user.
-- Members cannot change app_metadata themselves; only SQL or the service role can.
-- Takes effect on the member's next page load (no sign-out needed).

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where lower(email) in (
  'ayodeji.ogunmola09@gmail.com',
  'kaytoba49@gmail.com'
);

-- Check who is an admin:
-- select email, raw_app_meta_data->>'role' as role from auth.users where raw_app_meta_data->>'role' = 'admin';

-- Remove admin access from someone:
-- update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where lower(email) = 'someone@example.com';

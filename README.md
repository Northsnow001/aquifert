# Aquifert One

Member hub rebuilt with Next.js, TypeScript, Tailwind, and Supabase. It follows the WordPress hub layout and runs the Freight and Netback formulas in TypeScript. Other member pages use sample data.

## Scripts

- `npm run dev` starts the app at http://localhost:3000
- `npm test` checks the freight and netback worked examples
- `npm run build` creates the production build

Without Supabase environment variables, sign-in uses a local demo cookie so the hub can be reviewed. With Supabase configured, sign-in uses Supabase Auth.

## Supabase

1. Create a project and copy the URL and anon key into `.env.local` using `.env.example`.
2. Run `supabase/migrations/001_init.sql`, then `supabase/seed.sql`.
3. Seed data includes ports, urea benchmarks, sample duties, bunker prices, and the default BDI.

## Vercel

Import this GitHub repository in Vercel. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL`. The WordPress tree is not part of this deploy.

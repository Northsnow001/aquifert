/** Lightweight probe. Does not import the app bundle. */
export default function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  res.status(200).json({
    ok: true,
    probe: "health",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasAppSecret: Boolean(process.env.APP_SECRET),
    supabaseAuth: Boolean(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
        (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    ),
  });
}

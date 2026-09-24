/** Lightweight probe. Does not import the app bundle. */
const body = {
  ok: true,
  probe: "health",
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasAppSecret: Boolean(process.env.APP_SECRET),
  supabaseAuth: Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
  ),
};

export default function handler(
  _req: unknown,
  res?: { statusCode?: number; setHeader?: (k: string, v: string) => void; end?: (b: string) => void },
) {
  if (res && typeof res.end === "function") {
    res.statusCode = 200;
    res.setHeader?.("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
    return;
  }
  return Response.json(body);
}

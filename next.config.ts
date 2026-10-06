import type { NextConfig } from "next";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

// The Vercel project predates this app and may only define the legacy VITE_/SUPABASE_ names.
const env: Record<string, string> = {};
if (supabaseUrl) env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
if (supabaseAnonKey) env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;

const nextConfig: NextConfig = {
  env,
  experimental: {
    // TELEX thumbnails ride along with the editor form.
    serverActions: { bodySizeLimit: "4mb" },
  },
  outputFileTracingIncludes: {
    "/admin/import/plugin": ["./wordpress/aquifert-export/**/*"],
  },
};

export default nextConfig;

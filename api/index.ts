/**
 * Sole Vercel Serverless entry for all /api/* traffic.
 * Nested catch-alls (api/[[...route]].ts) are NOT supported on Vite/non-Next
 * projects — vercel.json rewrites /api/:path* → /api (this file) instead.
 * The Hono app is pre-bundled to dist/boot.js during `npm run build`.
 */
// @ts-nocheck — dist/boot.js is produced by the build step before this runs
import { handle } from "hono/vercel";
import app from "../dist/boot.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(app);

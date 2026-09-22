/**
 * Sole Vercel Serverless entry. The Hono app lives in ../server and is
 * pre-bundled to dist/boot.js during `npm run build` so Vercel does not
 * typecheck every backend module as its own function.
 */
// @ts-nocheck — dist/boot.js is produced by the build step before this runs
import { handle } from "hono/vercel";
import app from "../dist/boot.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(app);

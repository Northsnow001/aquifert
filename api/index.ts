/**
 * Vercel Node function entry. Imports pre-bundled Hono handler from ./boot.js
 * (created by `npm run build` via server/vercel-entry.ts).
 *
 * vercel.json rewrites /api/* → /api/index so nested tRPC paths work on Vite.
 */
// @ts-nocheck
export { default, config } from "./boot.js";

/**
 * Vercel serverless entry — bundled by `npm run build` into api/boot.js.
 * api/index.ts re-exports the default handler.
 */
import { handle } from "hono/vercel";
import app from "./boot";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(app);

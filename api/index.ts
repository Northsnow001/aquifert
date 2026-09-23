/**
 * Vercel Node function. Imports the pre-bundled Hono app from ./boot.js
 * (emitted next to this file by `npm run build`).
 */
// @ts-nocheck
export { default, config } from "./boot.js";

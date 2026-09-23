/**
 * Minimal Vercel API: health + auth tRPC only (unblocks signup session).
 */
import { handle } from "hono/vercel";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { createContext } from "./context";
import { env } from "./lib/env";

const slimRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
});

const app = new Hono();

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    slim: true,
    hasDatabaseUrl: Boolean(env.databaseUrl),
    hasAppSecret: Boolean(env.appSecret),
    supabaseAuth: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  }),
);

app.use("/api/trpc/*", async (c) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: slimRouter,
    createContext,
  }),
);

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export const config = { runtime: "nodejs", maxDuration: 30 };
export default handle(app);

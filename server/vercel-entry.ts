/**
 * Slim Vercel Hono entry: health + tRPC (full app router).
 * Heavy PDF/mail deps are left external so the serverless bundle stays small.
 */
import { handle } from "hono/vercel";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    hasDatabaseUrl: Boolean(env.databaseUrl),
    hasAppSecret: Boolean(env.appSecret),
    supabaseAuth: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  }),
);

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(app);

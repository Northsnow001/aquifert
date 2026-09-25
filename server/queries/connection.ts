import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let client: ReturnType<typeof postgres> | undefined;
let instance: ReturnType<typeof drizzle<typeof fullSchema>> | undefined;

export function getDb() {
  if (!instance) {
    if (!env.databaseUrl) {
      throw new Error("DATABASE_URL is required to connect to Supabase Postgres");
    }
    client = postgres(env.databaseUrl, {
      prepare: false, // required for Supabase transaction pooler (PgBouncer)
      max: 1, // Vercel serverless: one connection per isolate
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require",
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}

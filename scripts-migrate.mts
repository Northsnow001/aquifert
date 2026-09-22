/**
 * Legacy one-off MySQL ALTER script — obsolete after the Supabase (Postgres) switch.
 * Schema changes now go through: npm run db:generate / npm run db:push
 */
console.log("scripts-migrate.mts is retired. Use drizzle-kit (db:push / db:migrate) against DATABASE_URL.");
process.exit(0);

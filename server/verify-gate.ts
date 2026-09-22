/**
 * Soft gate: sensitive actions require a verified email.
 * Unverified users keep read access to the Hub; the gate is enforced at
 * the point of the sensitive action, never at the door.
 */
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";

export async function assertVerifiedEmail(userId: number): Promise<void> {
  const db = getDb();
  const [cred] = await db
    .select()
    .from(s.userCredentials)
    .where(eq(s.userCredentials.userId, userId))
    .limit(1);
  // No credential row → OAuth account; the provider already verified the email.
  if (cred && !cred.emailVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Verify your email to unlock the trading desk.",
    });
  }
}

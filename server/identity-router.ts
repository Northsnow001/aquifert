import * as crypto from "node:crypto";
import * as cookie from "cookie";
import { z } from "zod";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";
import { signSessionToken } from "./kimi/session";
import { getSessionCookieOptions } from "./lib/cookies";
import { sendTransactional } from "./mailer";
import { env } from "./lib/env";
import {
  DEMO_REVIEWER_UNION_ID,
  isDemoMode,
  isValidDemoLogin,
} from "./demo/mode";

/* ---------------- helpers ---------------- */

const OTP_TTL_MS = 10 * 60_000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60_000; // 60 seconds
const OTP_MAX_PER_HOUR = 5; // per email AND per IP
const OTP_MAX_ATTEMPTS = 5;

function scryptHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function scryptVerify(password: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split(":");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return calc.length === ref.length && crypto.timingSafeEqual(calc, ref);
}
function hashCode(email: string, code: string): string {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}:${code}:${env.appSecret}`).digest("hex");
}
function genCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/* Minimal breached/common password blocklist (length ≥12 enforced separately). */
const BREACHED = new Set([
  "password1234", "password12345", "qwerty123456", "letmein123456", "iloveyou1234",
  "123456789012", "abcdefghijkl", "fertilizer123", "aquifert1234", "welcome12345",
]);

/* RFC 6238 TOTP (HMAC-SHA1, 30s step), no external dependency. */
function totpNow(secretB32: string, stepOffset = 0): string {
  const key = base32Decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const off = h[h.length - 1] & 0x0f;
  const code = (h.readUInt32BE(off) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}
function base32Decode(b32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of b32.replace(/=+$/, "").toUpperCase()) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function genTotpSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % 32]).join("");
}

function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}

async function audit(email: string, event: "ISSUE" | "VERIFY_SUCCESS" | "VERIFY_FAIL" | "RESEND", headers: Headers) {
  await getDb().insert(s.otpEvents).values({
    email: email.toLowerCase(),
    event,
    ip: clientIp(headers),
    userAgent: headers.get("user-agent")?.slice(0, 500) ?? null,
  });
}

async function issueOtp(email: string, purpose: "VERIFY" | "RESET", headers: Headers, name?: string) {
  const db = getDb();
  const ip = clientIp(headers);
  const oneHourAgo = new Date(Date.now() - 3_600_000);
  const recent = await db
    .select()
    .from(s.otpCodes)
    .where(and(eq(s.otpCodes.email, email.toLowerCase()), gt(s.otpCodes.createdAt, oneHourAgo)))
    .orderBy(desc(s.otpCodes.createdAt));
  const recentIp = await db
    .select()
    .from(s.otpCodes)
    .where(and(eq(s.otpCodes.ip, ip), gt(s.otpCodes.createdAt, oneHourAgo)));
  if (recent.length >= OTP_MAX_PER_HOUR || recentIp.length >= OTP_MAX_PER_HOUR) {
    // Generic response regardless, no enumeration, no detail leak.
    return { sent: true as const, devCode: undefined as string | undefined };
  }
  if (purpose === "VERIFY" && recent[0] && Date.now() - recent[0].createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { sent: true as const, devCode: undefined };
  }
  const code = genCode();
  await db.insert(s.otpCodes).values({
    email: email.toLowerCase(),
    purpose,
    codeHash: hashCode(email, code), // hash only, never plaintext
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    ip,
    userAgent: headers.get("user-agent")?.slice(0, 500) ?? null,
  });
  await sendTransactional(
    email,
    purpose === "VERIFY" ? "Your Aquifert verification code" : "Your Aquifert password reset code",
    `${name ? `Hi ${name},\n\n` : ""}Your code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.\n\nAquifert Trading Desk`,
  );
  return { sent: true as const, devCode: env.isProduction ? undefined : code };
}

async function setSessionCookie(ctx: { resHeaders: Headers; req: Request }, userId: number) {
  const token = await signSessionToken({ unionId: `email:${userId}`, clientId: env.appId });
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

/** redirect_to allow-list, only internal absolute paths, no protocol-relative. */
export function safeRedirect(path: string | undefined): string {
  if (!path) return "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

/* ---------------- router ---------------- */

export const identityRouter = createRouter({
  /** Register with email + password, then send OTP. Generic response always. */
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(12, "Use at least 12 characters."),
        company: z.string().min(1),
        country: z.string().min(1),
        phone: z.string().optional(),
        honey: z.string().optional(), // honeypot, bots fill it
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.honey) return { sent: true }; // bot: pretend success, do nothing
      if (BREACHED.has(input.password.toLowerCase())) {
        throw new Error("This password appears in known breaches, choose another.");
      }
      const email = input.email.toLowerCase();
      const db = getDb();

      const existing = await db.select().from(s.userCredentials).where(eq(s.userCredentials.email, email)).limit(1);
      if (existing.length > 0) {
        // Identical outward response whether or not the account exists.
        if (!existing[0].emailVerified) await issueOtp(email, "VERIFY", ctx.req.headers, input.name);
        await audit(email, "ISSUE", ctx.req.headers);
        return { sent: true };
      }

      const [u] = await db
        .insert(s.users)
        .values({ unionId: `pending:${crypto.randomUUID()}`, name: input.name, email })
        .returning({ id: s.otpEvents.id });
      const userId = Number(u.id);
      // Re-key the unionId to the stable email identity
      await db.execute(sql`UPDATE users SET unionId = ${`email:${userId}`} WHERE id = ${userId}`);
      await db.insert(s.userCredentials).values({
        userId,
        email,
        passwordHash: scryptHash(input.password),
        emailVerified: false,
        company: input.company,
        country: input.country,
        phone: input.phone ?? null,
      });
      const { devCode } = await issueOtp(email, "VERIFY", ctx.req.headers, input.name);
      await audit(email, "ISSUE", ctx.req.headers);
      return { sent: true, devCode };
    }),

  /** Verify the OTP. Success → verified + signed in. */
  verifyOtp: publicQuery
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const db = getDb();
      const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.email, email)).limit(1);
      const [otp] = await db
        .select()
        .from(s.otpCodes)
        .where(and(eq(s.otpCodes.email, email), eq(s.otpCodes.purpose, "VERIFY")))
        .orderBy(desc(s.otpCodes.createdAt))
        .limit(1);

      const fail = async (msg: string) => {
        if (otp) await db.update(s.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(s.otpCodes.id, otp.id));
        await audit(email, "VERIFY_FAIL", ctx.req.headers);
        throw new Error(msg);
      };

      if (!cred || !otp || otp.usedAt) return fail("That code isn't valid. Request a new one.");
      if (otp.attempts >= OTP_MAX_ATTEMPTS) return fail("Too many attempts, request a new code.");
      if (Date.now() > otp.expiresAt.getTime()) return fail("That code has expired, request a new one.");
      if (hashCode(email, input.code) !== otp.codeHash) return fail("That code isn't right. Check the latest email and try again.");

      await db.update(s.otpCodes).set({ usedAt: new Date() }).where(eq(s.otpCodes.id, otp.id));
      await db.update(s.userCredentials).set({ emailVerified: true }).where(eq(s.userCredentials.id, cred.id));
      await audit(email, "VERIFY_SUCCESS", ctx.req.headers);
      await setSessionCookie(ctx, cred.userId);
      return { verified: true };
    }),

  /** Resend OTP, 60s cooldown, 5/hour per email and per IP, generic response. */
  resendOtp: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const db = getDb();
      const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.email, email)).limit(1);
      if (cred && !cred.emailVerified) await issueOtp(email, "VERIFY", ctx.req.headers);
      await audit(email, "RESEND", ctx.req.headers);
      return { sent: true };
    }),

  /** Password sign-in, rate limited: 5 fails/account/15min, 20/IP/hour. */
  login: publicQuery
    .input(
      z.object({
        identifier: z.string().min(1), // work email; legacy usernames still work
        password: z.string().min(1),
        totp: z.string().optional(),
        redirectTo: z.string().optional(),
        honey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.honey) return { ok: true, redirectTo: safeRedirect(input.redirectTo) };

      // Client-review demo login (no DB / no real auth provider)
      if (isDemoMode() && isValidDemoLogin(input.identifier, input.password)) {
        const token = await signSessionToken({
          unionId: DEMO_REVIEWER_UNION_ID,
          clientId: env.appId || "aquifert-local",
        });
        const opts = getSessionCookieOptions(ctx.req.headers);
        ctx.resHeaders.append(
          "set-cookie",
          cookie.serialize(Session.cookieName, token, {
            httpOnly: opts.httpOnly,
            path: opts.path,
            sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
            secure: opts.secure,
            maxAge: Session.maxAgeMs / 1000,
          }),
        );
        return { ok: true, redirectTo: safeRedirect(input.redirectTo) || "/onboarding", emailVerified: true };
      }

      const db = getDb();
      const ip = clientIp(ctx.req.headers);
      const id = input.identifier.toLowerCase();

      const failsSince = async (keyType: "ACCOUNT" | "IP", keyValue: string, windowMs: number) => {
        const rows = await db
          .select()
          .from(s.loginAttempts)
          .where(
            and(
              eq(s.loginAttempts.keyType, keyType),
              eq(s.loginAttempts.keyValue, keyValue),
              eq(s.loginAttempts.success, false),
              gt(s.loginAttempts.createdAt, new Date(Date.now() - windowMs))
            )
          );
        return rows.length;
      };

      if ((await failsSince("ACCOUNT", id, 15 * 60_000)) >= 5) {
        throw new Error("This account is temporarily locked after too many failed attempts. Try again in 15 minutes or reset your password.");
      }
      if ((await failsSince("IP", ip, 3_600_000)) >= 20) {
        throw new Error("Too many sign-in attempts from this network. Try again later or reset your password.");
      }

      const record = async (success: boolean) => {
        await db.insert(s.loginAttempts).values([
          { keyType: "ACCOUNT", keyValue: id, success },
          { keyType: "IP", keyValue: ip, success },
        ]);
      };

      // Email is the identifier going forward; legacy usernames still match.
      let credRows = await db.select().from(s.userCredentials).where(eq(s.userCredentials.email, id)).limit(1);
      if (credRows.length === 0) {
        const byName = await db.select().from(s.users).where(eq(s.users.name, input.identifier)).limit(1);
        if (byName.length > 0) {
          credRows = await db.select().from(s.userCredentials).where(eq(s.userCredentials.userId, Number(byName[0].id))).limit(1);
        }
      }
      const cred = credRows[0];
      if (!cred || !scryptVerify(input.password, cred.passwordHash)) {
        await record(false);
        throw new Error("Email or password incorrect.");
      }

      // Admin accounts: TOTP second factor is mandatory once enrolled.
      const [user] = await db.select().from(s.users).where(eq(s.users.id, cred.userId)).limit(1);
      const isAdmin = user && (user.role === "admin" || user.portalRole === "ADMIN");
      if (isAdmin && cred.totpEnabled && cred.totpSecret) {
        if (!input.totp) return { ok: false, totpRequired: true };
        const valid = [0, -1, 1].some((o) => totpNow(cred.totpSecret!, o) === input.totp);
        if (!valid) {
          await record(false);
          throw new Error("That authentication code isn't right.");
        }
      }

      await record(true);
      await setSessionCookie(ctx, cred.userId);
      return { ok: true, redirectTo: safeRedirect(input.redirectTo), emailVerified: cred.emailVerified };
    }),

  /** Forgot password, generic response, issues a RESET code. */
  forgotPassword: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const db = getDb();
      const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.email, email)).limit(1);
      if (cred) await issueOtp(email, "RESET", ctx.req.headers);
      return { sent: true };
    }),

  resetPassword: publicQuery
    .input(z.object({ email: z.string().email(), code: z.string().length(6), password: z.string().min(12) }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      const db = getDb();
      const [otp] = await db
        .select()
        .from(s.otpCodes)
        .where(and(eq(s.otpCodes.email, email), eq(s.otpCodes.purpose, "RESET")))
        .orderBy(desc(s.otpCodes.createdAt))
        .limit(1);
      if (!otp || otp.usedAt || otp.attempts >= OTP_MAX_ATTEMPTS || Date.now() > otp.expiresAt.getTime() || hashCode(email, input.code) !== otp.codeHash) {
        if (otp) await db.update(s.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(s.otpCodes.id, otp.id));
        throw new Error("That code isn't valid or has expired. Request a new one.");
      }
      await db.update(s.otpCodes).set({ usedAt: new Date() }).where(eq(s.otpCodes.id, otp.id));
      await db
        .update(s.userCredentials)
        .set({ passwordHash: scryptHash(input.password), emailVerified: true })
        .where(eq(s.userCredentials.email, email));
      return { ok: true };
    }),

  /** Logged-in but unverified → resend verification code. */
  resendVerification: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.userId, Number(ctx.user.id))).limit(1);
    if (!cred) return { sent: true, verified: true }; // OAuth users are verified by the provider
    if (cred.emailVerified) return { sent: true, verified: true };
    await issueOtp(cred.email, "VERIFY", ctx.req.headers, ctx.user.name ?? undefined);
    return { sent: true, verified: false };
  }),

  /** Verification status for the soft-gate banner. */
  verificationStatus: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.userId, Number(ctx.user.id))).limit(1);
    // No credential row → OAuth account, provider-verified.
    return { verified: cred ? cred.emailVerified : true, email: cred?.email ?? ctx.user.email ?? null };
  }),

  /* ---- Admin TOTP 2FA ---- */
  totpBegin: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.userId, Number(ctx.user.id))).limit(1);
    if (!cred) throw new Error("Two-factor setup is available for password-based accounts.");
    const secret = genTotpSecret();
    await db.update(s.userCredentials).set({ totpSecret: secret, totpEnabled: false }).where(eq(s.userCredentials.id, cred.id));
    const label = encodeURIComponent(cred.email);
    return { secret, otpauthUrl: `otpauth://totp/Aquifert:${label}?secret=${secret}&issuer=Aquifert` };
  }),

  totpEnable: authedQuery
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [cred] = await db.select().from(s.userCredentials).where(eq(s.userCredentials.userId, Number(ctx.user.id))).limit(1);
      if (!cred?.totpSecret) throw new Error("Start two-factor setup first.");
      const valid = [0, -1, 1].some((o) => totpNow(cred.totpSecret!, o) === input.code);
      if (!valid) throw new Error("That code isn't right, check your authenticator app and try again.");
      await db.update(s.userCredentials).set({ totpEnabled: true }).where(eq(s.userCredentials.id, cred.id));
      return { enabled: true };
    }),
});

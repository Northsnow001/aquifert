import "server-only";

import { createSign } from "node:crypto";
import { metricMap, minutesFrom, rowsOf, type LiveAnalytics, type LiveAnalyticsFailure, type RealtimeReport } from "@/lib/ga-realtime-shared";

/** The Aquifert GA4 property from the Analytics URL (p564333880). Override with GA4_PROPERTY_ID. */
const DEFAULT_PROPERTY = "564333880";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const num = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function propertyId() {
  const value = process.env.GA4_PROPERTY_ID?.trim() || DEFAULT_PROPERTY;
  return /^\d+$/.test(value) ? value : "";
}

function readerConfigured() {
  return Boolean(propertyId() && process.env.GA4_CLIENT_EMAIL?.trim() && privateKey());
}

function privateKey() {
  const raw = process.env.GA4_PRIVATE_KEY?.trim() ?? "";
  if (!raw) return "";
  const unquoted = raw.replace(/^["']|["']$/g, "");
  return unquoted.includes("\\n") ? unquoted.replace(/\\n/g, "\n") : unquoted;
}

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const email = process.env.GA4_CLIENT_EMAIL?.trim() ?? "";
  const key = privateKey();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const assertion = `${header}.${payload}.${signer.sign(key).toString("base64url")}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error_description?: string } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description || `Google refused the reader sign-in (${response.status}).`);
  }
  token = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

/** Active visitors, pages and events from the last 30 minutes. Never throws. */
export async function liveAnalytics(): Promise<LiveAnalytics | LiveAnalyticsFailure> {
  if (!readerConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY on the host, and give that Google reader access to the Aquifert property.",
    };
  }
  try {
    const bearer = await accessToken();
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId()}:batchRunRealtimeReports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          { metrics: [{ name: "activeUsers" }, { name: "eventCount" }, { name: "screenPageViews" }] },
          {
            dimensions: [{ name: "minutesAgo" }],
            metrics: [{ name: "activeUsers" }],
            minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
          },
          {
            dimensions: [{ name: "unifiedScreenName" }],
            metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
            limit: 6,
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          },
          {
            dimensions: [{ name: "eventName" }],
            metrics: [{ name: "eventCount" }],
            limit: 6,
            orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          },
          {
            dimensions: [{ name: "deviceCategory" }],
            metrics: [{ name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const body = (await response.json().catch(() => null)) as { reports?: RealtimeReport[]; error?: { message?: string; status?: string } } | null;
    if (!response.ok || !body?.reports) {
      const denied = response.status === 403 || body?.error?.status === "PERMISSION_DENIED";
      return {
        ok: false,
        reason: denied ? "denied" : "failed",
        message: denied
          ? "The Google reader cannot view this property yet. In Analytics, open Property access management and add its email as a Viewer."
          : body?.error?.message || `Google Analytics returned ${response.status}.`,
      };
    }
    const [totals, minutes, screens, events, devices] = body.reports;
    const total = metricMap(totals);
    return {
      ok: true,
      at: new Date().toISOString(),
      activeUsers: total.activeUsers ?? 0,
      events: total.eventCount ?? 0,
      views: total.screenPageViews ?? 0,
      minutes: minutesFrom(minutes),
      screens: rowsOf(screens).map((row) => ({
        name: String(row.unifiedScreenName || "Untitled"),
        users: num(String(row.activeUsers)),
        views: num(String(row.screenPageViews)),
      })),
      eventNames: rowsOf(events).map((row) => ({ name: String(row.eventName || "event"), count: num(String(row.eventCount)) })),
      devices: rowsOf(devices).map((row) => ({ name: String(row.deviceCategory || "unknown"), users: num(String(row.activeUsers)) })),
    };
  } catch (error) {
    return { ok: false, reason: "failed", message: error instanceof Error ? error.message : "The live report could not be read." };
  }
}

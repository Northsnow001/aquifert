/**
 * Google Analytics 4. Nothing is sent until three things are true:
 * a measurement ID is configured, the visitor has allowed analytics cookies,
 * and this is a production build (or NEXT_PUBLIC_GA_DEBUG=1).
 * Names, email addresses and phone numbers are never included.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export type ContentGroup = "Marketing" | "Account" | "Hub" | "Admin";

export function gaConfigured() {
  return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
}

/** Production traffic, plus a local DebugView session when explicitly asked. */
export function gaShouldSend() {
  return process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_GA_DEBUG === "1";
}

export function contentGroup(pathname: string): ContentGroup {
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/hub")) return "Hub";
  if (/^\/(login|register|verify-email|set-password|forgot-password|reset-password|session-expired)(\/|$)/.test(pathname)) return "Account";
  return "Marketing";
}

/** Drops empty values and anything that looks like an email address. */
export function cleanParams(params: AnalyticsParams = {}) {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (typeof value === "string") {
      const text = value.replace(/\s+/g, " ").trim().slice(0, 100);
      if (!text || EMAIL.test(text)) continue;
      out[key] = text;
      continue;
    }
    out[key] = value;
  }
  return out;
}

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let allowed = false;

export function analyticsAllowed() {
  return allowed;
}

export function loadGoogleAnalytics() {
  if (!gaConfigured() || typeof window === "undefined" || window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // Google only records the Arguments object. A plain array is ignored, so no visit is sent.
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    ...(process.env.NEXT_PUBLIC_GA_DEBUG === "1" ? { debug_mode: true } : {}),
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function setAnalyticsAllowed(next: boolean) {
  allowed = next && gaConfigured() && gaShouldSend();
  if (allowed) loadGoogleAnalytics();
}

/** Stops further events and clears the Analytics cookies after a visitor opts out. */
export function stopGoogleAnalytics() {
  allowed = false;
  if (typeof document === "undefined") return;
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name?.startsWith("_ga")) document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}

export function track(name: string, params?: AnalyticsParams) {
  if (!allowed || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, { ...cleanParams(params), transport_type: "beacon" });
}

export function trackPage(pathname: string, search = "") {
  if (!allowed || typeof window === "undefined" || !window.gtag) return;
  const page_path = `${pathname}${search}`;
  window.gtag("event", "page_view", {
    page_path,
    page_location: `${window.location.origin}${page_path}`,
    page_title: document.title,
    content_group: contentGroup(pathname),
    send_to: GA_MEASUREMENT_ID,
  });
}

/** A Supabase user id, never an email. Lets GA4 stitch a person's visits together. */
export function identify(userId: string) {
  if (!allowed || typeof window === "undefined" || !window.gtag) return;
  if (!/^[0-9a-f-]{16,}$/i.test(userId)) return;
  window.gtag("set", { user_id: userId });
}

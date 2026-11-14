"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { getConsent } from "@/marketing/lib/consent";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/marketing/lib/supabase";
import { analyticsAllowed, identify, setAnalyticsAllowed, stopGoogleAnalytics, track, trackPage } from "@/lib/analytics";

/** Loads GA4 after analytics consent, then records each screen the visitor opens. */
export function GoogleAnalytics() {
  const pathname = usePathname() ?? "/";
  const path = useRef(pathname);
  const allowed = useRef(false);
  const listening = useRef(false);
  path.current = pathname;

  useEffect(() => {
    const sync = () => {
      const yes = getConsent()?.analytics === true;
      const turnedOn = yes && !allowed.current;
      allowed.current = yes;
      if (yes) {
        setAnalyticsAllowed(true);
        if (turnedOn && listening.current) trackPage(path.current, window.location.search);
      } else stopGoogleAnalytics();
    };
    sync();
    listening.current = true;
    window.addEventListener("aq:consent-recorded", sync);
    return () => window.removeEventListener("aq:consent-recorded", sync);
  }, []);

  useEffect(() => {
    if (!allowed.current) return;
    trackPage(pathname, window.location.search);
    if (!analyticsAllowed() || !isSupabaseBrowserConfigured()) return;
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user?.id) identify(data.user.id);
      })
      .catch(() => undefined);
  }, [pathname]);

  useReportWebVitals((metric) => {
    if (!allowed.current) return;
    if (metric.name !== "LCP" && metric.name !== "INP" && metric.name !== "CLS") return;
    const value = metric.name === "CLS" ? Math.round(metric.value * 1000) : Math.round(metric.value);
    track("web_vital", { metric_name: metric.name, metric_value: value, metric_rating: "rating" in metric ? String(metric.rating) : "" });
  });

  return null;
}

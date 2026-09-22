/**
 * CookieConsent, bottom-anchored banner (UK GDPR / PECR).
 * Accept / Reject given equal visual weight; "Manage preferences" expands a
 * category panel (Strictly necessary always on; Analytics + Marketing
 * default OFF). Re-prompts after 12 months or on policy-version change.
 * A "Cookie preferences" footer link (window event) reopens it at any time.
 */
import { useEffect, useState } from "react";
import { COOKIE_POLICY_VERSION, getConsent, recordConsent } from "@/lib/consent";

export const OPEN_COOKIE_PREFS_EVENT = "aq:open-cookie-preferences";

const CATEGORIES = [
  {
    key: "necessary",
    label: "Strictly necessary",
    desc: "Required for the site to function, session, security and this consent record. Always on.",
    locked: true,
  },
  {
    key: "analytics",
    label: "Analytics",
    desc: "Anonymous usage measurement that helps us improve the platform.",
    locked: false,
  },
  {
    key: "marketing",
    label: "Marketing",
    desc: "Remembers your interests so we can show relevant market updates and offers.",
    locked: false,
  },
] as const;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!getConsent()) setVisible(true);
    const reopen = () => {
      const c = getConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setManaging(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
  }, []);

  if (!visible) return null;

  const choose = (a: boolean, m: boolean) => {
    recordConsent(a, m);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("aq:consent-recorded", { detail: { analytics: a, marketing: m } }));
  };

  const btn =
    "inline-flex h-9 items-center justify-center rounded px-4 text-[13px] font-semibold transition-colors";

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[70] bg-navy-900 text-slate-200 shadow-[0_-4px_24px_rgb(0_0_0/0.35)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        {!managing ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <p className="text-[12.5px] leading-relaxed text-slate-300 sm:max-w-xl">
              We use cookies to run the site and, with your permission, to measure usage and tailor
              market updates. Read our{" "}
              <a href="/#/cookie-policy" className="text-white underline underline-offset-2">
                Cookie Policy
              </a>{" "}
              and{" "}
              <a href="/#/privacy-policy" className="text-white underline underline-offset-2">
                Privacy Policy
              </a>
              .
            </p>
            <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
              <button type="button" onClick={() => choose(true, true)} className={`${btn} bg-teal-500 text-white hover:bg-teal-400`}>
                Accept all
              </button>
              <button
                type="button"
                onClick={() => choose(false, false)}
                className={`${btn} border border-white/40 bg-transparent text-white hover:bg-white/10`}
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() => setManaging(true)}
                className={`${btn} border border-white/40 bg-transparent text-white hover:bg-white/10`}
              >
                Manage preferences
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Cookie preferences</h2>
              <span className="text-[11px] text-slate-400">Policy version {COOKIE_POLICY_VERSION}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <div key={c.key} className="rounded border border-white/15 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-white">{c.label}</span>
                    {c.locked ? (
                      <span className="text-[11px] text-slate-400">Always on</span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={c.key === "analytics" ? analytics : marketing}
                        aria-label={`${c.label} cookies`}
                        onClick={() =>
                          c.key === "analytics" ? setAnalytics((v) => !v) : setMarketing((v) => !v)
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          (c.key === "analytics" ? analytics : marketing) ? "bg-teal-500" : "bg-white/25"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                            (c.key === "analytics" ? analytics : marketing) ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => choose(analytics, marketing)} className={`${btn} bg-teal-500 text-white hover:bg-teal-400`}>
                Save my preferences
              </button>
              <button type="button" onClick={() => choose(true, true)} className={`${btn} border border-white/40 text-white hover:bg-white/10`}>
                Accept all
              </button>
              <button type="button" onClick={() => choose(false, false)} className={`${btn} border border-white/40 text-white hover:bg-white/10`}>
                Reject all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

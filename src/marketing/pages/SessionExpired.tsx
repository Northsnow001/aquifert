"use client";

import { useState, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "@/marketing/router";
import { Clock, Loader2 } from "lucide-react";
import { Logo } from "@/marketing/components/shared/Logo";
import { Button } from "@/marketing/components/ui/button";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/marketing/lib/supabase";
import { REAUTH_EMAIL_KEY, safeReturnPath } from "@/lib/idle-timeout";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

const noSubscription = () => () => {};
const readSavedEmail = () => {
  try {
    return sessionStorage.getItem(REAUTH_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
};

const friendly = (message: string) =>
  /invalid login credentials/i.test(message) ? "That password is not right. Try again, or reset it below." : message;

export default function SessionExpired() {
  const [params] = useSearchParams();
  const destination = safeReturnPath(params.get("redirect_to")) ?? "/hub";
  const savedEmail = useSyncExternalStore(noSubscription, readSavedEmail, () => null);
  const [typedEmail, setTypedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const email = (savedEmail || typedEmail).trim().toLowerCase();
  const loginHref = `/login?redirect_to=${encodeURIComponent(destination)}`;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSupabaseBrowserConfigured()) {
      setError("Sign-in is not configured on this site yet.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { data, error: signError } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
      if (signError) throw signError;
      if (!data.session) throw new Error("No session returned. Try again.");
      try {
        sessionStorage.removeItem(REAUTH_EMAIL_KEY);
      } catch {
        // Nothing to clear.
      }
      window.location.assign(destination);
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : "Sign-in failed."));
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <Link to="/" aria-label="Aquifert home" className="inline-block transition-opacity hover:opacity-80">
          <Logo size={36} />
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-navy-900">Your session timed out</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            For your security, we signed you out after 15 minutes without activity. Enter your password to pick up where you left off.
          </p>

          <form className="mt-6" onSubmit={onSubmit}>
            {savedEmail ? (
              <div className="rounded-lg bg-slate-50 px-3.5 py-2.5">
                <p className="text-[12px] font-medium text-slate-500">Account</p>
                <p className="truncate text-sm font-semibold text-navy-900">{savedEmail}</p>
                <input type="email" autoComplete="username" value={savedEmail} readOnly hidden />
              </div>
            ) : (
              <>
                <label htmlFor="reauth-email" className="text-[13px] font-semibold text-navy-900">
                  Work email
                </label>
                <input
                  id="reauth-email"
                  type="email"
                  autoComplete="username"
                  value={typedEmail}
                  onChange={(e) => setTypedEmail(e.target.value)}
                  className={`${inputCls} mt-1`}
                  placeholder="name@company.com"
                  required
                />
              </>
            )}
            <div className="mt-4 flex items-center justify-between">
              <label htmlFor="reauth-password" className="text-[13px] font-semibold text-navy-900">
                Password
              </label>
              <Link to="/forgot-password" className="text-[12.5px] font-medium text-navy-700 underline-offset-2 hover:underline">
                Forgot your password?
              </Link>
            </div>
            <input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} mt-1`}
              autoFocus
              required
            />
            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending || !email} className="mt-5 w-full bg-teal-500 text-white hover:bg-teal-400" size="lg">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Continue"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-slate-600">
          Not you?{" "}
          <Link to={loginHref} className="font-semibold text-navy-700 underline-offset-2 hover:underline">
            Sign in with another account
          </Link>
        </p>
      </div>
    </div>
  );
}

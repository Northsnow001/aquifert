import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { safeRedirectPath } from "@/lib/redirect";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

/** Exploratory phase: form stays visible but no credentials are accepted. */
const LOGIN_LOCKED_MESSAGE = "Sign-in is not available yet. Please check back soon.";

export default function Login() {
  const [params] = useSearchParams();
  // Keep redirect_to parsing so the URL shape stays stable when auth is re-enabled.
  void safeRedirectPath(params.get("redirect_to") ?? undefined);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honey, setHoney] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left: form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" aria-label="Aquifert home" className="inline-block transition-opacity hover:opacity-80">
            <Logo size={36} />
          </Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-600">Access your Aquifert ONE trading portal.</p>

          <form
            className="mt-7"
            onSubmit={(e) => {
              e.preventDefault();
              // Honeypot: bots get a silent "success" with no session.
              if (honey) {
                setError(null);
                return;
              }
              setError(LOGIN_LOCKED_MESSAGE);
            }}
          >
            {/* honeypot, invisible to humans, bots fill it */}
            <input
              type="text"
              value={honey}
              onChange={(e) => setHoney(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              name="company_website"
            />
            <label htmlFor="login-email" className="text-[13px] font-semibold text-navy-900">
              Work email
            </label>
            <input
              id="login-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputCls} mt-1`}
              placeholder="name@company.com"
            />
            <div className="mt-4 flex items-center justify-between">
              <label htmlFor="login-password" className="text-[13px] font-semibold text-navy-900">
                Password
              </label>
              <Link to="/forgot-password" className="text-[12.5px] font-medium text-navy-700 underline-offset-2 hover:underline">
                Forgot your password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} mt-1`}
            />
            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="mt-5 w-full bg-teal-500 text-white hover:bg-teal-400" size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-slate-600">
            New to Aquifert?{" "}
            <Link to="/register" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right: brand imagery */}
      <div className="relative hidden w-1/2 overflow-hidden bg-navy-900 lg:block">
        <img
          src="/media/hero-ship-containers.jpg"
          alt="Container ship loaded with fertilizer cargo at port"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-navy-950/45" aria-hidden />
        <div className="relative flex h-full flex-col justify-end p-12">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
            Fertilizer trading, <span className="text-teal-300">reimagined.</span>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            Cost-to-cost sourcing, AI-drafted quotes, live container tracking and market
            intelligence, one command center for the global fertilizer trade.
          </p>
          <p className="mt-8 text-[11px] text-white/40">© {new Date().getFullYear()} Aquifert Ltd · London</p>
        </div>
      </div>
    </div>
  );
}

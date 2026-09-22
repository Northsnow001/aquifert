import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { trpc } from "@/providers/trpc";
import { safeRedirectPath } from "@/lib/redirect";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  if (!kimiAuthUrl || !appID) return null;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", btoa(redirectUri));
  return url.toString();
}

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true" || import.meta.env.VITE_DEMO_MODE === "1";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = safeRedirectPath(params.get("redirect_to") ?? undefined);

  const [email, setEmail] = useState(DEMO_MODE ? "demo@aquifert.com" : "");
  const [password, setPassword] = useState(DEMO_MODE ? "demo1234" : "");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [honey, setHoney] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const login = trpc.identity.login.useMutation({
    onSuccess: async (r) => {
      if (r.totpRequired) {
        setNeedsTotp(true);
        setError(null);
        return;
      }
      await utils.invalidate();
      navigate(redirectTo === "/" ? "/onboarding" : redirectTo);
    },
    onError: (e) => setError(e.message),
  });

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

          {DEMO_MODE && (
            <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-3 text-[13px] text-navy-900">
              <p className="font-semibold">Client review login</p>
              <p className="mt-1 text-slate-600">
                Email <span className="font-mono text-navy-800">demo@aquifert.com</span>
                {" · "}
                Password <span className="font-mono text-navy-800">demo1234</span>
              </p>
            </div>
          )}

          {getOAuthUrl() && (
            <Button
              className="mt-7 w-full bg-navy-600 hover:bg-navy-700 aqf-btn-press"
              size="lg"
              onClick={() => {
                const url = getOAuthUrl();
                if (url) window.location.href = url;
              }}
            >
              Continue with Kimi
            </Button>
          )}

          <div className={`${getOAuthUrl() ? "my-5" : "mt-7 mb-5"} flex items-center gap-3`} aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400">or with work email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              login.mutate({ identifier: email, password, totp: totp || undefined, redirectTo, honey });
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
            {needsTotp && (
              <div className="mt-4">
                <label htmlFor="login-totp" className="text-[13px] font-semibold text-navy-900">
                  Authentication code
                </label>
                <input
                  id="login-totp"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  className={`${inputCls} mt-1 font-mono tracking-[0.3em]`}
                  placeholder="6-digit code"
                />
                <p className="mt-1 text-[12px] text-slate-500">
                  This administrator account requires two-factor authentication.
                </p>
              </div>
            )}
            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={login.isPending}
              className="mt-5 w-full bg-teal-500 text-white hover:bg-teal-400"
              size="lg"
            >
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-slate-600">
            New to Aquifert?{" "}
            <Link to="/register" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            Legacy username sign-in still works, enter your username in the email field.
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

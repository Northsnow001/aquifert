import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { safeRedirectPath } from "@/lib/redirect";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";
import { trpc } from "@/providers/trpc";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

const NOT_CONFIGURED =
  "Sign-in is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Supabase Auth.";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = safeRedirectPath(params.get("redirect_to") ?? undefined);
  const utils = trpc.useUtils();

  const passwordSaved = params.get("set") === "1";
  const [email, setEmail] = useState(() => params.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [honey, setHoney] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const establish = trpc.auth.establishSession.useMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honey) {
      setError(null);
      return;
    }
    if (!isSupabaseBrowserConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signError) throw signError;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("No session returned. Confirm your email if required, then try again.");

      await establish.mutateAsync({ accessToken });
      await utils.invalidate();
      navigate(redirectTo === "/" ? "/onboarding" : redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" aria-label="Aquifert home" className="inline-block transition-opacity hover:opacity-80">
            <Logo size={36} />
          </Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-600">Access your Aquifert ONE trading portal.</p>

          <form className="mt-7" onSubmit={onSubmit}>
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
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputCls} mt-1`}
              placeholder="name@company.com"
              required
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
              required
            />
            {passwordSaved && !error && (
              <p className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[13px] text-teal-900" role="status">
                Password saved. Sign in with your email and new password to continue.
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={pending}
              className="mt-5 w-full bg-teal-500 text-white hover:bg-teal-400"
              size="lg"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Sign in"}
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

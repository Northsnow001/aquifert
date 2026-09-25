/**
 * Password reset after clicking the Supabase ConfirmationURL in email.
 * Expects a recovery session (hash tokens or PKCE ?code=), then updateUser.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import {
  authInputCls,
  isBreachedPassword,
  passwordStrength,
} from "@/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";

const errCls = "mt-1 text-[12px] text-red-700";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const s = passwordStrength(password);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setBootError("Password reset is not configured yet.");
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowser();

    const markReady = (sessionEmail?: string | null) => {
      if (cancelled) return;
      setEmail(sessionEmail ?? null);
      setReady(true);
      setBootError(null);
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setBootError(message);
      setReady(false);
    };

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // Clean PKCE params from the address bar without a full reload.
          url.searchParams.delete("code");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          markReady(data.session?.user?.email ?? null);
          return;
        }

        if (tokenHash && (type === "recovery" || type === "email")) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === "recovery" ? "recovery" : "email",
          });
          if (error) throw error;
          markReady(data.session?.user?.email ?? null);
          return;
        }

        // Implicit / detectSessionInUrl path (hash tokens).
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          markReady(data.session.user.email);
          return;
        }

        // Brief wait for supabase-js to finish parsing the URL hash.
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        const again = await supabase.auth.getSession();
        if (again.data.session) {
          markReady(again.data.session.user.email);
          return;
        }

        fail("This reset link is invalid or has expired. Request a new one.");
      } catch (err) {
        fail(err instanceof Error ? err.message : "Could not open the reset link.");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        markReady(session.user.email);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (password.length < 12) e.password = "Use at least 12 characters.";
    else if (isBreachedPassword(password)) e.password = "This password appears in known breaches, choose another.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setErrors({});
    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const msg = updateError.message || "Could not save your password.";
        if (/same|identical|different/i.test(msg)) {
          throw new Error("Choose a password you haven't used for this account yet.");
        }
        if (/weak|leaked|pwned|breach/i.test(msg)) {
          throw new Error("That password is too weak or appears in known breaches. Choose a longer unique phrase.");
        }
        if (/length|characters|short/i.test(msg)) {
          throw new Error("Password does not meet the minimum length required by Auth settings.");
        }
        throw new Error(msg);
      }

      // Force a clean sign-in with the new password (do not leave recovery session open).
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }

      const q = new URLSearchParams({ reset: "1" });
      if (email) q.set("email", email);
      navigate(`/login?${q.toString()}`, { replace: true });
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Could not save your password.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <Link to="/" aria-label="Aquifert home" className="inline-block">
            <Logo size={36} />
          </Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Reset link expired</h1>
          <p className="mt-2 text-sm text-slate-600" role="alert">
            {bootError}
          </p>
          <Link
            to="/forgot-password"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-navy-700 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Request a new link
          </Link>
          <p className="mt-4 text-center text-[13px] text-slate-600">
            <Link to="/login" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-navy-700" aria-label="Opening reset link" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Aquifert home" className="inline-block">
          <Logo size={36} />
        </Link>

        <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {email ? (
            <>
              Resetting password for <span className="font-semibold text-navy-900">{email}</span>.
            </>
          ) : (
            <>Choose a new password for your Aquifert account.</>
          )}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="rp-password" className="text-[13px] font-semibold text-navy-900">
              New password *
            </label>
            <input
              id="rp-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={`${authInputCls} mt-1`}
              aria-describedby="rp-pw-hint"
            />
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1 flex-1 rounded-full ${s.score >= n ? s.color : "bg-slate-200"}`}
                />
              ))}
            </div>
            <p
              id="rp-pw-hint"
              className={`mt-1 text-[12px] ${s.score === 0 && password ? "text-red-700" : "text-slate-500"}`}
            >
              {s.label || "Minimum 12 characters. Length matters more than symbols."}
            </p>
            {errors.password && <p className={errCls}>{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="rp-confirm" className="text-[13px] font-semibold text-navy-900">
              Confirm password *
            </label>
            <input
              id="rp-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              className={`${authInputCls} mt-1`}
            />
            {errors.confirm && <p className={errCls}>{errors.confirm}</p>}
          </div>
          {errors.form && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
              role="alert"
            >
              {errors.form}
            </p>
          )}
          <Button
            onClick={submit}
            disabled={submitting}
            className="h-11 w-full bg-navy-700 text-white hover:bg-navy-800"
            size="lg"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              "Save new password"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

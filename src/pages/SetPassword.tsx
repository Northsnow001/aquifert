/**
 * Step 3 — Set password after email OTP verification, then enter the portal.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import {
  authInputCls,
  clearSignupPending,
  isBreachedPassword,
  passwordStrength,
  readSignupPending,
} from "@/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";
import { trpc } from "@/providers/trpc";

const errCls = "mt-1 text-[12px] text-red-700";

export default function SetPassword() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const pending = readSignupPending();
  const establish = trpc.auth.establishSession.useMutation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const s = passwordStrength(password);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      navigate("/register", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await getSupabaseBrowser().auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate(pending?.email ? `/verify-email?email=${encodeURIComponent(pending.email)}` : "/register", {
          replace: true,
        });
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, pending?.email]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (password.length < 12) e.password = "Use at least 12 characters.";
    else if (isBreachedPassword(password)) e.password = "This password appears in known breaches, choose another.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setErrors({});
    let step = "start";
    try {
      const supabase = getSupabaseBrowser();
      step = "session";
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData.session;
      if (!session?.access_token) throw new Error("Your verification session expired. Request a new code.");

      step = "refresh";
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      step = "update";
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const msg = updateError.message || "Could not save your password.";
        // Common Supabase Auth 422s
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

      const { data: refreshed } = await supabase.auth.getSession();
      const accessToken = refreshed.session?.access_token ?? session.access_token;

      step = "establish";
      try {
        await establish.mutateAsync({
          accessToken,
          profile: pending
            ? {
                name: pending.name,
                company: pending.company,
                country: pending.country,
                phone: pending.phone,
              }
            : undefined,
        });
      } catch (sessionErr) {
        const raw =
          sessionErr instanceof Error ? sessionErr.message : String(sessionErr ?? "");
        // #region agent log
        fetch("http://127.0.0.1:7493/ingest/4e11581d-7f60-4e24-b571-b73ce990ecc0",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"9db8e3"},body:JSON.stringify({sessionId:"9db8e3",runId:"post-fix",hypothesisId:"D",location:"SetPassword.tsx:establish",message:"establishSession failed",data:{name:sessionErr instanceof Error?sessionErr.name:"unknown",message:raw},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (/not valid JSON|Unexpected token|Unexpected end of JSON|Failed to fetch|404|HTML/i.test(raw)) {
          throw new Error(
            "Password was saved, but the app server could not start your session. Try signing in from the login page.",
          );
        }
        throw sessionErr instanceof Error
          ? sessionErr
          : new Error("Password was saved, but session setup failed. Try signing in.");
      }
      step = "done";
      clearSignupPending();
      await utils.invalidate();
      navigate("/onboarding");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your password.";
      const status = err && typeof err === "object" && "status" in err ? Number((err as { status?: number }).status) : undefined;
      // #region agent log
      fetch("http://127.0.0.1:7493/ingest/4e11581d-7f60-4e24-b571-b73ce990ecc0",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"9db8e3"},body:JSON.stringify({sessionId:"9db8e3",runId:"post-fix",hypothesisId:step==="refresh"?"C":step==="establish"?"D":"C",location:"SetPassword.tsx:submit",message:"set-password step failed",data:{step,name:err instanceof Error?err.name:"unknown",message,status},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setErrors({
        form: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-navy-700" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Aquifert home" className="inline-block">
          <Logo size={36} />
        </Link>

        <p className="mt-8 text-[12px] font-semibold uppercase tracking-wide text-teal-700">
          Step 3 of 3
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">Set your password</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Email verified
          {pending?.email ? (
            <>
              {" "}
              for <span className="font-semibold text-navy-900">{pending.email}</span>
            </>
          ) : null}
          . Choose a password to sign in next time.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="sp-password" className="text-[13px] font-semibold text-navy-900">
              Password *
            </label>
            <input
              id="sp-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={`${authInputCls} mt-1`}
              aria-describedby="sp-pw-hint"
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
              id="sp-pw-hint"
              className={`mt-1 text-[12px] ${s.score === 0 && password ? "text-red-700" : "text-slate-500"}`}
            >
              {s.label || "Minimum 12 characters. Length matters more than symbols."}
            </p>
            {errors.password && <p className={errCls}>{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="sp-confirm" className="text-[13px] font-semibold text-navy-900">
              Confirm password *
            </label>
            <input
              id="sp-confirm"
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
              "Continue to Aquifert"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

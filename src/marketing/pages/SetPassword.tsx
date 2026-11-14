"use client";

/**
 * Set a password after email OTP (self sign-up) or after an admin invitation link.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/marketing/router";
import { Loader2 } from "lucide-react";
import { Button } from "@/marketing/components/ui/button";
import { Logo } from "@/marketing/components/shared/Logo";
import {
  authInputCls,
  clearSignupPending,
  isBreachedPassword,
  passwordStrength,
  readSignupPending,
} from "@/marketing/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/marketing/lib/supabase";
import { safeReturnPath } from "@/lib/idle-timeout";
import type { EmailOtpType } from "@supabase/supabase-js";

const errCls = "mt-1 text-[12px] text-red-700";
const INVITE_OTP: EmailOtpType[] = ["invite", "signup", "magiclink"];

export default function SetPassword() {
  const navigate = useNavigate();
  const [pending] = useState(() => (typeof window === "undefined" ? null : readSignupPending()));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<{ hash: string; type: EmailOtpType } | null>(null);
  const [fromInvite, setFromInvite] = useState(false);

  const s = passwordStrength(password);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setBootError("Sign-in is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setReady(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowser();

    const markReady = (sessionEmail?: string | null, invited = false) => {
      if (cancelled) return;
      setEmail(sessionEmail ?? pending?.email ?? null);
      setFromInvite(invited);
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
        const type = url.searchParams.get("type") as EmailOtpType | null;
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const hashError = hash.get("error_description") ?? url.searchParams.get("error_description");
        if (hashError) throw new Error(hashError.replace(/\+/g, " "));

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          window.history.replaceState({}, "", `${url.pathname}${url.search}`);
          markReady(
            data.session?.user?.email ?? null,
            hash.get("type") === "invite" || type === "invite" || Boolean(data.session?.user?.invited_at),
          );
          return;
        }

        if (code) {
          const existing = await supabase.auth.getSession();
          const { data, error } = existing.data.session ? existing : await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          url.searchParams.delete("code");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          markReady(data.session?.user?.email ?? null, type === "invite" || Boolean(data.session?.user?.invited_at));
          return;
        }

        if (tokenHash && type && INVITE_OTP.includes(type)) {
          setInviteToken({ hash: tokenHash, type });
          window.history.replaceState({}, "", url.pathname);
          markReady(null, true);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          markReady(data.session.user.email);
          return;
        }

        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        const again = await supabase.auth.getSession();
        if (again.data.session) {
          markReady(again.data.session.user.email);
          return;
        }

        if (pending?.channel === "both" && pending.email && pending.phone) {
          navigate(
            `/verify-email?email=${encodeURIComponent(pending.email)}&phone=${encodeURIComponent(pending.phone)}`,
            { replace: true },
          );
          return;
        }

        if (pending?.channel === "sms" && pending.phone) {
          navigate(`/verify-email?phone=${encodeURIComponent(pending.phone)}`, { replace: true });
          return;
        }

        if (pending?.email) {
          navigate(`/verify-email?email=${encodeURIComponent(pending.email)}`, { replace: true });
          return;
        }
        fail("This invitation link is invalid or has expired. Ask an admin to send a new one, or create an account.");
      } catch (err) {
        fail(err instanceof Error ? err.message : "Could not open the invitation.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, pending?.channel, pending?.email, pending?.phone]);

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
      let sessionEmail = email;

      if (inviteToken) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: inviteToken.hash,
          type: inviteToken.type,
        });
        if (verifyError || !data.session) {
          setBootError("This invitation link is invalid or has expired. Ask an admin to send a new one.");
          return;
        }
        setInviteToken(null);
        sessionEmail = data.session.user.email ?? null;
        setEmail(sessionEmail);
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData.session;
      if (!session?.access_token) {
        throw new Error("Your verification session expired. Request a new code or invitation.");
      }

      // Do not refresh first — a failed refresh previously aborted the form before the password was saved.
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

      if (pending) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: pending.name,
              company: pending.company,
              country: pending.country,
              phone: pending.phone ?? null,
            },
          });
          if (pending.name) {
            await supabase.from("profiles").update({ full_name: pending.name }).eq("id", session.user.id);
          }
        } catch {
          /* ignore */
        }
      }

      clearSignupPending();

      if (fromInvite || inviteToken) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        const q = new URLSearchParams({ set: "1" });
        if (sessionEmail) q.set("email", sessionEmail);
        navigate(`/login?${q.toString()}`, { replace: true });
        return;
      }

      window.location.assign(safeReturnPath(pending?.next) ?? "/hub");
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
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Invitation expired</h1>
          <p className="mt-2 text-sm text-slate-600" role="alert">
            {bootError}
          </p>
          <p className="mt-4 text-center text-[13px] text-slate-600">
            <Link to="/login" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Back to sign in
            </Link>
            {" · "}
            <Link to="/register" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    );
  }

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
          {fromInvite ? "Invitation" : "Step 3 of 3"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">Set your password</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {fromInvite ? "You were invited" : pending?.channel === "both" ? "Email and phone verified" : pending?.channel === "sms" ? "Phone verified" : "Email verified"}
          {email || pending?.email || pending?.phone ? (
            <>
              {" "}
              for <span className="font-semibold text-navy-900">{email || pending?.email || pending?.phone}</span>
            </>
          ) : null}
          . Choose a password, then sign in with it.
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
              fromInvite ? "Save password and sign in" : "Continue to Aquifert"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

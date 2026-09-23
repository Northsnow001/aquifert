/**
 * Step 2 — Enter the 6-digit code from the email.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { authInputCls, readSignupPending, saveSignupPending } from "@/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";

const CODE_LEN = 6;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pending = readSignupPending();
  const emailFromQuery = (params.get("email") ?? "").trim().toLowerCase();
  const email = (pending?.email || emailFromQuery).toLowerCase();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const code = digits.join("");

  const setDigitAt = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      // Paste full code
      const chars = cleaned.slice(0, CODE_LEN).split("");
      const next = Array(CODE_LEN).fill("");
      chars.forEach((c, i) => {
        next[i] = c;
      });
      setDigits(next);
      const focusAt = Math.min(chars.length, CODE_LEN - 1);
      inputsRef.current[focusAt]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = cleaned.slice(-1);
    setDigits(next);
    if (cleaned && index < CODE_LEN - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    if (code.length !== CODE_LEN) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!isSupabaseBrowserConfigured()) {
      setError("Auth is not configured.");
      return;
    }
    setPendingVerify(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowser();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (verifyError) throw verifyError;
      if (!data.session) throw new Error("Verification succeeded but no session was created.");

      if (!pending && email) {
        saveSignupPending({
          email,
          name: (data.user?.user_metadata?.name as string) || email.split("@")[0] || "User",
          company: (data.user?.user_metadata?.company as string) || "",
          country: (data.user?.user_metadata?.country as string) || "",
          phone: (data.user?.user_metadata?.phone as string) || undefined,
        });
      }

      navigate("/set-password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setPendingVerify(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || !email) return;
    if (!isSupabaseBrowserConfigured()) return;
    setResending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowser();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: pending
            ? {
                name: pending.name,
                company: pending.company,
                country: pending.country,
                phone: pending.phone,
              }
            : undefined,
        },
      });
      if (otpError) throw otpError;
      setResendIn(60);
      setDigits(Array(CODE_LEN).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Aquifert home" className="inline-block">
          <Logo size={36} />
        </Link>

        <p className="mt-8 text-[12px] font-semibold uppercase tracking-wide text-teal-700">
          Step 2 of 3
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">Enter verification code</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          We sent a 6-digit code to <span className="font-semibold text-navy-900">{email}</span>.
          Copy it from your email and enter it below.
        </p>

        <div className="mt-8 flex justify-between gap-2" role="group" aria-label="Verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={i === 0 ? CODE_LEN : 1}
              value={d}
              onChange={(e) => setDigitAt(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className={`${authInputCls} h-14 w-12 px-0 text-center text-xl font-semibold tracking-widest sm:w-14`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={verify}
          disabled={pendingVerify || code.length !== CODE_LEN}
          className="mt-6 h-11 w-full bg-navy-700 text-white hover:bg-navy-800"
          size="lg"
        >
          {pendingVerify ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Verify email"}
        </Button>

        <p className="mt-5 text-center text-[13px] text-slate-600">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending || resendIn > 0}
            className="font-semibold text-navy-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Sending…"
              : resendIn > 0
                ? `Resend in ${resendIn}s`
                : "Resend code"}
          </button>
        </p>
        <p className="mt-3 text-center text-[13px]">
          <Link to="/register" className="font-medium text-slate-500 underline-offset-2 hover:underline">
            Use a different email
          </Link>
        </p>
      </div>
    </div>
  );
}

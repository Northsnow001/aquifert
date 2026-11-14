"use client";

/**
 * Step 2 — Enter the 6-digit code from the email.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/marketing/router";
import { Loader2 } from "lucide-react";
import { Button } from "@/marketing/components/ui/button";
import { Logo } from "@/marketing/components/shared/Logo";
import {
  authInputCls,
  phoneToE164,
  readSignupPending,
  saveSignupPending,
  type SignupChannel,
  type SignupPending,
} from "@/marketing/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/marketing/lib/supabase";
import { checkSignupAddress } from "@/app/(auth)/signup-check";
import { checkSignupEmail, DEFAULT_SIGNUP_RULES, signupCheck } from "@/lib/desk-settings/email-rules";
import { friendlyAuthError } from "@/marketing/lib/auth-errors";

const CODE_LEN = 6;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pending, setPendingSignup] = useState<SignupPending | null>(null);
  useEffect(() => setPendingSignup(readSignupPending()), []);
  const emailFromQuery = (params.get("email") ?? "").trim().toLowerCase();
  const phoneFromQuery = phoneToE164(params.get("phone") ?? "") ?? "";
  const channel: SignupChannel =
    pending?.channel === "both" || (Boolean(emailFromQuery) && Boolean(phoneFromQuery))
      ? "both"
      : pending?.channel === "sms" || (!emailFromQuery && Boolean(phoneFromQuery))
        ? "sms"
        : "email";
  const email = (pending?.email || emailFromQuery).toLowerCase();
  const phone = (pending?.channel === "sms" ? phoneToE164(pending.phone ?? "") : null) || phoneFromQuery;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [smsDigits, setSmsDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const smsInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = readSignupPending();
    const sms = channel === "sms" || channel === "both" || stored?.channel === "sms" || stored?.channel === "both";
    if (channel === "both" || stored?.channel === "both") {
      const storedPhone = phoneToE164(stored?.phone ?? "");
      if ((!email && !stored?.email) || (!phone && !storedPhone)) navigate("/register", { replace: true });
      return;
    }
    if (sms) {
      if (!phone && !phoneToE164(stored?.phone ?? "")) navigate("/register", { replace: true });
      return;
    }
    if (!email && !stored?.email) navigate("/register", { replace: true });
  }, [channel, email, navigate, phone]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const code = digits.join("");
  const smsCode = smsDigits.join("");

  const writeDigits = (
    current: string[],
    index: number,
    value: string,
    apply: (next: string[]) => void,
    refs: React.RefObject<(HTMLInputElement | null)[]>,
  ) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, CODE_LEN).split("");
      const next = Array(CODE_LEN).fill("");
      chars.forEach((c, i) => {
        next[i] = c;
      });
      apply(next);
      refs.current[Math.min(chars.length, CODE_LEN - 1)]?.focus();
      return;
    }
    const next = [...current];
    next[index] = cleaned.slice(-1);
    apply(next);
    if (cleaned && index < CODE_LEN - 1) refs.current[index + 1]?.focus();
  };

  const setDigitAt = (index: number, value: string) => writeDigits(digits, index, value, setDigits, inputsRef);
  const setSmsDigitAt = (index: number, value: string) => writeDigits(smsDigits, index, value, setSmsDigits, smsInputsRef);

  const onKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    current: string[],
    refs: React.RefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === "Backspace" && !current[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const verify = async () => {
    if (channel === "both" ? code.length !== CODE_LEN || smsCode.length !== CODE_LEN : code.length !== CODE_LEN) {
      setError(
        channel === "both"
          ? "Enter the code from your email and the code from the text message."
          : channel === "sms"
            ? "Enter the 6-digit code from the text message."
            : "Enter the 6-digit code from your email.",
      );
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
      if (channel === "both") {
        const existing = await supabase.auth.getSession();
        if (!existing.data.session) {
          const emailResult = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
          if (emailResult.error) throw emailResult.error;
          if (!emailResult.data.session) throw new Error("Verification succeeded but no session was created.");
        }
        const phoneResult = await supabase.auth.verifyOtp({ phone, token: smsCode, type: "sms" });
        if (phoneResult.error) throw phoneResult.error;
      } else {
        const { data, error: verifyError } =
          channel === "sms"
            ? await supabase.auth.verifyOtp({ phone, token: code, type: "sms" })
            : await supabase.auth.verifyOtp({ email, token: code, type: "email" });
        if (verifyError) throw verifyError;
        if (!data.session) throw new Error("Verification succeeded but no session was created.");
        if (!pending && (email || phone)) {
          saveSignupPending({
            email,
            name: (data.user?.user_metadata?.name as string) || (email ? email.split("@")[0] : "") || "User",
            company: (data.user?.user_metadata?.company as string) || "",
            country: (data.user?.user_metadata?.country as string) || "",
            phone: phone || (data.user?.user_metadata?.phone as string) || data.user?.phone || undefined,
            channel,
          });
        }
      }

      navigate("/set-password");
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Invalid or expired code.", "signup"));
    } finally {
      setPendingVerify(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || (channel === "sms" ? !phone : !email) || (channel === "both" && !phone)) return;
    if (!isSupabaseBrowserConfigured()) return;
    setResending(true);
    setError(null);
    try {
      if (channel === "both") {
        const response = await fetch("/api/signup/codes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            phone,
            name: pending?.name || "Member",
            company: pending?.company || "Company",
            country: pending?.country || "Country",
          }),
        });
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) throw new Error(body?.message || "Could not resend the codes.");
      } else {
        if (channel !== "sms") {
          const allowed = await checkSignupAddress(email).catch(() => signupCheck(checkSignupEmail(email, DEFAULT_SIGNUP_RULES)));
          if (!allowed.ok) throw new Error(allowed.message);
        }
        const profileData = pending
          ? {
              name: pending.name,
              company: pending.company,
              country: pending.country,
              phone: pending.phone,
            }
          : undefined;
        const supabase = getSupabaseBrowser();
        const { error: otpError } =
          channel === "sms"
            ? await supabase.auth.signInWithOtp({
                phone,
                options: { shouldCreateUser: true, channel: "sms", data: profileData },
              })
            : await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: true, data: profileData },
              });
        if (otpError) throw otpError;
      }
      setResendIn(60);
      setDigits(Array(CODE_LEN).fill(""));
      setSmsDigits(Array(CODE_LEN).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Could not resend code.", "signup"));
    } finally {
      setResending(false);
    }
  };

  if (channel === "both" ? !email || !phone : channel === "sms" ? !phone : !email) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Aquifert home" className="inline-block">
          <Logo size={36} />
        </Link>

        <p className="mt-8 text-[12px] font-semibold uppercase tracking-wide text-teal-700">
          Step 2 of 3
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
          {channel === "both" ? "Enter both codes" : "Enter verification code"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {channel === "both" ? (
            <>
              We sent one code to <span className="font-semibold text-navy-900">{email}</span> and a different code by text to{" "}
              <span className="font-semibold text-navy-900">{phone}</span>. Enter both.
            </>
          ) : channel === "sms" ? (
            <>
              We sent a 6-digit code by text to <span className="font-semibold text-navy-900">{phone}</span>.
              Enter it below.
            </>
          ) : (
            <>
              We sent a 6-digit code to <span className="font-semibold text-navy-900">{email}</span>.
              Copy it from your email and enter it below.
            </>
          )}
        </p>

        <CodeBoxes
          label={channel === "both" ? "Email code" : "Verification code"}
          digits={digits}
          refs={inputsRef}
          onDigit={setDigitAt}
          onKey={(index, event) => onKeyDown(index, event, digits, inputsRef)}
        />
        {channel === "both" && (
          <CodeBoxes
            label="Text message code"
            digits={smsDigits}
            refs={smsInputsRef}
            onDigit={setSmsDigitAt}
            onKey={(index, event) => onKeyDown(index, event, smsDigits, smsInputsRef)}
          />
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={verify}
          disabled={pendingVerify || code.length !== CODE_LEN || (channel === "both" && smsCode.length !== CODE_LEN)}
          className="mt-6 h-11 w-full bg-navy-700 text-white hover:bg-navy-800"
          size="lg"
        >
          {pendingVerify ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : channel === "both" ? "Verify and continue" : channel === "sms" ? "Verify phone" : "Verify email"}
        </Button>

        {channel !== "sms" && (
          <p className="mt-5 text-center text-[13px] leading-relaxed text-slate-600">
            If the code hasn&apos;t arrived, check your junk or spam folder. A security filter on your inbox can place it there to protect you.
          </p>
        )}
        <p className="mt-3 text-center text-[13px] text-slate-600">
          Still waiting?{" "}
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
                : channel === "both"
                  ? "Resend codes"
                  : "Resend code"}
          </button>
        </p>
        <p className="mt-3 text-center text-[13px]">
          <Link to="/register" className="font-medium text-slate-500 underline-offset-2 hover:underline">
            {channel === "sms" ? "Use a different phone number" : channel === "both" ? "Use different details" : "Use a different email"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function CodeBoxes({
  label,
  digits,
  refs,
  onDigit,
  onKey,
}: {
  label: string;
  digits: string[];
  refs: React.RefObject<(HTMLInputElement | null)[]>;
  onDigit: (index: number, value: string) => void;
  onKey: (index: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-[13px] font-semibold text-navy-900">{label}</p>
      <div className="mt-2 flex justify-between gap-2" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={index === 0 ? CODE_LEN : 1}
            value={digit}
            onChange={(event) => onDigit(index, event.target.value)}
            onKeyDown={(event) => onKey(index, event)}
            className={`${authInputCls} h-14 w-12 px-0 text-center text-xl font-semibold tracking-widest sm:w-14`}
            aria-label={`${label} digit ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

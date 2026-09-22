/**
 * Registration, two steps.
 * Step 1: name · work email · password · company · country · phone (optional),
 *         pre-filled from the B4 lead capture.
 * Step 2: 6-digit email OTP (10-min expiry, 60s resend cooldown).
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { trpc } from "@/providers/trpc";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";
const errCls = "mt-1 text-[12px] text-red-700";

const BREACHED = new Set([
  "password1234", "password12345", "qwerty123456", "letmein123456", "iloveyou1234",
  "123456789012", "abcdefghijkl", "fertilizer123", "aquifert1234", "welcome12345",
]);

function strength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "bg-slate-200" };
  if (BREACHED.has(pw.toLowerCase())) return { score: 0, label: "This password appears in known breaches, choose another.", color: "bg-red-500" };
  if (pw.length < 12) return { score: 1, label: `At least 12 characters, ${12 - pw.length} more to go.`, color: "bg-amber-500" };
  if (pw.length < 16) return { score: 2, label: "Good. Longer is stronger, a short phrase works well.", color: "bg-teal-500" };
  return { score: 3, label: "Strong password.", color: "bg-emerald-600" };
}

type Prefill = { fullName?: string; email?: string; company?: string; country?: string; phone?: string };

export default function Register() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", country: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const codeRef = useRef<HTMLInputElement>(null);

  /* B4 prefill, never re-type what we already captured */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aq.lead.prefill");
      if (raw) {
        const p = JSON.parse(raw) as Prefill;
        setForm((f) => ({
          ...f,
          name: p.fullName ?? f.name,
          email: p.email ?? f.email,
          company: p.company ?? f.company,
          country: p.country ?? f.country,
          phone: p.phone ?? f.phone,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  /* resend cooldown ticker */
  useEffect(() => {
    if (step !== 2 || cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, cooldown]);

  useEffect(() => {
    if (step === 2) codeRef.current?.focus();
  }, [step]);

  const register = trpc.identity.register.useMutation({
    onSuccess: (r) => {
      setDevCode(r.devCode);
      setStep(2);
      setCooldown(60);
    },
    onError: (e) => setErrors({ form: e.message }),
  });

  const verify = trpc.identity.verifyOtp.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate("/onboarding");
    },
    onError: (e) => setOtpError(e.message),
  });

  const resend = trpc.identity.resendOtp.useMutation({
    onSuccess: () => setCooldown(60),
  });

  const s = strength(form.password);

  const submitStep1 = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = "Enter a valid work email.";
    if (form.password.length < 12) e.password = "Use at least 12 characters.";
    else if (BREACHED.has(form.password.toLowerCase())) e.password = "This password appears in known breaches, choose another.";
    if (!form.company.trim()) e.company = "Enter your company.";
    if (!form.country.trim()) e.country = "Enter your country.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    register.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      company: form.company.trim(),
      country: form.country.trim(),
      phone: form.phone || undefined,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Aquifert home" className="inline-block">
          <Logo size={36} />
        </Link>

        {step === 1 ? (
          <>
            <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Free Core tier to start, pick a plan later, once you've used the platform.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="rg-name" className="text-[13px] font-semibold text-navy-900">Full name *</label>
                <input id="rg-name" autoComplete="name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputCls} mt-1`} />
                {errors.name && <p className={errCls}>{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="rg-email" className="text-[13px] font-semibold text-navy-900">Work email *</label>
                <input id="rg-email" type="email" autoComplete="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} mt-1`} />
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="rg-password" className="text-[13px] font-semibold text-navy-900">Password *</label>
                <input id="rg-password" type="password" autoComplete="new-password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputCls} mt-1`}
                  aria-describedby="rg-pw-hint" />
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={`h-1 flex-1 rounded-full ${s.score >= n ? s.color : "bg-slate-200"}`} />
                  ))}
                </div>
                <p id="rg-pw-hint" className={`mt-1 text-[12px] ${s.score === 0 && form.password ? "text-red-700" : "text-slate-500"}`}>
                  {s.label || "Minimum 12 characters. No symbol rules, length is what matters."}
                </p>
                {errors.password && <p className={errCls}>{errors.password}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="rg-company" className="text-[13px] font-semibold text-navy-900">Company *</label>
                  <input id="rg-company" autoComplete="organization" value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })} className={`${inputCls} mt-1`} />
                  {errors.company && <p className={errCls}>{errors.company}</p>}
                </div>
                <div>
                  <label htmlFor="rg-country" className="text-[13px] font-semibold text-navy-900">Country *</label>
                  <input id="rg-country" autoComplete="country-name" value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })} className={`${inputCls} mt-1`} />
                  {errors.country && <p className={errCls}>{errors.country}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="rg-phone" className="text-[13px] font-semibold text-navy-900">Phone</label>
                <input id="rg-phone" type="tel" autoComplete="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputCls} mt-1`} />
                <p className="mt-1 text-[12px] text-slate-500">Optional. The trading desk uses this only to reach you on a live enquiry.</p>
              </div>
              {errors.form && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">{errors.form}</p>
              )}
              <Button onClick={submitStep1} disabled={register.isPending}
                className="h-11 w-full bg-navy-700 text-white hover:bg-navy-800" size="lg">
                {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Create account"}
              </Button>
              <p className="text-center text-[13px] text-slate-600">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-navy-700 underline-offset-2 hover:underline">Sign in</Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Check your inbox</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              We sent a 6-digit code to <span className="font-semibold text-navy-900">{form.email}</span>.
              It expires in <strong>10 minutes</strong>.
            </p>
            <div className="mt-6">
              <label htmlFor="rg-code" className="text-[13px] font-semibold text-navy-900">Verification code</label>
              <input
                id="rg-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputCls} mt-1 text-center font-mono text-xl tracking-[0.5em]`}
                placeholder="••••••"
              />
              {otpError && <p className={errCls} role="alert">{otpError}</p>}
            </div>
            {devCode && (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                Dev mode (no SMTP configured): your code is <span className="font-mono font-bold">{devCode}</span>
              </p>
            )}
            <Button
              onClick={() => { setOtpError(null); verify.mutate({ email: form.email.trim(), code }); }}
              disabled={verify.isPending || code.length !== 6}
              className="mt-5 h-11 w-full bg-navy-700 text-white hover:bg-navy-800" size="lg"
            >
              {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Verify and continue"}
            </Button>
            <div className="mt-4 flex items-center justify-between text-[13px]">
              <button
                type="button"
                disabled={cooldown > 0 || resend.isPending}
                onClick={() => resend.mutate({ email: form.email.trim() })}
                className="font-semibold text-navy-700 underline-offset-2 hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <a href="mailto:enquiry@aquifert.com" className="text-slate-500 underline-offset-2 hover:underline">
                Code not arriving? Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

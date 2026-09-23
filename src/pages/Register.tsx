/**
 * Step 1 — Collect profile + email, send a 6-digit OTP (no password yet).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { authInputCls, saveSignupPending } from "@/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";

const errCls = "mt-1 text-[12px] text-red-700";

type Prefill = { fullName?: string; email?: string; company?: string; country?: string; phone?: string };

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    country: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

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
    } catch {
      /* ignore */
    }
  }, []);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = "Enter a valid work email.";
    if (!form.company.trim()) e.company = "Enter your company.";
    if (!form.country.trim()) e.country = "Enter your country.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!isSupabaseBrowserConfigured()) {
      setErrors({
        form: "Sign-up is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      });
      return;
    }

    setPending(true);
    setErrors({});
    try {
      const email = form.email.trim().toLowerCase();
      const profile = {
        email,
        name: form.name.trim(),
        company: form.company.trim(),
        country: form.country.trim(),
        phone: form.phone.trim() || undefined,
      };

      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            name: profile.name,
            company: profile.company,
            country: profile.country,
            phone: profile.phone,
          },
        },
      });
      if (error) throw error;

      saveSignupPending(profile);
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start sign-up.";
      setErrors({ form: message });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Aquifert home" className="inline-block">
          <Logo size={36} />
        </Link>

        <p className="mt-8 text-[12px] font-semibold uppercase tracking-wide text-teal-700">
          Step 1 of 3
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          We&apos;ll email a verification code. You&apos;ll set a password after that.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="rg-name" className="text-[13px] font-semibold text-navy-900">
              Full name *
            </label>
            <input
              id="rg-name"
              autoComplete="name"
              value={form.name}
              onChange={(ev) => setForm({ ...form, name: ev.target.value })}
              className={`${authInputCls} mt-1`}
            />
            {errors.name && <p className={errCls}>{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="rg-email" className="text-[13px] font-semibold text-navy-900">
              Work email *
            </label>
            <input
              id="rg-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(ev) => setForm({ ...form, email: ev.target.value })}
              className={`${authInputCls} mt-1`}
            />
            {errors.email && <p className={errCls}>{errors.email}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rg-company" className="text-[13px] font-semibold text-navy-900">
                Company *
              </label>
              <input
                id="rg-company"
                autoComplete="organization"
                value={form.company}
                onChange={(ev) => setForm({ ...form, company: ev.target.value })}
                className={`${authInputCls} mt-1`}
              />
              {errors.company && <p className={errCls}>{errors.company}</p>}
            </div>
            <div>
              <label htmlFor="rg-country" className="text-[13px] font-semibold text-navy-900">
                Country *
              </label>
              <input
                id="rg-country"
                autoComplete="country-name"
                value={form.country}
                onChange={(ev) => setForm({ ...form, country: ev.target.value })}
                className={`${authInputCls} mt-1`}
              />
              {errors.country && <p className={errCls}>{errors.country}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="rg-phone" className="text-[13px] font-semibold text-navy-900">
              Phone
            </label>
            <input
              id="rg-phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(ev) => setForm({ ...form, phone: ev.target.value })}
              className={`${authInputCls} mt-1`}
            />
            <p className="mt-1 text-[12px] text-slate-500">
              Optional. The trading desk uses this only to reach you on a live enquiry.
            </p>
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
            disabled={pending}
            className="h-11 w-full bg-navy-700 text-white hover:bg-navy-800"
            size="lg"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Send verification code"}
          </Button>
          <p className="text-center text-[13px] text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Step 1 — Collect profile + email, send a 6-digit OTP (no password yet).
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@/marketing/router";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/marketing/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/marketing/components/ui/dialog";
import { Logo } from "@/marketing/components/shared/Logo";
import { authInputCls, saveSignupPending } from "@/marketing/lib/auth-signup";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/marketing/lib/supabase";
import { checkSignupAddress } from "@/app/(auth)/signup-check";
import { checkSignupEmail, DEFAULT_SIGNUP_RULES, EMAIL_PATTERN, emailDomain, signupCheck, type SignupCheck } from "@/lib/desk-settings/email-rules";

const errCls = "mt-1 text-[12px] text-red-700";

type Prefill = { fullName?: string; email?: string; company?: string; country?: string; phone?: string };

/** The launch rules, checked in the browser: instant, but without the admin's named exceptions. */
const quickCheck = (email: string) => signupCheck(checkSignupEmail(email, DEFAULT_SIGNUP_RULES));

/** The admin's rules on the server; the launch rules if the server cannot be reached, so a personal address never slips through. */
async function checkAddress(email: string): Promise<SignupCheck> {
  return checkSignupAddress(email).catch(() => quickCheck(email));
}

/** How long the form waits for the server before answering from the launch rules. */
const SERVER_WAIT_MS = 900;

function WorkEmailDialog({ domain, onClose, onClosed }: { domain: string | null; onClose: () => void; onClosed: () => void }) {
  return (
    <Dialog open={domain !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-white sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
      >
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-2 text-xl font-bold tracking-tight text-navy-900">Work email required</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            Aquifert ONE is for businesses, so we only accept official company email addresses.{" "}
            {domain ? (
              <>
                <span className="font-semibold text-navy-900">@{domain}</span> is a personal or public email provider.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-[13px] text-slate-700">
          Use an address like <span className="font-semibold text-navy-900">name@yourcompany.com</span>
        </p>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="h-11 w-full bg-navy-700 text-white hover:bg-navy-800" size="lg">
            Use my work email
          </Button>
        </DialogFooter>
        <p className="text-center text-[12px] text-slate-500">
          No company email?{" "}
          <a href="mailto:enquiry@aquifert.com" className="font-medium text-navy-700 underline-offset-2 hover:underline">
            enquiry@aquifert.com
          </a>{" "}
          and the desk will help.
        </p>
      </DialogContent>
    </Dialog>
  );
}

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
  const [personalDomain, setPersonalDomain] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const currentEmail = useRef("");
  const lastChecked = useRef("");

  useEffect(() => {
    currentEmail.current = form.email;
  }, [form.email]);

  const clearEmailError = () =>
    setErrors((current) => {
      const next = { ...current };
      delete next.email;
      return next;
    });

  /**
   * Checks the address and raises the pop-up for personal providers. A slow server is answered from the launch
   * rules first and corrected when it replies; the pop-up opens at most once per check. Answers for an address
   * the member has since changed are ignored. Resolves with the server's verdict.
   */
  const vetEmail = async (raw: string): Promise<boolean> => {
    const email = raw.trim().toLowerCase();
    lastChecked.current = email;
    let popped = false;
    const apply = (result: SignupCheck) => {
      if (currentEmail.current.trim().toLowerCase() !== email) return false;
      if (result.ok) {
        clearEmailError();
        setPersonalDomain(null);
        return true;
      }
      setErrors((current) => ({ ...current, email: result.message }));
      if (result.workEmail && !popped) {
        popped = true;
        setPersonalDomain(emailDomain(email));
      }
      return false;
    };
    const server = checkAddress(email);
    const early = await Promise.race([server, new Promise<null>((resolve) => setTimeout(() => resolve(null), SERVER_WAIT_MS))]);
    if (early) return apply(early);
    apply(quickCheck(email));
    return apply(await server);
  };

  const onEmailBlur = () => {
    const email = form.email.trim().toLowerCase();
    if (EMAIL_PATTERN.test(email) && email !== lastChecked.current) void vetEmail(email);
  };

  const focusEmail = () => {
    emailRef.current?.focus();
    emailRef.current?.select();
  };

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
    if (!EMAIL_PATTERN.test(form.email.trim().toLowerCase())) e.email = "Enter a valid work email.";
    if (!form.company.trim()) e.company = "Enter your company.";
    if (!form.country.trim()) e.country = "Enter your country.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setPending(true);
    const allowed = await vetEmail(form.email);
    setPending(false);
    if (!allowed) return;

    if (!isSupabaseBrowserConfigured()) {
      setErrors({
        form: "Sign-up is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
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
              ref={emailRef}
              id="rg-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(ev) => {
                currentEmail.current = ev.target.value;
                setForm({ ...form, email: ev.target.value });
                if (errors.email) clearEmailError();
              }}
              onBlur={onEmailBlur}
              aria-invalid={Boolean(errors.email)}
              aria-describedby="rg-email-note"
              placeholder="name@yourcompany.com"
              className={`${authInputCls} mt-1`}
            />
            {errors.email ? (
              <p id="rg-email-note" className={errCls}>
                {errors.email}
              </p>
            ) : (
              <p id="rg-email-note" className="mt-1 text-[12px] text-slate-500">
                Use your company address. Personal email such as Gmail, Yahoo or Hotmail is not accepted.
              </p>
            )}
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
          <p className="text-center text-[11.5px] leading-relaxed text-slate-500">
            By creating an account you agree to our{" "}
            <Link to="/legal/terms" className="font-medium text-navy-700 underline-offset-2 hover:underline">Terms &amp; Conditions</Link>,{" "}
            <Link to="/legal/terms-of-use" className="font-medium text-navy-700 underline-offset-2 hover:underline">Terms of Use</Link> and{" "}
            <Link to="/legal/privacy" className="font-medium text-navy-700 underline-offset-2 hover:underline">Privacy Policy</Link>.
          </p>
          <p className="text-center text-[13px] text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <WorkEmailDialog domain={personalDomain} onClose={() => setPersonalDomain(null)} onClosed={focusEmail} />
    </div>
  );
}

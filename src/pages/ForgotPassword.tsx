import { useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sendReset = async () => {
    setError(null);
    if (!isSupabaseBrowserConfigured()) {
      setError("Password reset is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your work email.");
      return;
    }
    setPending(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <Link to="/" aria-label="Aquifert home" className="inline-block"><Logo size={36} /></Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Reset your password</h1>

        {sent ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
              Follow the email, then sign in with your new password.
            </p>
            <Link to="/login" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-navy-700 text-sm font-semibold text-white hover:bg-navy-800">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-slate-600">
              Enter your work email. If an account exists, Supabase will send a password reset link.
            </p>
            <label htmlFor="fp-email" className="mt-6 block text-[13px] font-semibold text-navy-900">Work email</label>
            <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
            {error && <p className="mt-2 text-[12px] text-red-700" role="alert">{error}</p>}
            <Button onClick={sendReset} disabled={pending || !email}
              className="mt-5 h-11 w-full bg-navy-700 text-white hover:bg-navy-800" size="lg">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Send reset link"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

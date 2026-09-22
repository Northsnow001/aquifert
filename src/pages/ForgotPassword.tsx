import { useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { trpc } from "@/providers/trpc";

const inputCls =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forgot = trpc.identity.forgotPassword.useMutation({ onSuccess: () => setSent(true) });
  const reset = trpc.identity.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <Link to="/" aria-label="Aquifert home" className="inline-block"><Logo size={36} /></Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-navy-900">Reset your password</h1>

        {done ? (
          <>
            <p className="mt-2 text-sm text-slate-600">Your password has been reset. You can sign in now.</p>
            <Link to="/login" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-navy-700 text-sm font-semibold text-white hover:bg-navy-800">
              Back to sign in
            </Link>
          </>
        ) : !sent ? (
          <>
            <p className="mt-1.5 text-sm text-slate-600">
              Enter your work email. If an account exists, we'll send a 6-digit reset code, valid for 10 minutes.
            </p>
            <label htmlFor="fp-email" className="mt-6 block text-[13px] font-semibold text-navy-900">Work email</label>
            <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
            <Button onClick={() => forgot.mutate({ email })} disabled={forgot.isPending || !email}
              className="mt-5 h-11 w-full bg-navy-700 text-white hover:bg-navy-800" size="lg">
              {forgot.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Send reset code"}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-slate-600">
              If an account exists for <span className="font-semibold">{email}</span>, a code is on its way.
            </p>
            <label htmlFor="fp-code" className="mt-6 block text-[13px] font-semibold text-navy-900">Reset code</label>
            <input id="fp-code" inputMode="numeric" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${inputCls} mt-1 text-center font-mono text-xl tracking-[0.5em]`} />
            <label htmlFor="fp-new" className="mt-4 block text-[13px] font-semibold text-navy-900">New password</label>
            <input id="fp-new" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} />
            <p className="mt-1 text-[12px] text-slate-500">Minimum 12 characters.</p>
            {error && <p className="mt-2 text-[12px] text-red-700" role="alert">{error}</p>}
            <Button onClick={() => { setError(null); reset.mutate({ email, code, password }); }}
              disabled={reset.isPending || code.length !== 6 || password.length < 12}
              className="mt-5 h-11 w-full bg-navy-700 text-white hover:bg-navy-800" size="lg">
              {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Reset password"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

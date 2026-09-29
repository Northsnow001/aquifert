export default function PasswordPage() {
  return (
    <section className="max-w-lg rounded-xl border border-border bg-surface p-5">
      <h1 className="text-lg font-black">Password</h1>
      <p className="mt-2 text-sm text-mid">
        Use the reset link from sign-in when Supabase Auth is connected. Local demo sessions do not store a password.
      </p>
      <a href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-blue">
        Send a reset link
      </a>
    </section>
  );
}

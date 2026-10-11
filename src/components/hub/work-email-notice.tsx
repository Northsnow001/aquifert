import { Building2, LogOut } from "lucide-react";

export function WorkEmailNotice({ email }: { email: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8e1] text-[#8a6508]">
          <Building2 className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-ink">Work email required</h1>
        <p className="mt-2 text-sm leading-relaxed text-mid">
          Aquifert ONE is for businesses, so new accounts need an official company email address.{" "}
          <span className="font-semibold text-ink">{email}</span> is a personal or public address. Sign out and create your account with your work email.
        </p>
        <p className="mt-3 text-[13px] text-dim">
          No company email? Write to{" "}
          <a href="mailto:enquiry@aquifert.com" className="font-semibold text-blue">
            enquiry@aquifert.com
          </a>{" "}
          and the desk will help.
        </p>
        <form action="/api/logout" method="post" className="mt-6">
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:bg-s2">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

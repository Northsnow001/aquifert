import { LogOut, ShieldAlert } from "lucide-react";

export function SuspendedNotice({ email }: { email: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fdecec] text-[#b42318]">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-ink">Your access is suspended</h1>
        <p className="mt-2 text-sm leading-relaxed text-mid">
          The account <span className="font-semibold text-ink">{email}</span> can no longer open Aquifert ONE. If you think this is a mistake, write to{" "}
          <a href="mailto:noreply@aquifert.com" className="font-semibold text-blue">
            noreply@aquifert.com
          </a>
          .
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

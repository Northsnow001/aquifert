import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, Lock, Newspaper, Radio } from "lucide-react";
import { formatStamp } from "@/lib/content-types";
import type { SharedPost } from "@/lib/share";
import { signInFor, signUpFor } from "@/lib/share-links";

const PERKS = [
  { icon: Radio, text: "TELEX flashes the moment they reach the desk" },
  { icon: Newspaper, text: "AQ View analysis on what moves the market" },
  { icon: Bot, text: "Aquibot, the fertilizer market AI" },
];

export function ShareTeaser({ post }: { post: SharedPost }) {
  const signUp = signUpFor(post.kind, post.key);
  const signIn = signInFor(post.kind, post.key);
  const what = post.kind === "telex" ? "TELEX flash" : "AQ View note";

  return (
    <div className="min-h-dvh bg-[#eef2f6]">
      <header className="bg-[#0C1C2E]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Aquifert home" className="shrink-0">
            <Image src="/brand/logo-v2-light.png" alt="Aquifert" width={814} height={214} className="h-8 w-auto" priority />
          </Link>
          <a href={signIn} className="rounded-full px-4 py-2 text-[14px] font-semibold text-white no-underline transition hover:bg-white/10">
            Log in
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <article className="overflow-hidden rounded-[22px] border border-black/[.06] bg-white shadow-[0_24px_64px_-32px_rgb(12_28_46/0.45)]">
          <a href={signUp} className="relative block aspect-[16/9] bg-[#0C1C2E] sm:aspect-[21/9]" aria-label={`Sign up to read: ${post.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- desk uploads and links to any host */}
            <img src={post.picture} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#0C1C2E]/80 px-3 py-1 text-[12px] font-bold tracking-[0.12em] text-white backdrop-blur">
              <Lock className="h-3 w-3" aria-hidden /> MEMBERS ONLY
            </span>
          </a>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#0C1C2E] px-2.5 py-0.5 text-[11px] font-bold tracking-[0.12em] text-white">{post.label}</span>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mid">{post.product}</span>
            </div>
            <h1 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[32px]">
              <a href={signUp} className="text-inherit no-underline hover:text-blue">
                {post.title}
              </a>
            </h1>
            <p className="mt-2 text-[13.5px] text-dim">
              {post.author} · {formatStamp(post.publishedAt)} desk time
            </p>

            <div className="relative mt-6" aria-hidden>
              <div className="space-y-3 blur-[3px] select-none">
                {[100, 94, 98, 72, 96, 88].map((width, index) => (
                  <div key={index} className="h-3.5 rounded-full bg-slate-200" style={{ width: `${width}%` }} />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/60 to-white" />
            </div>

            <div className="relative -mt-6 rounded-2xl border border-[#2e6da4]/20 bg-gradient-to-br from-[#eaf2fb] to-white p-5 text-center sm:p-7">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#0C1C2E] text-white">
                <Lock className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-[19px] font-bold text-ink sm:text-[21px]">Sign up free to read this {what}</h2>
              <p className="mx-auto mt-1.5 max-w-md text-[14.5px] leading-relaxed text-mid">
                Create your Aquifert ONE account in about a minute. Once you are in, you go straight to this article.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <a
                  href={signUp}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0C1C2E] px-6 text-[15px] font-semibold text-white no-underline transition hover:bg-[#163049] sm:w-auto"
                >
                  Sign up free to read <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <a
                  href={signIn}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-white px-6 text-[15px] font-semibold text-ink no-underline transition hover:bg-s2 sm:w-auto"
                >
                  I have an account
                </a>
              </div>
              <ul className="mx-auto mt-6 grid max-w-xl gap-2 text-left sm:grid-cols-3">
                {PERKS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-[13px] leading-snug text-mid">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2e6da4]" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
        <p className="mt-6 text-center text-[12px] text-dim">
          © {new Date().getFullYear()} Aquifert Ltd · Desk views for information only, not an offer or advice.
        </p>
      </main>
    </div>
  );
}

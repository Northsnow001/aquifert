import type { ReactNode } from "react";

/** Compact cinematic video hero for hub pages: the marketing VideoHero look (video, deep-navy scrim, white headline), sized and rounded for the content column. */
export function SalesHero({
  src,
  poster,
  videoLabel,
  eyebrow,
  badge,
  title,
  sub,
  children,
  compact = false,
}: {
  src: string;
  poster: string;
  videoLabel: string;
  eyebrow: string;
  badge?: string;
  title: ReactNode;
  sub: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="aqf-video-hero relative isolate overflow-hidden rounded-[22px] bg-navy-900 shadow-[0_24px_60px_-30px_rgb(11_30_45/0.7)]">
      <video className="absolute inset-0 -z-10 h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" poster={poster} aria-label={videoLabel} role="img">
        <source src={src} type="video/mp4" />
      </video>
      <div className="aqf-video-scrim absolute inset-0 -z-10" aria-hidden />
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-teal-500/25 blur-3xl" aria-hidden />
      <div className={`relative flex flex-col items-center justify-center px-6 py-12 text-center text-white sm:px-12 ${compact ? "min-h-[300px] sm:min-h-[360px]" : "min-h-[340px] sm:min-h-[420px]"}`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-teal-200 backdrop-blur-sm">
          {eyebrow}
          {badge ? <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-[#0b1e2d]">{badge}</span> : null}
        </span>
        <h1 className="mt-5 max-w-2xl text-balance text-[32px] font-extrabold leading-[1.06] tracking-[-0.02em] sm:text-[46px]">{title}</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/80 sm:text-[17.5px]">{sub}</p>
        {children ? <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

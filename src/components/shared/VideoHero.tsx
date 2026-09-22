import type { ReactNode } from "react";

/**
 * Full-bleed cinematic video hero. The video is decorative: it sits behind a
 * deep-navy scrim so the white headline copy keeps AAA contrast in both themes.
 */
export function VideoHero({
  src,
  poster,
  children,
  center = false,
  videoLabel,
}: {
  src: string;
  poster: string;
  children: ReactNode;
  center?: boolean;
  videoLabel?: string;
}) {
  return (
    <section className="aqf-video-hero relative isolate overflow-hidden bg-navy-900">
      <video
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={videoLabel}
        role="img"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="aqf-video-scrim absolute inset-0 -z-10" aria-hidden />
      <div
        className={`relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-4 py-24 sm:py-28 ${
          center ? "items-center text-center" : "items-start text-left"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/** Video presented as a framed, elevated card, mirrors FramedImage. */
export function FramedVideo({
  src,
  poster,
  label,
  caption,
  ratio = "aspect-[16/10]",
}: {
  src: string;
  poster: string;
  label: string;
  caption?: string;
  ratio?: string;
}) {
  return (
    <figure className="group/frame overflow-hidden rounded-3xl border border-border bg-card shadow-[0_2px_4px_rgb(14_32_49/0.08),0_28px_60px_-20px_rgb(37_79_118/0.35),inset_0_1px_0_rgb(255_255_255/0.6)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_4px_8px_rgb(14_32_49/0.1),0_40px_80px_-24px_rgb(37_79_118/0.45),inset_0_1px_0_rgb(255_255_255/0.7)] dark:shadow-[0_2px_4px_rgb(0_0_0/0.5),0_28px_60px_-20px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.06)]">
      <div className={`${ratio} w-full overflow-hidden bg-navy-900`}>
        <video
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/frame:scale-[1.03]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={label}
          role="img"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
      {caption && (
        <figcaption className="border-t border-border px-5 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

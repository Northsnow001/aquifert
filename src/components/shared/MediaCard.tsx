/**
 * MediaCard, video-led card in the Patreon collage grammar: poster at rest,
 * ambient video plays on hover/focus (and autoplays muted on capable devices
 * when in view), tagline + CTA overlaid on a navy scrim. Under
 * prefers-reduced-motion the video never plays; the poster carries the story.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";

export function MediaCard({
  video,
  poster,
  label,
  tagline,
  cta,
  to,
  ratio = "aspect-[4/5]",
}: {
  video: string;
  poster: string;
  /** Accessible description of the moving image */
  label: string;
  /** Short bold statement overlaid on the card */
  tagline: string;
  cta: string;
  to: string;
  ratio?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  // Gentle ambient autoplay on desktops that allow motion; pause when out of view.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const play = () => {
    setActive(true);
    void videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    setActive(false);
    videoRef.current?.pause();
  };

  return (
    <Link
      to={to}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      className={`group relative block overflow-hidden rounded-3xl bg-navy-900 ${ratio} focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2`}
      aria-label={`${tagline}, ${cta}`}
    >
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        role="img"
        aria-label={label}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={video} type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/20 to-transparent transition-opacity duration-500 group-hover:from-navy-900/70"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-lg font-bold leading-snug text-white sm:text-xl">{tagline}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm transition-colors group-hover:bg-teal-500">
          {cta}
          <ArrowUpRight
            className={`h-3.5 w-3.5 transition-transform duration-300 ${active ? "-translate-y-0.5 translate-x-0.5" : ""}`}
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

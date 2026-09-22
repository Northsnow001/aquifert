/** Photograph presented as a framed, elevated card, never as a text background. */
export function FramedImage({
  src,
  alt,
  caption,
  ratio = "aspect-[16/10]",
}: {
  src: string;
  alt: string;
  caption?: string;
  ratio?: string;
}) {
  return (
    <figure className="group/frame overflow-hidden rounded-3xl border border-border bg-card shadow-[0_2px_4px_rgb(14_32_49/0.08),0_28px_60px_-20px_rgb(37_79_118/0.35),inset_0_1px_0_rgb(255_255_255/0.6)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_4px_8px_rgb(14_32_49/0.1),0_40px_80px_-24px_rgb(37_79_118/0.45),inset_0_1px_0_rgb(255_255_255/0.7)] dark:shadow-[0_2px_4px_rgb(0_0_0/0.5),0_28px_60px_-20px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.06)]">
      <div className={`${ratio} w-full overflow-hidden`}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/frame:scale-[1.03]"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption className="border-t border-border px-5 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

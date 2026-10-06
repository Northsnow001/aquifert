"use client";

const LOGO_ASPECT = 814 / 214;
const MARK_ASPECT = 148 / 214;

/**
 * Official Aquifert logo.
 * `light` renders the white-text variant directly on dark surfaces (navy
 * masthead, dark footers), no background chip, so the mark blends with the
 * surface. `mark` renders only the droplet brandmark.
 */
export function Logo({
  size = 34,
  light = false,
  mark = false,
}: {
  size?: number;
  light?: boolean;
  mark?: boolean;
}) {
  const h = mark ? size : Math.round(size * 0.82);
  const aspect = mark ? MARK_ASPECT : LOGO_ASPECT;
  const src = mark ? "/brand/mark-v2.png" : light ? "/brand/logo-v2-light.png" : "/brand/logo-v2.png";
  return (
    <img
      src={src}
      alt="Aquifert"
      height={h}
      width={Math.round(h * aspect)}
      className="object-contain select-none"
      draggable={false}
    />
  );
}

/** Droplet-only brandmark (collapsed sidebar, loading screens, favicons contexts) */
export function LogoMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return <Logo size={size} light={light} mark />;
}

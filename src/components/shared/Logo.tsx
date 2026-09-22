const LOGO_ASPECT = 814 / 214;
const MARK_ASPECT = 148 / 214;

/**
 * Official Aquifert logo.
 * `light` renders the logo on a white chip so it stays crisp on dark surfaces
 * (sidebar, navy panels). `mark` renders only the droplet brandmark.
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
  const img = (
    <img
      src={mark ? "/brand/mark-v2.png" : "/brand/logo-v2.png"}
      alt="Aquifert"
      height={h}
      width={Math.round(h * aspect)}
      className="object-contain select-none"
      draggable={false}
    />
  );
  if (light) {
    return (
      <span
        className="inline-flex w-fit items-center self-start rounded-lg bg-white shadow-[inset_0_1px_2px_rgb(14_32_49/0.14),0_3px_10px_-3px_rgb(0_0_0/0.45)]"
        style={{ padding: `${Math.max(4, Math.round(size * 0.18))}px ${Math.max(8, Math.round(size * 0.3))}px` }}
      >
        {img}
      </span>
    );
  }
  return img;
}

/** Droplet-only brandmark (collapsed sidebar, loading screens, favicons contexts) */
export function LogoMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return <Logo size={size} light={light} mark />;
}

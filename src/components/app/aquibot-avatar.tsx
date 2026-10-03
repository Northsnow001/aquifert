import Image from "next/image";

export function AquibotAvatar({ size = 32, active = false, className = "" }: { size?: number; active?: boolean; className?: string }) {
  return (
    <span
      className={`aq-avatar ${active ? "aq-avatar-active" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="aq-avatar-ring" />
      <span className="aq-avatar-glass">
        <span className="aq-avatar-caustic" />
        <Image src="/brand/aquibot-mark.png" alt="" width={147} height={209} className="aq-avatar-drop" draggable={false} />
        <span className="aq-avatar-glint" />
      </span>
    </span>
  );
}

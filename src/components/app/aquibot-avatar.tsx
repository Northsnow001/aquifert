import Image from "next/image";

export function AquibotAvatar({ size = 32, active = false, className = "" }: { size?: number; active?: boolean; className?: string }) {
  return (
    <span className={`aq-avatar ${active ? "aq-avatar-active" : ""} ${className}`} style={{ width: size, height: size }} aria-hidden>
      <Image src="/brand/aquibot-avatar.png" alt="" width={size * 2} height={size * 2} draggable={false} />
    </span>
  );
}

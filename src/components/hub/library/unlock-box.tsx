import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import type { TelexAccess } from "@/lib/content-types";
import { DESK_HREF, unlockFor } from "./model";

export function UnlockBox({ access }: { access: TelexAccess }) {
  const unlock = unlockFor(access);
  const Icon = access === "enterprise" ? Crown : Lock;
  return (
    <div className="rounded-2xl border border-navy-100 bg-navy-50/60 px-5 py-7 text-center sm:px-8">
      <span className={`aq-chip ${access === "enterprise" ? "aq-chip-amber" : "aq-chip-blue"} mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] text-white`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-3 text-[17px] font-semibold text-ink">This file is for {unlock.label} members</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-mid">
        Upgrade to {unlock.label} to read and download it, along with every other {unlock.label} report in the library.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href={unlock.href} className={btnPrimary}>
          <Icon className="h-4 w-4" aria-hidden />
          Upgrade to {unlock.label}
        </Link>
        <Link href={DESK_HREF} className={btnSecondary}>
          Talk to the desk
        </Link>
      </div>
    </div>
  );
}

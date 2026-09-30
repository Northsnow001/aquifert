import { BR, CN, DE, ES, FR, GB, IN, IT, JP, KR, RU, SA, TR } from "country-flag-icons/react/3x2";
import type { Language } from "@/lib/i18n/locales";

const FLAGS = { BR, CN, DE, ES, FR, GB, IN, IT, JP, KR, RU, SA, TR };

export function Flag({ country, className = "h-3.5 w-[21px]" }: { country: Language["country"]; className?: string }) {
  const Svg = FLAGS[country];
  return <Svg aria-hidden className={`inline-block shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)] ${className}`} />;
}

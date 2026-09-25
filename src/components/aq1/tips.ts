import { AQ1_TOOLTIPS, type Aq1MenuKey } from "@contracts/aq1";
import { trpc } from "@/providers/trpc";

/**
 * Tooltip copy registry — verbatim copy from the brief, with the {reports} and
 * {calcs} placeholders interpolated from the live configured limits so that
 * changing a limit in admin settings updates the tooltip automatically.
 * A literal "{N}" must never render: interpolate() replaces every token.
 */
export function interpolateTip(key: Aq1MenuKey, limits: { nitrogenReportsPerMonth: number; ureaCalcsPerMonth: number }) {
  return AQ1_TOOLTIPS[key]
    .replaceAll("{reports}", String(limits.nitrogenReportsPerMonth))
    .replaceAll("{calcs}", String(limits.ureaCalcsPerMonth));
}

export function useAq1Tips(): Record<Aq1MenuKey, string> {
  const { data } = trpc.aq1.config.useQuery(undefined, { staleTime: 60_000, retry: 0 });
  const limits = data?.limits ?? { nitrogenReportsPerMonth: 2, ureaCalcsPerMonth: 5, savedReportsRetained: 10 };
  const out = {} as Record<Aq1MenuKey, string>;
  (Object.keys(AQ1_TOOLTIPS) as Aq1MenuKey[]).forEach((k) => { out[k] = interpolateTip(k, limits); });
  return out;
}

import { trpc } from "@/providers/trpc";

/** Effective profile (persona-aware) with org + membership */
export function useProfile() {
  const query = trpc.profile.me.useQuery(undefined, {
    staleTime: 30_000,
    retry: false,
  });
  return {
    ...query,
    user: query.data?.user ?? null,
    realUser: query.data?.realUser ?? null,
    organization: query.data?.organization ?? null,
    membership: query.data?.membership ?? null,
    isPersona: query.data?.isPersona ?? false,
    portalRole: query.data?.user?.portalRole ?? null,
    isMember: Boolean(query.data?.membership),
  };
}

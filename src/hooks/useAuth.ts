import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loggingOut = useRef(false);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        /* still clear client session */
      }
      if (isSupabaseBrowserConfigured()) {
        try {
          await getSupabaseBrowser().auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
      }
      queryClient.clear();
      navigate(redirectPath, { replace: true });
    } finally {
      loggingOut.current = false;
    }
  }, [logoutMutation, navigate, queryClient, redirectPath]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, error, logout, refetch],
  );
}

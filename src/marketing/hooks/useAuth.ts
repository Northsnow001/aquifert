"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/marketing/lib/supabase";

/** Marketing-side view of the Supabase session (used to swap "Sign in" for "Open hub"). */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseBrowserConfigured());

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) return;
    const supabase = getSupabaseBrowser();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, isAuthenticated: !!user, isLoading };
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import type { SiteContent } from "@/lib/site-content/schema";

const SiteGlobalContext = createContext<SiteContent["global"]>(DEFAULT_SITE_CONTENT.global);

export function SiteGlobalProvider({ value, children }: { value: SiteContent["global"]; children: ReactNode }) {
  return <SiteGlobalContext.Provider value={value}>{children}</SiteGlobalContext.Provider>;
}

/** Header and footer wording, edited under Public website › Header & footer. */
export const useSiteGlobal = () => useContext(SiteGlobalContext);

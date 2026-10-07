"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link, NavLink } from "@/marketing/router";

const isSitePath = (href: string) => href.startsWith("/") && !href.startsWith("//");

/** A link whose address comes from the content editor: site pages route in-app, web addresses open in a new tab. */
export function SiteLink({ href, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  if (isSitePath(href)) return <Link to={href} {...rest} />;
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" {...rest} />;
  return <a href={href} {...rest} />;
}

/** A menu link from the content editor; only site pages can be the current page. */
export function SiteNavLink({ href, className, children }: { href: string; className: (active: boolean) => string; children: ReactNode }) {
  if (isSitePath(href)) {
    return (
      <NavLink to={href} className={({ isActive }) => className(isActive)}>
        {children}
      </NavLink>
    );
  }
  return (
    <SiteLink href={href} className={className(false)}>
      {children}
    </SiteLink>
  );
}
